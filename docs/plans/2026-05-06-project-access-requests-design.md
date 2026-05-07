# Project Access Requests — Design

**Date:** 2026-05-06
**Status:** Validated, ready for implementation plan
**Branch context:** branched from `fix/localhost-exist-on-project-invitation`

## Problem

A signed-in user without project membership who clicks a shared issue link (e.g. `/issue/GWL-3`) currently sees `Error loading issue — You do not have permission to view this issue`. This is a dead end: no path to ask for access, and no signal to the project owner that someone tried.

## Goal

Replace the dead-end error with an in-place "Request access" flow scoped to the **project** (not the issue, not the team). On approval the user becomes a `PROJECT_VIEWER` and — via the existing `joinProject` path — a `TEAM_MEMBER` if they weren't on the team yet. Approvers manage requests from the project members page.

Public projects keep their existing one-click join. The new flow only fires for `visibility === 'private'`.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Project-scoped request entity | Reuses existing `joinProject` semantics; issue is just the entry point. |
| 2 | In-place panel on the issue route, no redirect | Stable URL — refresh-after-approval just works. Avoids leaking issue title/body to non-members. |
| 3 | Approvers: `PROJECT_OWNER` + `PROJECT_EDITOR` | Matches who can already create project invitations; avoids OOO-owner bottleneck. |
| 4 | Granted role on approval: always `PROJECT_VIEWER` | Safest default; approver can promote later via existing role UI. |
| 5 | Optional message field, ≤500 chars | Trivial cost, real value for "Hi, I'm Sarah from acme.com…" cases. |
| 6 | Repeat-request rule: one pending at a time, 7-day cooldown after decline | Discourages spam without making decline permanent. |
| 7 | Notifications: in-app (SSE) + email, both directions | Symmetry with project invitations. |
| 8 | New table `project_access_requests` (not reusing `project_invitations`) | Different lifecycle: authenticated-user-initiated, no token, no email-as-identifier. |

## User flows

### Requester

1. Signed-in non-member opens `/issue/GWL-3`.
2. Page server component calls `getProjectForAccessCheck` → `hasAccess: false`.
3. If `project.visibility === 'public'` → render existing public-join panel.
4. Else → render `AccessRequestScreen` with project name, team name, optional message field, "Request access" button. **Issue title/body never reach the client on this branch.**
5. Submit → `POST /api/projects/[id]/access-requests`. Panel transitions to "Pending — we'll email you when it's reviewed." with a "Cancel request" link.
6. On approval, requester receives in-app + email notification linking back to the original issue URL. Refreshing the page just shows the issue.
7. On decline, neutral notification + email. Cooldown surfaces in the panel as "You can request again on {date}."

Signed-out users: existing `(protected)` middleware bounces to login with `?next=/issue/GWL-3`. After auth, they land in step 1 above. (Verify `next` honored — small fix if not.)

### Approver

1. SSE notification: "{requester name} requested access to {project}" → click opens project members page.
2. New "Access requests" section sits above "Pending invitations". Empty state hides the section.
3. Each row: avatar, name, email, requested-at, message (collapsible if long), Approve / Decline.
4. Approve → `POST /api/projects/[id]/access-requests/[requestId]/approve`. Server marks `approved`, calls `joinProject(projectId, requesterUserId, teamId)` (auto-adds team membership), notifies requester.
5. Decline → marks `declined`, sets `declineCooldownUntil = now() + 7d`, notifies requester with neutral copy.

### Auto-resolution

If a requester is invited via the existing project-invitation flow, or added directly by an approver, while their request is pending → request marked `superseded`. Idempotent. Implemented as `supersedePendingRequests(projectId, userId)` called from `joinProject` and from invitation-acceptance.

## Data model

New table `project_access_requests` in `src/server/db/schema/project-access-requests.ts`:

```ts
export const projectAccessRequests = pgTable("project_access_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  requesterUserId: uuid("requester_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  message: varchar("message", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | approved | declined | superseded | cancelled
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  declineCooldownUntil: timestamp("decline_cooldown_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pendingUniqueIdx: uniqueIndex("project_access_requests_pending_unique_idx")
    .on(table.projectId, table.requesterUserId)
    .where(sql`${table.status} = 'pending'`),
  projectStatusIdx: index("project_access_requests_project_status_idx")
    .on(table.projectId, table.status),
  requesterIdx: index("project_access_requests_requester_idx").on(table.requesterUserId),
}));
```

**Why these choices:**
- Partial unique index mirrors `project_invitations.activeInvitationUniqueIdx` — race-safe under concurrent POSTs.
- `declineCooldownUntil` lives on the declined row; next request checks "any decline for (project, user) where cooldownUntil > now()". Keeps history queryable.
- `superseded` status preserves audit trail.
- No `email` column — resolve via join on `users`. Avoids drift.

Migration: generated via `bun run db:generate`.

### RBAC additions (`src/config/roles.ts`)

| Permission | Roles |
|---|---|
| `project:access-request:create` | any authenticated user (checked at API layer, not via project role) |
| `project:access-request:list` | `PROJECT_OWNER`, `PROJECT_EDITOR` |
| `project:access-request:approve` | `PROJECT_OWNER`, `PROJECT_EDITOR` |

## Server layer

### `src/server/projects/access-request-service.ts`

Mirrors `invitation-service.ts` shape.

- `createAccessRequest({ projectId, userId, message })` — validates project exists & not deleted; checks user not already a member; checks no pending request; checks no active decline cooldown. Inserts row. Emits SSE to approvers + queues approver emails. Throws `ALREADY_MEMBER`, `REQUEST_PENDING`, `COOLDOWN_ACTIVE`, `PROJECT_NOT_FOUND`.
- `listAccessRequests(projectId, actorUserId)` — RBAC-guarded. Returns pending + recently decided (last 30 days) joined with requester user data.
- `approveAccessRequest(requestId, actorUserId)` — guarded; transactionally marks `approved` + calls `joinProject(projectId, requesterUserId, teamId)` (reuses existing auto-team-join). Emits SSE + email to requester with deep link to original issue.
- `declineAccessRequest(requestId, actorUserId)` — guarded; marks `declined`, sets `declineCooldownUntil = now() + 7 days`, emits SSE + neutral email.
- `cancelAccessRequest(requestId, actorUserId)` — requester self-cancels their own pending request.
- `supersedePendingRequests(projectId, userId)` — internal helper called from `joinProject` and project-invitation acceptance. Idempotent.

### Project service change

`getProject(projectId, userId)` keeps its current throw-on-denied behavior (callers depend on it).

Add **sibling** `getProjectForAccessCheck(projectId, userId)` returning `{ project, hasAccess: boolean }`. Used only by the issue page server component.

### API routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/projects/[id]/access-requests` | requester creates |
| GET | `/api/projects/[id]/access-requests` | approver lists |
| POST | `/api/projects/[id]/access-requests/[requestId]/approve` | approver approves |
| POST | `/api/projects/[id]/access-requests/[requestId]/decline` | approver declines |
| DELETE | `/api/projects/[id]/access-requests/[requestId]` | requester self-cancels |

Status codes: 401 (no session), 403 (not approver / project deleted), 404 (project or request not found), 409 (already member, request pending, or cooldown active). Zod-validated request bodies at the network boundary.

## Client layer

### Issue page integration

`src/app/(protected)/(team)/(routes)/issue/[issueKey]/page.tsx` (and the `(verified)` variant) — replace the implicit throw path with explicit branching:

```ts
const { project, hasAccess } = await getProjectForAccessCheck(issue.projectId, userId);

if (!hasAccess) {
  if (project.visibility === 'public') {
    return <PublicProjectJoinPanel project={project} returnIssueKey={issueKey} />;
  }
  const existingRequest = await getMyPendingRequest(project.id, userId);
  return <AccessRequestScreen project={project} existingRequest={existingRequest} issueKey={issueKey} />;
}
// existing render path unchanged
```

Issue title/description never reach the client on this branch — only `project.name`, `project.teamName`, and the issue key (already in URL).

### `src/features/projects/` extensions

API callers (`api/`):
- `create-access-request.ts`, `cancel-access-request.ts`, `list-access-requests.ts`, `approve-access-request.ts`, `decline-access-request.ts`. Mirror `create-invitation.ts` style. Zod-validated.

Hooks (`hooks/`):
- `use-create-access-request.ts`, `use-my-access-request.ts` (single-project, requester-side state), `use-project-access-requests.ts` (list, approver-side), `use-approve-access-request.ts`, `use-decline-access-request.ts`, `use-cancel-access-request.ts`. TanStack Query with existing query-key conventions.

Components (`components/access-requests/`):
- `access-request-panel.tsx` — requester panel (form + pending + cooldown + cancel).
- `access-request-list.tsx` — approver list section.
- `access-request-row.tsx` — single row with Approve / Decline.

Screens (`screens/`):
- `access-request-screen.tsx` — wraps panel with page chrome (`AppHeaderConfigurator`, breadcrumbs limited to `Projects > <Project name>`).

Project members page — insert `<AccessRequestList projectId={...} />` above the existing pending-invitations section. Empty state hides the section.

## Notifications

Three new SSE notification kinds, fanned out via existing pipeline ([realtime-sse](../../.ai/wiki/concepts/realtime-sse.md)):

- `project.access_request.created` → all `PROJECT_OWNER` + `PROJECT_EDITOR`. Click → project members page `?tab=requests`.
- `project.access_request.approved` → requester. Click → original issue URL (stored on creation as `metadata.returnUrl`; defaults to `/{project.slug}` when no issue context).
- `project.access_request.declined` → requester. Neutral copy, no reason field.

## Email

Three new React Email templates under `src/emails/`, paralleling project-invitation templates:

- `project-access-request-received.tsx` (to approvers)
- `project-access-request-approved.tsx`
- `project-access-request-declined.tsx`

All flow through the existing `email-delivery` queue with retry/tracking — same reliability as invitations.

## Edge cases & invariants

| Case | Behavior |
|---|---|
| Requester account deleted | Cascade removes requests. Approver UI defensively filters null requesters. |
| Project deleted | Cascade removes requests. SSE clients ignore stale notifications. |
| Approver loses role mid-flow | Next approve/decline `requirePermission` 403s. UI refetch removes the row. |
| Two approvers click Approve simultaneously | Second call gets `ALREADY_MEMBER` from `joinProject`. Mark `approved` idempotently. No duplicate notification. |
| Requester invited via invitation while pending | Invitation acceptance calls `supersedePendingRequests` → request marked `superseded`. No double-grant. |
| Visibility flips public → private with pending request | Request stays valid. Cooldown logic still applies on decline. |
| Abuse / spam | Pending-uniqueness partial index is the real stop; piggyback on existing per-user mutation rate limits ([rate-limiting](../../.ai/wiki/concepts/rate-limiting.md)). No new bucket. |

## Testing

[testing](../../.ai/wiki/concepts/testing.md) — Vitest + PGlite:

- **Service unit tests:** create / approve / decline / cancel / supersede, cooldown enforcement, race-safety (concurrent inserts both fail unique index → only one survives), join-team auto-grant on approve, permission denials.
- **API integration tests** for each of the 5 endpoints, covering 401/403/404/409 paths.
- **One E2E (Playwright)** on the golden path: signed-in non-member visits issue link → requests → approver approves → requester refresh → sees issue.

## Out of scope

- Decline-reason field exposed to requester (intentional — avoids social awkwardness).
- Approver-side custom role at approval time (always `PROJECT_VIEWER`; promote later).
- Bulk approve/decline (single-row actions only for v1).
- Team-level access requests (this design is project-scoped only).
- Notification preferences for access requests (uses default user notification settings).

## Wiki updates (at end of implementation)

- New `concepts/access-requests.md` (cross-cuts projects + RBAC + notifications).
- Update `features/projects.md` to list new screens / api / hooks.
- Append dated entry to `log.md`.
