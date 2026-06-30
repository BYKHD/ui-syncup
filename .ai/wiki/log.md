---
title: Wiki Log
type: log
last_updated: 2026-05-27
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

## [2026-05-26] query | project list card archive state

- Confirmed `ProjectCard` derives archived list-card UI from `project.status === "archived"` and does not own archive/unarchive state locally.

## [2026-05-26] fix | project list card archived folder background

- Removed the archived-state muted override from the `ProjectCard` folder panel so archived cards keep the normal `bg-card` panel background while retaining the archived badge and outer card treatment.
- Added focused component coverage for the archived folder-panel class contract.

## [2026-05-26] fix | eslint JSX text and decorative image warnings

- Replaced literal JSX text-node quote characters with HTML entities in issue, project, team-settings, and user-settings UI components.
- Added explicit empty `alt` props to decorative issue attachment tab/image icons targeted by the a11y lint rule.

## [2026-05-26] fix | eslint no-unused-vars warnings

- Removed dead type/icon imports and prefixed intentionally retained unused bindings in annotations, issues canvas, and project activity components.
- `bun run lint 2>&1 | grep 'no-unused-vars'` now returns no output; remaining lint warnings are from other rules.

## [2026-05-27] feat | archive write-freeze on issues, annotations, comments

- Added [`isProjectArchived`](../../src/server/projects/archive-status.ts) as a leaf module (kept out of `project-service.ts` to avoid a cycle with `rbac.ts`).
- Gated `hasPermission` in [src/server/auth/rbac.ts](../../src/server/auth/rbac.ts): issue + annotation write permissions short-circuit to `false` when the project is archived. `project:archive` and reads stay granted so owners can unarchive.
- Gated `getAnnotationPermissions` in [src/server/annotations/permission-utils.ts](../../src/server/annotations/permission-utils.ts): zeros out all write flags on archived projects while keeping `canView`.
- Strict freeze (no role bypass): TEAM_OWNER edits also blocked — to modify, unarchive first.
- Updated [[features/projects]] and [[concepts/issue-workflow]]; new tests in [`archive-permissions.integration.test.ts`](../../src/server/projects/__tests__/archive-permissions.integration.test.ts) (4/4 passing; full related suite 32/32 passing; `tsc --noEmit` clean).

## [2026-05-27] feat | archive read-only UI parity for issues + annotations

- Server: `getIssueById` ([src/server/issues/issue-service.ts](../../src/server/issues/issue-service.ts)) now returns `projectStatus` on `IssueWithDetails`; surfaces through `IssueDetailData` ([src/features/issues/types/issue.ts](../../src/features/issues/types/issue.ts)) so the client has archive state without a second round-trip.
- Issue UI: [issue-details-screen.tsx](../../src/features/issues/screens/issue-details-screen.tsx) forces `IssuePermissions` to all-false when `projectStatus === 'archived'`. Existing `InlineEditable*` + `MetadataSection` already render read-only when `canEdit=false`, so the viewer-like look is automatic.
- Annotation UI: [`useAnnotationPermissions`](../../src/features/annotations/hooks/use-annotation-permissions.ts) gains an `isArchived` option → returns `READ_ONLY_PERMISSIONS`. [responsive-issue-layout.tsx](../../src/features/issues/components/responsive-issue-layout.tsx) threads `issueData.projectStatus === 'archived'` through `IssueAttachmentsView` → `AnnotatedAttachmentView`.
- Friendlier toasts on handler short-circuit: "This project is archived. Unarchive to edit." instead of generic "Update failed".
- New test: Property 16.8 in [`use-annotation-permissions.property.test.tsx`](../../src/features/annotations/hooks/__tests__/use-annotation-permissions.property.test.tsx) (12/12 passing; tsc clean).
- Caveat (not addressed here): the broader `useIssuePermissions` hook in `issue-details-screen.tsx:101` is still a TODO — non-archive role gating still relies on server 403s. Tracked as a follow-up.

## [2026-05-27] feat | Wire real RBAC permissions to issue-details-screen (close the default-true TODO)

- `getUserPermissions` in `src/server/auth/rbac.ts` now strips `ARCHIVE_BLOCKED_PERMISSIONS` on archived projects, mirroring `hasPermission`.
- `GET /api/issues/[issueId]` response now includes `permissions: string[]` — the viewer's resolved permission set for the issue's project.
- `use-issue-details` surfaces `permissions: string[] | undefined`; `use-issue-permissions({ issueId })` maps strings to `IssuePermissions` flags.
- `issue-details-screen.tsx`: replaced the `canEdit: true` defaults with `useIssuePermissions`; archive override kept for defence-in-depth.
- Tests: `rbac.test.ts` (4 new integration cases for archive gating), `hooks/__tests__/use-issue-permissions.test.tsx` (5 unit cases), route mock updated.
- Affected files: `rbac.ts`, `route.ts` (GET), `get-issue-details.ts`, `use-issue-details.ts`, `use-issue-permissions.ts` (new), `hooks/index.ts`, `issue-details-screen.tsx`.

## [2026-06-15] perf | annotations editing/viewing smoothness (Tier 1)

- Reviewed `src/features/annotations` for drag/draw/zoom render-budget issues; fixed the top three. Synthesis filed as [[concepts/annotations-canvas-performance]].
- **#1 draw re-render storm** — `annotation-canvas.tsx` dropped a dead per-pointermove `onDraftUpdate`→`setCurrentDraft` path (the value was never read by [annotated-attachment-view.tsx](../../src/features/annotations/components/annotated-attachment-view.tsx)); added a pointerdown rect-cache + rAF-coalesced preview. Removed the now-unused `onDraftUpdate` prop.
- **#2 drag GPU path** — `annotation-box.tsx` whole-box MOVE now uses framer `x/y` motion values (no React render per frame); resize stays width/height but rAF-coalesced (scale would distort border/handles); rect cached at pointerdown. `annotation-pin.tsx` kept conservative (rect-cache + rAF, render formula byte-identical) to avoid moving existing pins.
- **#3 zoom GPU path** — `centered-canvas-view.tsx` (features/issues) wheel zoom drives a transient `scale` motion value + pan on the compositor, committing `canvasState.zoom` ~120ms after the gesture (commit values identical to old per-event math). Pins counter-scale `1/transientScale` via new [annotation-scale-context.tsx](../../src/features/annotations/components/annotation-scale-context.tsx) (`CanvasScaleProvider`/`useCanvasTransientScale`). Compare mode (`hideZoomControls`) kept on the old per-event path for lockstep.
- Safety: `CanvasViewState` is never persisted; annotation coords normalized 0–1; committed values unchanged → existing annotations untouched. `tsc` clean, eslint 0 errors (2 pre-existing `react-hooks/refs` warnings), annotations suite 8/8, react-doctor 73/100 (no regression).
- Deferred / discovered (not changed): box-chrome counter-scale (box rect should scale with image, only border/handles need constant size); a **pre-existing touch-pinch bug** (`touchmove`/`touchend` gated on `isDragging`, which a 2-finger touch clears — desktop/trackpad via `ctrl+wheel` unaffected); a likely **~12px pin centering offset** (framer-motion transform overrides Tailwind `-translate-*`). Live in-browser zoom verification still pending.

## [2026-06-15] perf | annotations Tier 2/3 — memoization + callback stability + sync correctness

- Subagent-driven (sonnet executors, main-agent review). Continues the Tier 1 work; patterns in [[concepts/annotations-canvas-performance]].
- **T3 stable callbacks**: `setDragging` in [use-annotation-integration.ts](../../src/features/annotations/hooks/use-annotation-integration.ts) is now `useCallback`; `onDragStart/onDragEnd` and `handleAnnotationEdit/handleAnnotationDelete` in [annotated-attachment-view.tsx](../../src/features/annotations/components/annotated-attachment-view.tsx) made identity-stable by reading live values through refs synced each render.
- **T2 React.memo**: `AnnotationPin`/`AnnotationBox` wrapped in `memo` (generic preserved via `as typeof Inner`). With stable callbacks, selection/hover/post-commit re-render is O(1) not O(N) markers. (Local-mode move handlers still churn — transient upload-preview path, low N.)
- **T3 popover stale-ref**: [use-annotation-popover.ts](../../src/features/annotations/hooks/use-annotation-popover.ts) takes `isDraggingRef` (RefObject) read live; handlers stay stable so the memo holds. Fixes the popover opening mid-drag.
- **T3 sync correctness**: the partial-sync dirty-check in the integration hook now compares `shape` via `shapesAreEqual` (was id/x/y only → a box whose geometry changed but center stayed put was missed).
- Skipped: 200ms cleanup-interval gating (marginal CPU vs. risk of leaking `debouncing` states). **Dropped (won't-do): Framer `LazyMotion` bundle trim** — needs an app-level provider + risks silent animation regressions only catchable by live testing.
- Render/correctness-only; existing annotations untouched. `tsc` clean, eslint 0 errors, annotations suite 8/8.

## [2026-06-15] fix | touch pinch-to-zoom on touchscreens (centered-canvas-view)

- Fixed the pre-existing touch-pinch bug flagged in the two entries above. Root cause confirmed: in [centered-canvas-view.tsx](../../src/features/issues/components/centered-canvas-view.tsx) the document `touchmove`/`touchend` listeners were attached only while `isDragging`, but `handleTouchStart` sets `isDragging=false` on a 2-finger touch (and a 1→2-finger transition detaches them), so the pinch branch of `handleTouchMove` never ran. Desktop/Mac-trackpad zoom was never affected (arrives as `ctrl+wheel` → `handleWheel`).
- **Fix (single file):** new `isPinching` state; touch listeners now gated on `isDragging || isPinching` (mouse listeners stay `isDragging`-only) and `touchcancel` added for OS-interrupted gestures. Pinch routed through the **same transient-scale model** as wheel: drive `transientScale` (= `newZoom/startZoom`) + pan on the compositor during the gesture, commit `canvasState.zoom` on `touchend` (no debounce — touch has a native gesture-end). Compare mode (`hideZoomControls`) keeps its per-event commit for pane lockstep. Pins stay constant-size via the existing `CanvasScaleProvider` counter-scale.
- **Why not JSX `onTouchMove`** (the other option considered): React registers `touchmove` as a **passive** listener, so the handler's `event.preventDefault()` (blocks native browser pinch/scroll) would no-op. Kept the native `{ passive: false }` listener in the effect.
- `startPan` left on committed `canvasState.pan` (not live `visualPan`) to stay consistent with the `!isDragging` sync effect; no-op 2-finger taps skip the commit (matches prior behavior).
- Verified: `tsc --noEmit` clean, `eslint` 0 issues on the file (Node 22). **Live multi-touch verification still pending** — needs the running app + a seeded image attachment; Playwright multi-touch pinch emulation is unreliable, so a real touchscreen/tablet pass is the recommended check. Updated [[concepts/annotations-canvas-performance]] (moved the bug from Known issues → Fixed; documented the pinch path).

## [2026-06-15] ui | projects detail — Recent Activity moved to header-triggered drawer

- **Problem:** `ProjectActivityFeed` was pinned full-width at the bottom of [project-detail-screen.tsx](../../src/features/projects/screens/project-detail-screen.tsx), below a potentially long issues list, so it was buried. User chose a collapsible drawer over a sidebar/tabs.
- **Change:** Activity now opens in a right-side `Sheet` triggered by an "Activity" button (`RiHistoryLine`) in the header action row, rendered inside [project-actions.tsx](../../src/features/projects/components/project-actions.tsx). New self-contained [project-activity-drawer.tsx](../../src/features/projects/components/project-activity-drawer.tsx) (owns open state, needs only `projectId`) — no render-prop plumbing through the screen/header, unlike the issue/member/settings dialogs (those need screen-owned form state; activity does not).
- **Refactor:** [project-detail-activity-feed.tsx](../../src/features/projects/components/project-detail-activity-feed.tsx) split into `ProjectActivityList` (bare loading/empty/list, no Card) + `ProjectActivityFeed` (thin Card wrapper kept for the existing test + barrel export). Drawer renders the bare list inside a `ScrollArea`; the `Sheet` owns the "Recent Activity" title (no double-title / card-in-sheet).
- Trigger is unconditional (any project viewer, archived or not) → preserves prior visibility; no access-control change.
- Verified (Node 22): `tsc --noEmit` clean, eslint 0 issues on touched files, `project-detail-activity-feed` suite 3/3. Live visual pass not yet run.

## [2026-06-15] ui | projects activity drawer — moved to More menu + paginated (25/page, load more)

- Follow-up to the activity-drawer entry above, after user testing. Two changes:
- **Trigger relocated:** the standalone header "Activity" button is gone; activity now opens from an "Activity" item (`RiHistoryLine`) in the "More actions" dropdown ([project-actions.tsx](../../src/features/projects/components/project-actions.tsx)), placed in the top/view group next to Members. `ProjectActivityDrawer` is now **controlled** (`open`/`onOpenChange`) instead of self-triggering. **Consequence:** the dropdown only renders when `hasSecondaryActions` (i.e. members), so public **non-members no longer reach the activity log** — acceptable since activity is membership-oriented; revisit if non-member access is wanted.
- **Pagination (25/page, "Load more"):** completed the half-built server pagination. The service ([activity-service.ts](../../src/server/projects/activity-service.ts)) already supported `page`/`limit` (default 20, max 100) but the route called it with no args and **stripped the pagination metadata**. Route now reads `?page`/`?limit` and returns `{ activities, pagination: { page, limit, total, totalPages, hasMore } }` (additive). Client caller `getProjectActivities(projectId, { page, limit })` builds the query string. New `useProjectActivitiesInfinite` hook (`useInfiniteQuery`, pageSize 25) flattens + **de-dupes pages by id** (offset pagination can re-include a shifted row). Response schema gained an optional `pagination` field — kept optional so the legacy `useProjectActivities` parse and its test stay green.
- **Component split:** [project-detail-activity-feed.tsx](../../src/features/projects/components/project-detail-activity-feed.tsx) now exports `ProjectActivitySkeleton` / `ProjectActivityEmpty` / `ProjectActivityItems` (pure) reused by both the Card feed and the drawer. Drawer gates its skeleton on `isPending` (not `isLoading`) to avoid an empty-state flash on first open.
- **Test gotcha:** the drawer's data-fetching body is a child of `SheetContent`, so the `useInfiniteQuery` call only mounts when the sheet opens. This keeps `ProjectActions` renderable without a `QueryClientProvider` (its test mocks only `useJoinProject`) and preserves the sheet's slide-out animation. New [project-activity-drawer.test.tsx](../../src/features/projects/components/__tests__/project-activity-drawer.test.tsx) mocks the hook (local `ResizeObserver` polyfill for Radix ScrollArea).
- Verified (Node 22): `tsc` clean, eslint 0 issues, projects component tests 27/27 (5 new). Live visual pass of load-more not yet run.

## [2026-06-15] fix | activity drawer stuck loading — count(*) bigint serialized as string

- **Symptom:** after wiring activity pagination, the drawer was stuck on the loading skeleton (then fell through to a misleading empty state).
- **Root cause:** the new route response sends `pagination.total` across the Zod boundary for the first time. `getProjectActivities` ([activity-service.ts](../../src/server/projects/activity-service.ts)) built `total` from `count(*) over()` with **no coercion** — and **postgres.js returns bigint/`int8` as a string** at runtime (the `sql<number>` annotation is a compile-time lie). So `total` was `"30"`, which `ProjectActivityPaginationSchema`'s `z.number()` rejected → `getProjectActivities` caller threw → React Query retried then errored → skeleton during retries, empty after. The bug was latent before because `total` was only used in `Math.ceil(total/limit)` (coerced by division) and never serialized.
- **Confirmation:** [team-service.ts](../../src/server/teams/team-service.ts) and [resource-limits.ts](../../src/server/teams/resource-limits.ts) already coerce the same `count(*)` with `parseInt(String(...count ?? '0'), 10)` — the codebase had already learned this; activity-service hadn't.
- **Fix (defense in depth):** (1) coerce at source — `total = parseInt(String(rows[0]?.totalCount ?? "0"), 10)`; (2) harden the boundary — `ProjectActivityPaginationSchema` numeric fields use `z.coerce.number()`; (3) the drawer now renders a real **error state** (`ProjectActivityError`) so a failed fetch never reads as "No recent activity" or perpetual loading.
- **Gotcha for future work:** any `sql<number>`count(*)`` result must be coerced before it crosses a typed/Zod boundary — postgres.js hands back a string. Tests using the PGlite test DB will NOT catch this (different driver), so server→schema parse paths need explicit coverage or boundary coercion.
- Verified (Node 22): `tsc` clean, eslint 0 issues, projects activity tests + activity-logging integration 32/32 (added an error-state test).

## [2026-06-16] fix | post-auth entry points honor the landing-view preference

- Four post-auth entry points hardcoded `/projects`, bypassing the `landing_view` cookie preference (reader/resolver in [landing-view.ts](../../src/server/preferences/landing-view.ts)). Now routed through the resolver:
  - **Server guards** ([sign-in/page.tsx](../../src/app/(public)/(auth)/sign-in/page.tsx), [sign-up/page.tsx](../../src/app/(public)/(auth)/sign-up/page.tsx)): the already-authenticated guard now does `getLandingView()` + `resolveLandingPath()` instead of `redirect("/projects")`, mirroring [app/page.tsx](../../src/app/page.tsx).
  - **OAuth defaults** ([social-login-buttons.tsx](../../src/features/auth/components/social-login-buttons.tsx), [use-sign-up.ts](../../src/features/auth/hooks/use-sign-up.ts)): default `callbackURL`/`redirectTo` changed `"/projects"` → `"/"` so the redirect routes through `app/page.tsx`, which resolves the cookie. An explicit invitation `callbackUrl` still takes precedence (deep-links preserved).
- **Non-obvious finding — the live OAuth path is `SocialLoginButtons`, not the hooks.** Both `useSignIn().handleOAuthSignIn` and `useSignUp().handleOAuthSignIn` are **dead code**: [sign-in-form.tsx](../../src/features/auth/components/sign-in-form.tsx) receives the handler as `onOAuthSignIn` then discards it (`_onOAuthSignIn`) and renders `<SocialLoginButtons redirectTo={callbackUrl}>`; [sign-up-form.tsx](../../src/features/auth/components/sign-up-form.tsx) never destructures it and renders `<SocialLoginButtons>` with **no** `redirectTo`. Consequence: the `invitation_callback_url` localStorage persistence inside those hooks never runs on the live OAuth path, so the "interacts with localStorage" concern doesn't apply to the live fix. Item 3 (`SocialLoginButtons` default) is the only change with live effect; the `use-sign-up.ts` change is consistency-only. Sign-up OAuth also never threads an invitation `callbackUrl` to `SocialLoginButtons` (pre-existing gap, left as-is).
- TDD: each change driven by a failing test first — new page-guard tests ([sign-in](../../src/app/(public)/(auth)/sign-in/page.test.tsx), [sign-up](../../src/app/(public)/(auth)/sign-up/page.test.tsx)) modeled on [page.test.tsx](../../src/app/page.test.tsx); new `callbackURL` assertions in [social-login-buttons.test.tsx](../../src/features/auth/components/__tests__/social-login-buttons.test.tsx); new [use-sign-up.test.tsx](../../src/features/auth/hooks/__tests__/use-sign-up.test.tsx).
- Verified (Node 22): `tsc --noEmit` clean; `src/features/auth` 37/37; `src/app/(public)/(auth)` 9/9.

## [2026-06-16] release | PR into develop (beta channel) for the activity-drawer + landing-view work

- Committed the activity-drawer/pagination and post-auth landing-view work and opened a PR `feature/perfermance-improve` → `develop`. Scoped re-verification before commit (Node 22): the 5 new/changed test files pass 28/28.
- **Version gotcha (semantic-release):** `develop` is the **beta** prerelease branch in [.releaserc.json](../../.releaserc.json) (`prerelease: "beta"`). On merge, `semantic-release` computes the version from conventional commits since the last tag `v0.9.3-beta.1` — and the range contains 5 unreleased `feat(preferences):` commits → a **minor** bump → next beta is **`0.10.0-beta.1`**, *not* `0.9.3-beta.2`. A patch-only range (no `feat`) would have produced `0.9.3-beta.2`. `package.json` / `cli/package.json` / `CHANGELOG.md` are owned by `@semantic-release/{npm,git,changelog}` — never hand-edit them; the release commit is `chore(release): <v> [skip ci]`.

## [2026-06-23] fix | prod login bounce — `__Secure-` session cookie not read
- Symptom: on deployed envs, both email + social login succeed (`[better-auth] Session created` in logs) but the browser lands back on `/sign-in`. Root cause: behind HTTPS better-auth prefixes its cookie `__Secure-better-auth.session_token`, but `src/server/auth/cookies.ts` `getSessionCookie()` only checked `session_token` / `better-auth.session_token`. The `/` gate (`app/page.tsx:12`) uses that helper → returns null → `redirect("/sign-in")`. Worked on localhost (HTTP, no prefix). `(protected)/layout.tsx` was unaffected (uses `auth.api.getSession()`).
- Fix: `getSessionCookie()` now also reads `__Secure-better-auth.session_token`; added regression test in `cookies.test.ts` (14/14 pass, Node 22).
- Deploy note: running image is pinned `ghcr.io/bykhd/ui-syncup:v0.9.3`; must rebuild/republish the tag + redeploy both composes to ship — autoDeploy won't pick up code changes against a fixed tag.
- Regression trigger pinned: bisected to v0.9.2→v0.9.3 commit `15b1696` (landing-view). `getSessionCookie()` was latently broken for the prod `__Secure-` cookie in BOTH versions; v0.9.2 dodged it by redirecting post-login to `/projects` (guarded by `(protected)/layout.tsx` → `getSession()`/`auth.api.getSession()`, which reads the prefixed cookie). v0.9.3 changed `callbackURL`/`redirectTo` to `/` to route through `app/page.tsx`'s landing-view resolver — which gates on the broken `getSessionCookie()`. Same for `sign-in`/`sign-up` "already authenticated" gates. The cookies.ts fix addresses the real root cause for all three gates.

## [2026-06-30] feat | inline-edit annotation description in thread panel
- Annotation `description` is now editable directly in `AnnotationThreadPanel`'s header (click-to-edit + hover pencil, ⌘/Ctrl+Enter saves, Esc cancels) instead of only via the canvas edit-mode popover (`useAnnotationEditState`).
- Persistence lives in `useAnnotationComments` (new `updateDescription`/`isUpdatingDescription`) — same optimistic cache + rollback pattern as comment mutations, hitting the existing `updateAnnotation(... { description })` API. The hook is now "annotation thread mutations", not strictly comments.
- Edit gate: `permissions.canEditAll || (permissions.canEdit && isOwn)` via `useAnnotationPermissions` (matches `annotation:update` RBAC), not the comment `isOwn`-only check. New `EditableDescription` subcomponent mirrors `CommentCard`'s edit block.
- Test: `use-annotation-comments.update-description.test.tsx` (optimistic patch + rollback, 2/2 pass, Node 22).

## [2026-06-30] refactor | extract EditableDescription; add inline edit to popover expanded view
- Extracted the thread-panel's inline description editor into shared `components/editable-description.tsx` (`size` variant: `default` panel / `compact` popover; Esc/⌘Enter `stopPropagation` so editing inside `AnnotationPopover` doesn't trip its document-level Esc-to-close).
- Wired it into `AnnotationPopover`'s `ExpandedContent` (preview stays read-only), gated by the same `permissions.canEditAll || (canEdit && isOwn)` rule. Note: the canvas already has a separate description editor (`annotated-attachment-view.tsx` → `useAnnotationEditState` + `AnnotationCommentInput`); the popover edit is an additional on-canvas affordance, not the only one.
- Dropped a prop→state sync `useEffect` (seed `value` on edit-start instead) — kills the `react-hooks/set-state-in-effect` warning.
- Test: `components/__tests__/editable-description.test.tsx` (read-only gate + save-guard: trims, skips unchanged). 3/3 pass; hook test still 2/2.

## [2026-06-30] feat | desktop comment edit/delete in annotation popover
- Gap found: `annotation-layer.tsx` mounts `AnnotationThreadPanel` (editable `CommentCard`) ONLY on mobile; desktop gets `AnnotationPopover`, whose `CommentItem` was read-only. So desktop had no way to edit/delete a comment. (The panel's desktop `border-l` branch exists but is never mounted — effectively dead.)
- Fix: made the popover's `CommentItem` author-gated editable (inline edit + delete icon buttons revealed on hover; Esc/⌘Enter `stopPropagation` so it doesn't trip the popover's Esc-to-close). Inline buttons (not a Radix dropdown) deliberately — a portaled menu would land outside `popoverRef` and trigger the click-outside close.
- Virtualized list (`useVirtualizer`, ≥10 comments) now uses `measureElement` so an expanded edit row isn't clipped by the fixed 72px estimate. Removed CommentItem's dead `style` prop.
- `ExpandedContent` pulls existing `updateComment`/`deleteComment` from `useAnnotationComments`; own-only gate (matches panel). Test: `annotation-popover-comment-item.test.tsx` (author gate + save-guard + delete), 4/4.
- Known redundancy (follow-up): inline-edit state logic now in 3 spots (CommentCard, EditableDescription, popover CommentItem) — a small `useInlineEdit` hook would DRY them; deferred to avoid churning shipped/tested components in a feature commit.
