---
title: Wiki Log
type: log
last_updated: 2026-05-05
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
- Each page is a *map* into the codebase, not a re-derivation.

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
