# Archive Project — Design Spec

**Date:** 2026-05-26
**Branch:** feature/archive-project
**Status:** Approved, ready for implementation

---

## Overview

A completed project (100% of issues resolved or archived) can be archived by its owner. Archived projects become read-only, are hidden from the default projects list view, and can be unarchived at any time by the owner.

---

## Decisions

| Question | Decision |
|---|---|
| Archive gate | Hard — server blocks archive if `progressPercent < 100` |
| Who can archive | `PROJECT_OWNER` only |
| Who can unarchive | `PROJECT_OWNER` only |
| Archived project detail | Read-only with a banner; write actions hidden |
| Archive entry point | `⋯` dropdown on the project detail page |
| Celebration | Confetti burst + celebratory toast on archive success |

---

## Data Layer

**No migration needed.** `projects.status` already has the `active | archived` enum with an index (`projects_status_idx`). The `updateProject` service function already accepts `status` as an updatable field.

---

## Server

### New service functions — `src/server/projects/project-service.ts`

**`archiveProject(projectId: string): Promise<Project>`**
1. Call `getProjectStats(projectId)`.
2. If `progressPercent < 100`, throw `Error("All issues must be resolved before archiving")`.
3. Call `updateProject(projectId, { status: 'archived' })`.
4. Log `project.archived`.

**`unarchiveProject(projectId: string): Promise<Project>`**
1. Call `updateProject(projectId, { status: 'active' })`.
2. Log `project.unarchived`.

### New API routes

| Method | Path | Guard | Service call |
|---|---|---|---|
| `POST` | `/api/projects/[id]/archive` | `requirePermission(PROJECT_ARCHIVE)` | `archiveProject(id)` |
| `DELETE` | `/api/projects/[id]/archive` | `requirePermission(PROJECT_ARCHIVE)` | `unarchiveProject(id)` |

Both routes follow the existing pattern in `src/app/api/projects/[id]/route.ts`: parse the session, resolve the project, check permission, call service, return JSON.

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
  - `onSuccess`: fire `canvas-confetti` burst, then show celebratory toast: `"🎉 {projectName} is a wrap! All issues resolved."`
  - `onError`: surface API error message via `toast.error` (e.g. "All issues must be resolved before archiving")
  - Invalidates project query cache on settle.
- `src/features/projects/hooks/use-unarchive-project.ts`
  - `onSuccess`: show `toast.success("Project restored")`.

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

### `project-actions.tsx` — dropdown changes

Add `canArchiveProject: boolean` prop (derived from `userRole === 'owner'` and `project.status === 'active'`).
Add `canUnarchiveProject: boolean` prop (derived from `userRole === 'owner'` and `project.status === 'archived'`).

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
│     All issues are read-only. Only the project owner    │
│     can unarchive it.                                   │
└─────────────────────────────────────────────────────────┘
```

Yellow/amber tone (`bg-yellow-50`, `border-yellow-300`, `text-amber-800`). Positioned above the project header.

### Project list card — archived badge

Archived cards display a muted `"Archived"` badge (top-right of card header). Card background is slightly desaturated (`bg-muted/40`).

### Projects list — filter default change

`useProjectFilters` default changes from `status: 'all'` → `status: 'active'`.

The existing "Archived" checkbox in `ProjectFiltersComponent` already handles the filter UI — no changes needed there. The "Clear all filters" reset in `projects-list-screen.tsx` also updates to use `status: 'active'`.

---

## Activity Logging

Both service functions log via the existing `activity-service.ts` pattern:
- `project.archived` — on `archiveProject`
- `project.unarchived` — on `unarchiveProject`

These surface in the project activity feed automatically.

---

## Error UX

| Scenario | Response |
|---|---|
| Archive attempt, `progressPercent < 100` | `400` `"All issues must be resolved before archiving"` → `toast.error` |
| Non-owner attempts archive/unarchive | `403` permission denied → `toast.error` |
| Project not found | `404` → `toast.error` |

---

## Out of Scope

- Bulk archive from the projects list
- Archiving from the project list card directly
- Email notifications on archive/unarchive
- Sidebar hiding archived projects (can be a follow-up)
- Issue-level API enforcement of read-only — existing issue endpoints (`PATCH /api/issues/[id]`) are **not** locked for archived projects in this iteration. "Read-only" means the project detail UI hides write actions and no new issues can be added; it does not add server-side guards to every issue endpoint. That enforcement can be a follow-up if needed.

---

## Files Touched

| File | Change |
|---|---|
| `src/config/roles.ts` | Add `PROJECT_ARCHIVE` permission |
| `src/server/projects/project-service.ts` | Add `archiveProject`, `unarchiveProject` |
| `src/app/api/projects/[id]/archive/route.ts` | New file — POST + DELETE handlers |
| `src/features/projects/api/archive-project.ts` | New file |
| `src/features/projects/api/unarchive-project.ts` | New file |
| `src/features/projects/api/index.ts` | Export new callers |
| `src/features/projects/hooks/use-archive-project.ts` | New file |
| `src/features/projects/hooks/use-unarchive-project.ts` | New file |
| `src/features/projects/hooks/index.ts` | Export new hooks |
| `src/features/projects/components/project-actions.tsx` | Add archive/unarchive items to dropdown |
| `src/features/projects/screens/project-detail-screen.tsx` | Add archived banner, hide write actions |
| `src/features/projects/components/project-list-card.tsx` | Add archived badge + muted style |
| `src/features/projects/hooks/use-project-filters.ts` | Change default status to `'active'` |
| `src/features/projects/screens/projects-list-screen.tsx` | Update clear-filters reset value |
| `package.json` | Add `canvas-confetti` + `@types/canvas-confetti` |
