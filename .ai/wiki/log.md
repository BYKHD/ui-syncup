---
title: Wiki Log
type: log
last_updated: 2026-05-07
---

# Wiki Log

Append-only. Newest entries at the bottom. Each entry starts with `## [YYYY-MM-DD] <op> | <subject>` so `grep "^## \[" log.md` works.

## [2026-05-01] init | wiki bootstrapped

- Created [[WIKI]] schema, [[index]], [[overview]], and this log.
- Layout: `sources/`, `features/`, `concepts/`, `entities/`.
- Seeded from `.ai/steering/{product,structure,tech}.md` and `docs/feature-architectures/*`.

## [2026-05-01] ingest | steering source documents

- Ingested `.ai/steering/product.md` → [[sources/steering-product]].
- Ingested `.ai/steering/structure.md` → [[sources/steering-structure]].
- Ingested `.ai/steering/tech.md` → [[sources/steering-tech]].
- Created [[concepts/rbac-roles]], [[concepts/issue-workflow]], [[concepts/architecture]], [[concepts/tech-stack]], [[concepts/deployment]].

## [2026-05-01] ingest | feature architecture docs

- Ingested 9 docs from `docs/feature-architectures/`.
- Created source pages and integrated into matching feature/concept pages.

## [2026-05-01] ingest | codebase feature crawl

- Walked `src/features/*` and created one feature page per directory (15 features).
- Each page is a _map_ into the codebase, not a re-derivation.

## [2026-05-01] init | CLAUDE.md added

- Created `CLAUDE.md` at repo root following Karpathy's LLM Wiki pattern.
- Orients Claude Code to the wiki on session start; embeds the three workflows (ingest, query, lint) and conventions cheat sheet.
- Points at `.ai/wiki/WIKI.md` for full schema and `.ai/wiki/index.md` for the catalog.

## [2026-05-01] refactor | consolidated agent guidance into CLAUDE.md

- Merged the full `AGENTS.md` scaffolding guide into `CLAUDE.md`. `CLAUDE.md` is now the single canonical agent guidance file.
- `AGENTS.md` shrunk to a 3-line pointer at `CLAUDE.md`.
- Replaced `CLAUDE.md` §13 ("Extended Documentation" with dead `docs/architecture/*` links) with pointers into `concepts/` wiki pages.
- Replaced §14 ("Feature Modules" with stale list including `landing`/`onboarding`) with a pointer to the wiki index — the catalog there is correct.
- The redundant `docs/feature-architectures/*` and `docs/development/*` docs were removed from the repo. Annotated all 9 source pages under `.ai/wiki/sources/feature-arch-*` with `original_status: removed (this wiki page is now canonical)` plus a callout note. The wiki source page is now authoritative.

## [2026-05-05] lint | dedup source ↔ concept

- Audit found 7 `feature-arch-*` source pages duplicating their paired concept page (rbac, storage, security, loading, notifications, resource-limits, rate-limit-reset).
- Resolved with option (a): concepts are canonical; source pages slimmed to provenance stubs (identity, scope, `feeds_into`) pointing at the concept page. Source frontmatter `original_status` updated from "this wiki page is now canonical" to "canonical content in [[concepts/X]]".
- Fixed [[index]]: stale `Concepts (12)` header → `(16)`; replaced removed `docs/feature-architectures/*` paths in source descriptions with provenance/canonical pointers.
- No content lost — concept pages already covered every fact in the slimmed sources.

## [2026-05-06] fix | invitation duplicate race review fixes

- Tightened project/team invitation duplicate handling to map only the active-invitation partial unique indexes to duplicate-invitation errors.
- Fixed project invitation create typing so raw database rows are not assigned to the domain `ProjectInvitation` shape.

## [2026-05-07] feat | project access request service (Wave 0 Task 3)

- Created `src/server/projects/access-request-service.ts` with `createAccessRequest` and `rowToAccessRequest` exports.
- Guards: PROJECT_NOT_FOUND (soft-delete), ALREADY_MEMBER, COOLDOWN_ACTIVE (active decline cooldown), REQUEST_PENDING (partial unique index race guard).
- Created integration tests at `src/server/projects/__tests__/access-request-service.integration.test.ts` — 6 tests all GREEN.
- Note: task spec used timestamp-based project keys with digits; `validateProjectKey` only allows uppercase letters, so a base-26 `uniqueKey()` helper was added to the test file.

## [2026-05-07] feat | approveAccessRequest (Wave 0 Task 5)

- Appended `approveAccessRequest` to `src/server/projects/access-request-service.ts`.
- Uses `addMember` directly (not `joinProject`) to avoid private-project visibility check.
- Idempotent: already-approved rows return immediately; concurrent duplicate inserts to `project_members` are caught via both "already a member" message and `23505` unique-violation on `project_members_project_user_unique`.
- Concurrent UPDATE race is resolved by re-reading the row when `updated` is undefined.
- 4 new tests added (approve happy path, FORBIDDEN, idempotent, concurrent) — all 13 tests GREEN.

## [2026-05-07] feat | declineAccessRequest + cancelAccessRequest (Tasks 6 & 7)

- Appended `declineAccessRequest` and `cancelAccessRequest` to `src/server/projects/access-request-service.ts`.
- `declineAccessRequest`: checks REQUEST_NOT_FOUND, then FORBIDDEN via `hasPermission(PROJECT_ACCESS_REQUEST_APPROVE)`, idempotent on already-declined, sets `declineCooldownUntil = now + 7 days`. The `COOLDOWN_DAYS = 7` constant placed alongside `PENDING_UNIQUE_INDEX` and `RECENT_DECISION_WINDOW_DAYS` at top of file.
- `cancelAccessRequest`: only the original requester may cancel (FORBIDDEN if not); no cooldown imposed — requester can re-apply immediately after cancelling; idempotent on already-cancelled.
- 8 new integration tests added (4 decline, 4 cancel) — all 22 tests GREEN.

## [2026-05-07] feat | supersedePendingRequests + getProjectForAccessCheck + barrel (Tasks 8–10)

- **Task 8**: Added `supersedePendingRequests(projectId, userId)` to `access-request-service.ts`. Wired into `joinProject` (member-service.ts) and both `acceptProjectInvitation` / `acceptProjectInvitationById` (invitation-service.ts) via dynamic import to break the import cycle. 2 new integration tests; invitation-service 11 tests all GREEN.
- **Task 9**: Added `getProjectForAccessCheck(projectId, userId)` to `project-service.ts`. Returns `{ project, hasAccess }` without throwing when user is a non-member — enabling the access-request panel to render with project metadata. Returns `null` for missing or soft-deleted projects. 4 new integration tests in `project-service.access-check.integration.test.ts`.
- **Task 10**: Appended explicit named re-exports for all 6 access-request functions and `getProjectForAccessCheck` to `src/server/projects/index.ts`. TypeScript typecheck clean.
- Final test count: 41/41 across 3 test files.

## [2026-05-07] feat | access-requests route handler + tests (Task 11)

- Created `src/app/api/projects/[id]/access-requests/route.ts`: POST (create) + GET (list) handlers.
- POST: auth guard → Zod body validation (message ≤500 chars) → `createAccessRequest` → service-error map → 201.
- GET: auth guard → `listAccessRequests` → serializes dates → 200 with requester/decidedByUser enrichment.
- `mapServiceError` maps PROJECT_NOT_FOUND/REQUEST_NOT_FOUND → 404, ALREADY_MEMBER/REQUEST_PENDING/COOLDOWN_ACTIVE → 409, FORBIDDEN → 403, unknown → 500 with logger.
- Fixed typecheck error: `serializeRequest` parameter typed as `AccessRequest` (not `[k: string]: unknown` index signature).
- 10 unit tests in `__tests__/route.test.ts` — all GREEN. Typecheck clean.

## [2026-05-07] feat | project access request notifications + email side-effects (Task 15)

- Added fire-and-forget notification + email side-effects to `createAccessRequest`, `approveAccessRequest`, `declineAccessRequest` in `access-request-service.ts`.
- New imports: `teams` schema, `env`, `createNotification`, `enqueueEmail`.
- `createAccessRequest` fans out a `project_access_request_created` notification and `project_access_request_received` email to all PROJECT_OWNER/PROJECT_EDITOR members.
- `approveAccessRequest` sends `project_access_request_approved` notification + email to requester.
- `declineAccessRequest` sends `project_access_request_declined` notification + email to requester.
- All side-effects wrapped in try/catch — failures log but never block the main response.
- Generated migration `0003_lowly_cassandra_nova.sql` to add 3 new values to `notification_type` enum (required for PGlite test DB).
- Added `notifications` import to integration test, notification existence assertions in 3 tests, and cleanup of notifications by `entityId` in `afterEach`.
- All 26 tests pass.

## [2026-05-07] feat | project access request email templates (Task 13)

- Created 3 email templates: `project-access-request-received-email.tsx` (approver notification with optional message block), `project-access-request-approved-email.tsx` (requester confirmation), `project-access-request-declined-email.tsx` (neutral decline, no reason exposed).
- Registered all 3 in `render-template.tsx`: new `EmailTemplate` union members, imports, `renderTemplate` switch cases, `getEmailSubject` cases.
- Added 3 types to `EmailJobInput.type` union in `queue.ts`.
- TypeScript typecheck clean (`npx tsc --noEmit` produced no output).

## [2026-05-07] feat | access request UI components — Wave 6 (Tasks 18 + 19)

- Task 18: Created `AccessRequestPanel` (`src/features/projects/components/access-requests/access-request-panel.tsx`) — requester-side card with three states: form (request access with optional message), pending (cancel request), cooldown (declined within 7-day window). Exported from components barrel.
- Task 19: Created `AccessRequestRow` + `AccessRequestList` (`src/features/projects/components/access-requests/`) — approver-side components. Row shows requester avatar/name/email/time/message with Approve+Decline buttons for pending requests. List filters to pending only, hides when empty. Both exported from components barrel.
- Hook call signatures adapted to actual implementations (hooks take no projectId arg; params passed to mutate). Type-check clean on both tasks.

## [2026-05-07] feat | project members surface access requests (Task 22)

- Surfaced `AccessRequestList` in `ProjectMemberManagerDialog` immediately above the pending invitations section.
- Reused the existing `canManageMembers` gate and passed the dialog's `projectId` prop.
- TypeScript typecheck clean with `bun run typecheck`.

## [2026-05-07] test | project member manager dialog access request harness

- Fixed `ProjectMemberManagerDialog` component tests by rendering with a fresh React Query `QueryClientProvider` and seeding access-request query data.
- Added coverage that non-managers do not see pending access requests even when request data exists.
- Focused dialog tests and TypeScript typecheck are clean.

## [2026-05-26] add | archive-project feature shipped

- Added owner-only project archive/unarchive workflow with transactional service functions, archive activity events, API route coverage, frontend actions, read-only archived detail banner, and active-by-default project list filtering.
- Local Postgres-dependent migration/manual UI smoke was blocked because `localhost:5432` was not reachable in this environment; focused PGlite route/service/component tests and TypeScript verification were used for code validation.
- See `docs/superpowers/specs/2026-05-26-archive-project-design.md`.

## [2026-05-07] add | concepts/access-requests

- Project-scoped request-to-join feature: replaces the dead-end "no permission" error on shared issue links with an in-place access-request panel.
- Approval grants `PROJECT_VIEWER` through the project member service, which ensures baseline team operational access.
- Race-safe via partial unique index. Three new email templates + three SSE notification kinds.

## [2026-05-07] redesign | access request panel UI

- Redesigned requester-side `AccessRequestPanel` into a richer permission-review card with explicit private-project, team, access-level, reviewer, pending-review, and cooldown states.
- Kept request creation/cancellation behavior unchanged and added focused component coverage for the new visible state contract.
- Verification: focused access-request panel tests, TypeScript typecheck, and lint all pass.

## [2026-05-11] ingest | CSS will-change (jakub.kr)

- Created [[sources/css-will-change]] — summarises when to use `will-change`, when to avoid it, and the dynamic add/remove pattern.
- Created [[concepts/css-will-change]] — project-facing guidance: use only after profiling confirms layer-promotion delay, avoid on layout-triggering properties, remove after animation ends.

## [2026-05-12] refactor | activities route migrated to canViewIssue (Task 4)

- Replaced `hasPermission(ISSUE_VIEW)` with `canViewIssue(userId, { projectId })` in `GET /api/issues/[issueId]/activities`.
- Removed `hasPermission` and `PERMISSIONS` imports (no other usage in file).
- Updated JSDoc to reflect membership-based access rule instead of RBAC permission name.
- Created `src/app/api/issues/[issueId]/activities/__tests__/route.test.ts` (2 tests: 200 + 403, both GREEN).
- Note: route has pre-existing Zod coerce-null bug with missing page/limit params (null → 0 fails min(1)); test works around it with explicit `?page=1&limit=20`.

## [2026-05-12] update | concepts/rbac-roles — public-project access requires team membership

Tightened `canAccessProject()` and added `canViewIssue()` to unify read-access checks across project + issue routes. Closes a cross-team leak where any authenticated user could view another team's "public" projects via direct URL, and fixes the inconsistency where same-team non-members could list issues but get 403 on the issue detail.

Touched: `src/server/projects/project-service.ts`, `src/server/projects/index.ts`, `src/app/api/issues/[issueId]/route.ts`, `src/app/api/issues/[issueId]/activities/route.ts`, `src/app/api/issues/[issueId]/attachments/route.ts`, plus tests.

## [2026-05-12] fix | canAccessProject — close cross-team public project leak

- `canAccessProject()` in `src/server/projects/project-service.ts` previously returned `true` for any authenticated user when `visibility === 'public'`, allowing outsiders from other teams to access another team's project via direct URL.
- Fix: added a team-membership gate as the first check; non-team-members always return `false` regardless of visibility. Public projects remain fully accessible to all team members.
- Added `teamMembers` import; removed call to `getManagementRole` in favour of reading `managementRole` directly off the found `teamMembership` row.
- Updated test `non-member, public project: returns hasAccess true` → `non-team-member, public project: returns hasAccess false (cross-team leak closed)` and added a second test: `team-member but not project-member, public project: returns hasAccess true`.
- 7/7 access-check tests GREEN; 56/56 (4 skipped) project-service suite GREEN.

## [2026-05-12] fix | project member dialog duplicate separator

- Fixed `ProjectMemberManagerDialog` rendering an empty separator before `AccessRequestList` when access requests were absent.
- Moved the access-request section divider into `AccessRequestList`, so it only appears when pending access requests render.
- Added regression coverage for the pending-invitations-only state.

## [2026-05-12] feat | join project from detail header

- Added a `Join Project` primary action for public projects when the current user can view the details page as a same-team non-member (`userRole === null`).
- Reused the existing `useJoinProject` mutation and refreshes the project detail route after successful join so server-derived role state updates.
- Added focused `ProjectActions` component coverage for rendering, click behavior, and hiding the join action when joining is not allowed.

## [2026-05-20] feat | Team switcher fixes — uncapped switcher, accept auto-switch, invite revisit

- Team invitation acceptance now sets the joined team as active and existing members can revisit used/expired/cancelled invitation links without hitting a dead end.
- Sidebar team switcher now renders all teams in a scrollable, filterable list, shows for 2+ memberships even in single-team mode, and full-reloads to `/projects` on switch.
- Notification accept for team invitations now relies on the server-side active-team update and full-reloads to `/projects` instead of issuing a redundant client switch call.

## [2026-05-20] refactor | Relocate app-shell composition from components/shared to components/layout

- `sidebar/`, `headers/`, `notifications/` moved to `components/layout/`; `service-status-banner` moved to `features/setup/components/` (its true owner). Resolves the long-standing layer-contract violation where `components/shared` imported `features/*`.
- `components/layout` is now documented as the app-shell composition layer that may import `features/*` (and may be imported back by feature screens). See [[concepts/import-rules]].

## [2026-05-20] fix | Wire delete-account dialog to real auth hook; drop email gate

- `DeleteAccountDialog` no longer requires re-typing the account email — confirmation is now the typed `DELETE` phrase + acknowledgement checkbox. The email field was unusable for real users: the page fed `MOCK_USER_PROFILE` so the required email never matched the session user, and was friction with no security value for social/OAuth users (no password). See [[features/user-settings]].
- Dialog now calls the real `useDeleteAccount` hook (`DELETE /api/auth/delete-account`) instead of a simulated `setTimeout`; hook gained an optional `onError` callback.
- `useDeleteAccount` is now exported from the `features/auth` barrel ([[concepts/import-rules]] — cross-feature use via public barrel).
- Removed the now-dead `userProfile` prop chain through `OtherSettingsScreen` / `OtherSettings` / `settings/other/page.tsx`.
- Caveat: the backend route + hook are still marked DEV-ONLY and perform no re-authentication before deletion.

## [2026-05-21] fix | Issue detail route resolves by UUID with access-aware key fallback

- Added `getIssueByRef(issueRef, userId)` so `/issue/[issueKey]` accepts UUIDs directly and disambiguates legacy issue keys by the first candidate the user can view.
- Switched project issue rows, dashboard issue rows, and issue notification target URLs to prefer `issues.id`, while preserving legacy `issue_key` display and fallback links.
- Added focused PGlite regression coverage for duplicate `PRJ-1` issues across teams.

## [2026-05-26] fix | issue list drops status row border color

- `IssuesList` no longer applies `statusColors.rowBorder` to issue rows, while preserving status-aware hover background styling.
- Added focused component coverage for the row class contract.

## [2026-05-26] fix | project archive confetti visibility

- Delayed the project detail refresh callback until the `canvas-confetti` animation promise settles, so archiving a completed project does not immediately remove the body-mounted confetti canvas.
- Added focused hook coverage for the archive success callback order.
