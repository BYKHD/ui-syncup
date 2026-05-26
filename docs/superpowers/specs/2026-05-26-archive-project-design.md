# Archive Project — Design Spec

**Date:** 2026-05-26
**Branch:** feature/archive-project
**Status:** Approved, ready for implementation
**Revised:** 2026-05-26 (v3 — fixes transaction scope, race honesty, Zod strictness, filter wiring, join-route mapping, migration path)

---

## Overview

A completed project (every issue resolved or archived) can be archived by its owner. Archived projects are hidden from the default projects list, surface a read-only banner in the UI, and can be unarchived at any time by the owner. Archive/unarchive are the **only** code paths that flip `projects.status` — generic project update no longer accepts `status`.

> [!note] Scope of "read-only" in this iteration
> "Read-only" in v1 means the **UI hides write actions** on archived projects and the **projects list defaults to active**. Server-side, the new archive/unarchive routes are guarded, generic project update no longer accepts `status`, and `joinProject` rejects archived projects. Other write endpoints for issues, attachments, annotations, comments, and member writes are **not** locked in this iteration — see [Out of Scope](#out-of-scope) for the explicit follow-up.

---

## Decisions

| Question | Decision |
|---|---|
| Archive gate | Hard — server blocks archive when not all issues are completed |
| Gate invariant | Count-based: `totalTickets > 0 && completedTickets === totalTickets` (do **not** use rounded `progressPercent`) |
| Zero-issue projects | Cannot be archived (gate requires `totalTickets > 0`). Surfaced via the same error message. |
| Who can archive | `PROJECT_OWNER` only |
| Who can unarchive | `PROJECT_OWNER` only |
| Archive entry point | `⋯` dropdown on the project detail page |
| Celebration | Confetti burst + celebratory toast on archive success |
| Idempotency | Archiving an already-archived project is a no-op (returns `200` with current state, no second activity log). Same for unarchive. |
| Race vs. issue reopen | **Best-effort.** Archive runs `SELECT ... FOR UPDATE` on the project row + count-recheck inside one tx. This serializes concurrent archive/unarchive on the same project and catches any issue write that happens *before* the SELECT. Because issue write APIs do **not** participate in this lock in v1 (out-of-scope), a small TOCTOU window remains: an issue created/reopened after the SELECT but before commit will not block the archive. The spec accepts this — closing the window requires either advisory locks on issue writers or `requireProjectActive` server guards (deferred). No `409` is promised. |
| Read-only scope | UI hides write actions + `joinProject` blocked + generic `PATCH /projects/[id]` cannot set `status`. Issue/attachment/comment APIs unchanged in this iteration. |
| Activity event naming | `project_archived`, `project_unarchived` — matches existing snake_case enum convention |

---

## Data Layer

> [!warning] Migration is required
> The original spec said "no migration needed." That is correct for `projects.status` (the `active | archived` enum already exists), but **the `project_activity_type` Postgres enum must be extended** to include `project_archived` and `project_unarchived`. Without the migration, logging will fail at runtime.

### Migration — new Drizzle migration

Migrations live under [drizzle/](drizzle/) per [drizzle.config.ts](drizzle.config.ts) (`out: "./drizzle"`). The next file will be `drizzle/0004_<generated-slug>.sql` plus a `drizzle/meta/_journal.json` update — both produced by `bun run db:generate` after the schema edit below.

Generation workflow:
1. Edit [src/server/db/schema/project-activities.ts](src/server/db/schema/project-activities.ts) — add `'project_archived'` and `'project_unarchived'` to `projectActivityTypeEnum`, and update the JSDoc enum list above it.
2. Run `bun run db:generate` (or whatever the repo's drizzle-kit script is named in `package.json`) to emit `drizzle/0004_<slug>.sql` and the journal entry.
3. Inspect the generated SQL — it should be two `ALTER TYPE "project_activity_type" ADD VALUE` statements. Drizzle-kit may emit them with a different syntax variant; that is fine as long as the resulting enum contains both new values.
4. Commit both the schema file and the generated migration + journal in the same commit.

> [!note] `ALTER TYPE ... ADD VALUE` cannot run inside a transaction in older PG versions
> If the drizzle-kit-generated migration wraps the statements in a transaction and your target PG version rejects it, split into one `ALTER TYPE` per migration or remove the transaction wrapper from the generated file. Verify against the target PG version before merging.

Also update the derived `ProjectActivityType` union and any `z.enum([...])` of activity types in the API DTOs.

---

## Server

### New service functions — `src/server/projects/project-service.ts`

> [!warning] All DB work must use the `tx` handle directly
> The existing `updateProject` ([line 313](src/server/projects/project-service.ts:313)) and `logProjectActivity` ([line 273](src/server/projects/activity-service.ts:273)) helpers issue queries against the **global `db`**, not a transaction handle — calling them inside a `db.transaction(async (tx) => ...)` callback would **not** route their queries through `tx`. The project-status flip and the activity insert must be written inline against `tx` for atomicity. Do **not** call `updateProject` / `logProjectActivity` from inside the tx callback.

**`archiveProject(projectId: string, actorId: string): Promise<Project>`**

```ts
return db.transaction(async (tx) => {
  // 1. Lock + load (FOR UPDATE serializes concurrent archive/unarchive on the same project)
  const [project] = await tx
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .for('update');

  if (!project) throw new Error("Project not found");

  // 2. Idempotent
  if (project.status === 'archived') return project as Project;

  // 3. Recompute counts inside the tx (best-effort gate; see Race row in Decisions)
  const [{ count: totalTickets }] = await tx
    .select({ count: count() })
    .from(issues)
    .where(and(eq(issues.projectId, projectId), isNull(issues.deletedAt)));

  const [{ count: completedTickets }] = await tx
    .select({ count: count() })
    .from(issues)
    .where(and(
      eq(issues.projectId, projectId),
      isNull(issues.deletedAt),
      inArray(issues.status, ['resolved', 'archived']),
    ));

  if (totalTickets === 0 || completedTickets !== totalTickets) {
    throw new Error("All issues must be resolved before archiving");
  }

  // 4. Flip status — inline against tx, not via updateProject()
  const [updated] = await tx
    .update(projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  // 5. Activity insert — inline against tx, not via logProjectActivity()
  await tx.insert(projectActivities).values({
    teamId: updated.teamId,
    projectId: updated.id,
    actorId,
    type: 'project_archived',
    metadata: sql`'{}'::jsonb`,
  });

  logger.info("project.archived", { projectId, actorId });
  return updated as Project;
});
```

**`unarchiveProject(projectId: string, actorId: string): Promise<Project>`** — same shape, no count gate:

```ts
return db.transaction(async (tx) => {
  const [project] = await tx
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .for('update');

  if (!project) throw new Error("Project not found");
  if (project.status === 'active') return project as Project;  // idempotent

  const [updated] = await tx
    .update(projects)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  await tx.insert(projectActivities).values({
    teamId: updated.teamId,
    projectId: updated.id,
    actorId,
    type: 'project_unarchived',
    metadata: sql`'{}'::jsonb`,
  });

  logger.info("project.unarchived", { projectId, actorId });
  return updated as Project;
});
```

> [!note] No new helpers in `activity-service.ts`
> Earlier drafts proposed `logProjectArchived` / `logProjectUnarchived` wrappers. Drop them — the activity insert lives inline in the tx (above), so the activity-service file does not need new exports for this feature.

### Bypass prevention — strip `status` from generic update

> [!warning] Currently `PATCH /api/projects/[id]` and `UpdateProjectBodySchema` both accept `status`, gated only by `PROJECT_UPDATE` (granted to owner and editor). That bypasses the archive gate entirely.

Required edits:
- [src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts) — remove `status` from `UpdateProjectSchema` **and chain `.strict()`** so unknown keys are rejected with `400 INVALID_INPUT` (Zod `z.object` strips unknown keys silently by default — without `.strict()` a `PATCH { status: 'archived' }` would return `200` no-op, defeating the bypass-prevention test); stop forwarding `status` to `updateProject`.
- [src/server/projects/schemas.ts](src/server/projects/schemas.ts) — remove `status` from `UpdateProjectBodySchema` and chain `.strict()` for the same reason.
- `archiveProject`/`unarchiveProject` no longer route through `updateProject`, so its `status` parameter is now dead. **Remove `status` from `UpdateProjectData` and from `updateProject`** to prevent future regressions. (No remaining callers pass `status` after the v3 changes — verify with a grep before merging.)

### Archived project blocks join

Two files must change together — service throws, route maps the error to `403`. Without the route change, the error falls through to the generic `500` handler.

**[src/server/projects/member-service.ts](src/server/projects/member-service.ts)** — `joinProject` currently only checks `visibility !== 'public'`. Add:

```ts
if (project.status === 'archived') {
  throw new Error("Cannot join an archived project");
}
```

**[src/app/api/projects/[id]/join/route.ts](src/app/api/projects/[id]/join/route.ts:142)** — extend the `error.message` switch (currently maps `"Project not found"`, `"Cannot join a private project without invitation"`, `"User is already a member of this project"`) to add:

```ts
if (error.message === "Cannot join an archived project") {
  return NextResponse.json(
    { error: { code: "PROJECT_ARCHIVED", message: "Cannot join an archived project" } },
    { status: 403 }
  );
}
```

### New API routes

| Method | Path | Guard | Service call |
|---|---|---|---|
| `POST` | `/api/projects/[id]/archive` | `requirePermission(PROJECT_ARCHIVE)` | `archiveProject(id, session.userId)` |
| `DELETE` | `/api/projects/[id]/archive` | `requirePermission(PROJECT_ARCHIVE)` | `unarchiveProject(id, session.userId)` |

Both routes mirror the structure of [src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts): parse session → check permission → call service → map known errors to status codes → return JSON.

### Permission

Add to `src/config/roles.ts`:

```ts
PROJECT_ARCHIVE = 'project:archive'
```

Grant only to `PROJECT_OWNER` (same tier as `PROJECT_DELETE`).

---

## Feature Layer

### API callers

- `src/features/projects/api/archive-project.ts` — `POST /api/projects/{id}/archive`
- `src/features/projects/api/unarchive-project.ts` — `DELETE /api/projects/{id}/archive`

### Hooks

- `src/features/projects/hooks/use-archive-project.ts`
  - `onSuccess`: fire `canvas-confetti` burst, then show celebratory toast: `"{projectName} is a wrap! All issues resolved."`
  - `onError`:
    - `400` "All issues must be resolved before archiving" → `toast.error(serverMessage)`
    - other → generic toast with server message
  - Invalidates project query cache on settle.
- `src/features/projects/hooks/use-unarchive-project.ts`
  - `onSuccess`: `toast.success("Project restored")`.
  - Invalidates project query cache on settle.

### New dependency

```
canvas-confetti  (+ @types/canvas-confetti for TypeScript)
```

Confetti call in `use-archive-project.ts` `onSuccess`:

```ts
import confetti from 'canvas-confetti'
confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } })
```

---

## UI

### Thread `status` through the project detail tree

Currently `project.status` is **not** propagated to `project-detail-screen-wrapper.tsx`, `project-detail-screen.tsx`, or `project-detail-header.tsx`. Each of those `project` props must be extended to include `status: 'active' | 'archived'`.

- [src/app/(protected)/(team)/(routes)/[projectSlug]/page.tsx](src/app/(protected)/(team)/(routes)/[projectSlug]/page.tsx) — already loads the full project; pass `status` into the wrapper.
- [src/features/projects/screens/project-detail-screen-wrapper.tsx](src/features/projects/screens/project-detail-screen-wrapper.tsx) — extend `Project` type with `status`.
- [src/features/projects/screens/project-detail-screen.tsx](src/features/projects/screens/project-detail-screen.tsx) — render banner (below) and hide write actions when `status === 'archived'`.
- [src/features/projects/components/project-detail-header.tsx](src/features/projects/components/project-detail-header.tsx) — extend `Project` type with `status`; pass derived `canArchiveProject` / `canUnarchiveProject` into `ProjectActions`.

### `project-actions.tsx` — dropdown changes

Add two derived props:
- `canArchiveProject: boolean` — `userRole === 'owner' && project.status === 'active'`
- `canUnarchiveProject: boolean` — `userRole === 'owner' && project.status === 'archived'`

**Active project dropdown** (between Settings separator and Leave):
```
Members
Settings
Archive Project        ← new, between settings and separator
──────────
Leave Project
Delete Project
```

**Archived project dropdown** (Settings and Leave hidden; no write actions):
```
Members
──────────
Unarchive Project      ← new, replaces Archive slot
Delete Project
```

The `Add Issue` button is hidden when `project.status === 'archived'`.

### Archived project detail page — read-only banner

Rendered in `project-detail-screen.tsx` when `project.status === 'archived'`:

```
┌─────────────────────────────────────────────────────────┐
│ 📦  This project is archived                            │
│     The project view is read-only. Only the project     │
│     owner can unarchive it.                             │
└─────────────────────────────────────────────────────────┘
```

Yellow/amber tone (`bg-yellow-50`, `border-yellow-300`, `text-amber-800`). Positioned above the project header.

Banner copy is intentionally "the project view is read-only" rather than "all issues are read-only" — server-side issue endpoints remain writable in this iteration. See [Out of Scope](#out-of-scope).

### Project list card — archived badge

Archived cards display a muted `"Archived"` badge (top-right of card header). Card background is slightly desaturated (`bg-muted/40`).

### Projects list — default filter change (server-driven, single source of truth)

> [!warning] The naive "hardcode `status: 'active'` in `useProjects`" approach breaks the Archived checkbox
> [projects-list-screen.tsx:31](src/features/projects/screens/projects-list-screen.tsx:31) calls `useProjects({ teamId })` once and `useProjectFilters` filters the result client-side. If the API call hardcodes `status: 'active'`, selecting "Archived" in the filter dropdown filters an active-only dataset and shows zero rows even when archived projects exist. The fix is to thread the **filter state** into the API query, not a static default.

Concrete plan:

1. **Pass `filters.status` through to `useProjects`** — in [projects-list-screen.tsx](src/features/projects/screens/projects-list-screen.tsx:31), lift the filter state above `useProjects`, then call:
   ```ts
   const apiStatus = filters.status === 'all' ? undefined : filters.status;
   const { data, isLoading, refetch } = useProjects({ teamId, status: apiStatus });
   ```
   Because the filter state now drives the API query, the client-side status filter in `useProjectFilters` becomes redundant — **remove the status branch** from its `useMemo` (search/visibility/userRole/sort stay client-side). This avoids double-filtering and keeps the server as the single source of truth for status.

2. **`get-projects.ts` / `use-projects.ts`** — extend the request shape to accept `status?: 'active' | 'archived'` and forward to `GET /api/projects?status=...`. The server already accepts this via `ListProjectsQuerySchema` ([schemas.ts:121](src/server/projects/schemas.ts:121)); no server change required.

3. **`useProjectFilters` default** — change `DEFAULT_FILTERS.status` from `'all'` → `'active'`, and **export the constant** so callers reset to the same value. ([use-project-filters.ts](src/features/projects/hooks/use-project-filters.ts:15))

4. **`ProjectFiltersComponent.clearFilters`** — replace the hardcoded literal at [project-list-filters.tsx:58](src/features/projects/components/project-list-filters.tsx:58) with the exported `DEFAULT_FILTERS` constant.

5. **`projects-list-screen.tsx` `NoFilteredResults` reset** — the inline reset at [projects-list-screen.tsx:96-105](src/features/projects/screens/projects-list-screen.tsx:96) hardcodes the same six fields; replace with `setFilters(DEFAULT_FILTERS)`.

---

## Activity Logging

The activity insert is done inline inside the archive/unarchive transactions (see [New service functions](#new-service-functions--srcserverprojectsproject-servicets)) — no new exports in `activity-service.ts`. The only schema-side change is extending the `project_activity_type` enum (see [Migration](#data-layer)).

### Activity feed UI

Update [src/features/projects/components/project-detail-activity-feed.tsx](src/features/projects/components/project-detail-activity-feed.tsx):

- `getActivityIcon` — add `project_archived` (e.g. `RiArchiveLine`, amber) and `project_unarchived` (e.g. `RiInboxUnarchiveLine`, green).
- `getActivityMessage` — add cases:
  - `project_archived`: `<strong>{actorName}</strong> archived this project`
  - `project_unarchived`: `<strong>{actorName}</strong> restored this project`

Also update the `ProjectActivity['type']` union exported from [src/features/projects/api/types.ts](src/features/projects/api/types.ts) (and any server-side response Zod schema for activities) so the new values type-check end-to-end.

---

## Error UX

| Scenario | Status | Toast |
|---|---|---|
| Archive attempt, not all issues complete | `400` `"All issues must be resolved before archiving"` | `toast.error(serverMessage)` |
| Archive attempt, zero issues | `400` `"All issues must be resolved before archiving"` | same |
| Non-owner attempts archive/unarchive | `403` permission denied | `toast.error` |
| Project not found | `404` | `toast.error` |
| Join archived project | `403` `"Cannot join an archived project"` (code `PROJECT_ARCHIVED`) | `toast.error` |
| PATCH `/api/projects/[id]` with `{ status }` (bypass attempt) | `400 INVALID_INPUT` (Zod `.strict()` rejects unknown key) | n/a — defensive only |

---

## Test Scope

Co-located with each touched module (matches the wiki's [[concepts/testing]] convention):

**Service tests** — `src/server/projects/__tests__/archive-project.test.ts`
- archive: all-complete project → status flips to `archived`, activity row inserted with `type='project_archived'` and correct `actorId`
- archive: incomplete project → throws gate error, status unchanged, **no activity row** (verifies tx rollback)
- archive: zero-issue project → throws gate error
- archive: already-archived → no-op, no second activity row
- archive: rolls back atomically if the activity insert fails (force via mocked tx insert error) — project status must remain `active`. This is the test that proves the inline-tx refactor took effect; an implementation that calls the global-`db` helpers would leave the status flipped.
- unarchive: archived project → status flips to `active`, activity logged
- unarchive: already-active → no-op
- `joinProject` on archived project throws `"Cannot join an archived project"`

> [!note] No race-condition test in v1
> The spec scopes the issue-write race as a known TOCTOU window (see Decisions). Writing a test that asserts a `409` would be testing behavior the implementation does not guarantee. If/when issue writers gain a `requireProjectActive` guard (deferred), add a race test then.

**Route tests** — `src/app/api/projects/[id]/archive/__tests__/route.test.ts`
- POST: owner + complete → `200`
- POST: owner + incomplete → `400` with gate message
- POST: editor → `403`
- POST: nonexistent project → `404`
- DELETE: owner + archived → `200`
- DELETE: editor → `403`

**Bypass-prevention test** — extend the existing route test for `PATCH /api/projects/[id]`
- PATCH with `{ status: 'archived' }` → `400 INVALID_INPUT` (schema rejects unknown key — requires the `.strict()` chain on `UpdateProjectSchema`; without `.strict()` Zod silently strips and the route returns `200`, so this test is the regression guard)
- PATCH with `{ name: 'X' }` still → `200` (the strict refactor must not regress legitimate updates)

**Join-route test** — extend `src/app/api/projects/[id]/join/__tests__/route.test.ts`
- POST join on archived public project → `403` with code `PROJECT_ARCHIVED` (guards against the "service throws, route 500s" regression)

**UI tests**
- `project-actions.test.tsx`: dropdown shows Archive when owner+active, Unarchive when owner+archived, neither for non-owner
- `project-detail-screen.test.tsx`: banner renders when archived, hidden when active; Add Issue button hidden when archived
- `project-list-card.test.tsx`: archived badge + muted styling
- Activity feed test: new event types render with correct icon + message

---

## Out of Scope

- Bulk archive from the projects list
- Archiving from the project list card directly
- Email notifications on archive/unarchive
- Sidebar hiding archived projects (can be a follow-up)
- **Server-side issue/attachment/comment write guards on archived projects.** Existing endpoints (`PATCH /api/issues/[id]`, attachment upload, annotation/comment writes, member add/remove, role change) are **not** locked when the parent project is archived. The UI hides the entry points; direct API calls still succeed. Add `requireProjectActive(projectId)` to those routes as a follow-up if API-level enforcement is required.

---

## Files Touched

| File | Change |
|---|---|
| `src/config/roles.ts` | Add `PROJECT_ARCHIVE` permission, grant to `PROJECT_OWNER` |
| **Migration** — `drizzle/0004_<slug>.sql` + `drizzle/meta/_journal.json` | Generated by `bun run db:generate` from the schema edit below |
| `src/server/db/schema/project-activities.ts` | Add `project_archived`, `project_unarchived` to `projectActivityTypeEnum`; update JSDoc |
| `src/server/projects/project-service.ts` | Add `archiveProject`, `unarchiveProject` (inline-tx, `FOR UPDATE` lock, count-based gate, idempotent); **remove `status` from `UpdateProjectData` and from `updateProject`** (now unused) |
| `src/server/projects/member-service.ts` | `joinProject`: reject when `project.status === 'archived'` |
| `src/server/projects/schemas.ts` | **Remove** `status` from `UpdateProjectBodySchema`; chain `.strict()` |
| `src/app/api/projects/[id]/route.ts` | **Remove** `status` from local `UpdateProjectSchema`; chain `.strict()`; stop forwarding `status` to `updateProject` |
| `src/app/api/projects/[id]/join/route.ts` | Add `403 PROJECT_ARCHIVED` mapping for the new `"Cannot join an archived project"` error |
| `src/app/api/projects/[id]/archive/route.ts` | New file — POST + DELETE handlers |
| `src/features/projects/api/archive-project.ts` | New file |
| `src/features/projects/api/unarchive-project.ts` | New file |
| `src/features/projects/api/get-projects.ts` | Default `status: 'active'` in query |
| `src/features/projects/api/types.ts` | Add new values to `ProjectActivity['type']` union and any Zod activity schema |
| `src/features/projects/api/index.ts` | Export new callers |
| `src/features/projects/hooks/use-archive-project.ts` | New file (confetti + error handling) |
| `src/features/projects/hooks/use-unarchive-project.ts` | New file |
| `src/features/projects/hooks/use-projects.ts` | Default `status: 'active'` parameter |
| `src/features/projects/hooks/use-project-filters.ts` | Change `DEFAULT_FILTERS.status` to `'active'`, **export `DEFAULT_FILTERS`**, and **remove the status branch** from the client-side `useMemo` (status now driven by API query) |
| `src/features/projects/hooks/index.ts` | Export new hooks |
| `src/features/projects/components/project-actions.tsx` | Add archive/unarchive items; hide write actions when archived |
| `src/features/projects/components/project-detail-header.tsx` | Add `status` to `Project` prop; derive `canArchiveProject` / `canUnarchiveProject` |
| `src/features/projects/components/project-detail-activity-feed.tsx` | Icon + message cases for new event types |
| `src/features/projects/components/project-list-card.tsx` | Archived badge + muted style |
| `src/features/projects/components/project-list-filters.tsx` | `clearFilters` resets to imported `DEFAULT_FILTERS` |
| `src/features/projects/screens/project-detail-screen.tsx` | Add `status` to prop; render archived banner; hide Add Issue when archived |
| `src/features/projects/screens/project-detail-screen-wrapper.tsx` | Add `status` to `Project` prop |
| `src/features/projects/screens/projects-list-screen.tsx` | Lift filter state above `useProjects`; pass `filters.status` (mapped to `undefined` for `'all'`) into the API call; `NoFilteredResults` reset uses imported `DEFAULT_FILTERS` |
| `src/app/(protected)/(team)/(routes)/[projectSlug]/page.tsx` | Pass `status` through to wrapper |
| `package.json` | Add `canvas-confetti` + `@types/canvas-confetti` |
| `bun.lock`, `package-lock.json` | Updated by package manager (commit both — repo tracks both) |
