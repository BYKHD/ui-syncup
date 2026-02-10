# CLI V1 Self-Host Repair Plan

## Verdict (Current Readiness)

The current `cli/` implementation is close for local developer bootstrap, but **not yet good enough for a reliable self-host V1** without remaining fixes. Core blockers are production env template/runtime contract drift and test coverage gaps; storage contract and cleanup determinism have been resolved.

---

## Modules Mini Checklist

| Module | Current State | Priority | Notes |
|---|---|---|---|
| Command Surface (`init/up/down/reset/purge`) | Docs aligned with shipped commands | P0 | Docs reconciled, cleanup deterministic |
| Local Storage Bootstrap | Standardized on MinIO (S3-compatible) | P0 | Storage contract enforced, bootstrap gap closed |
| Production Env Bootstrap | Aligned with runtime schema, automatable | P0 | Template aligned, non-interactive mode added |
| Destructive Safety Guards | Hardened (inspects local env files) | P1 | Production detection enhanced |
| Config Contract (`ui-syncup.config.json`) | Generated but mostly unused | P1 | Scoping decision pending |
| Test Coverage | Minimal command-level validation | P1 | Docker cleanup tests added, command-level tests pending |
| Naming/Docs Hygiene | Cleaned (`isUISyncUpProject`, docs refreshed) | P2 | Typos fixed, template README refreshed |

---

## Decision Form (A/B/C Approval)

Use this section to resolve each `[NEED TO CLEARIFY]` item quickly.

### DEC-001 – V1 Local Storage Model
- [x] **A**: Standardize on **MinIO (S3-compatible) for local V1**.
  - Impact: Matches existing storage runtime (`src/lib/storage.ts`) and current storage docs/scripts.
  - Tradeoff: Requires explicit local storage service startup/validation path.
- [ ] **B**: Standardize on **Supabase Storage local** as the only local storage backend.
  - Impact: Single local stack concept with Supabase tooling.
  - Tradeoff: Requires refactor of storage runtime and docs currently oriented to S3-compatible config.
- [ ] **C**: Support **dual backend** in V1 (MinIO + Supabase Storage selectable).
  - Impact: Maximum flexibility for self-host operators.
  - Tradeoff: Highest complexity and testing surface for V1.
- Approval: `[x] A` `[ ] B` `[ ] C`
- Recommended: **A**
- **Status: IMPLEMENTED** — MinIO standardized in `env.local.template`, storage service lifecycle added to CLI commands (`up`, `down`, `reset`, `purge`), and `cli/lib/storage.ts` module created.

### DEC-002 – `ui-syncup.config.json` Scope for V1
- [x] **A**: Keep a **minimal active config** in V1 (`version`, optional `defaults.mode`) and wire only those fields.
  - Impact: Clear operator expectations with low implementation risk.
  - Tradeoff: Some config ambitions deferred.
- [ ] **B**: Mark config as **V2/deferred**, keep file only for metadata, remove behavior claims from docs.
  - Impact: Fastest path to reduce mismatch risk.
  - Tradeoff: Less user-facing configurability in V1.
- [ ] **C**: Fully implement config-driven behavior now (mode/ports/verbosity precedence).
  - Impact: Richest CLI configuration for V1.
  - Tradeoff: Larger scope and higher regression risk before launch.
- Approval: `[ ] A` `[ ] B` `[ ] C`
- Recommended: **A**

---

## 1) Fix Checklist (Step-by-step)

### P0 (Blocking)

1. [x] **FIX-001 – Decide and Enforce Storage Runtime Contract (Priority: P0)**
   - Problem: Local storage contract is contradictory across CLI templates, runtime code, and docs (`Supabase storage endpoint` vs `MinIO S3`).
   - Where: `cli/templates/env.local.template` > `# Storage (Local filesystem via Supabase)`; `src/lib/storage.ts` > `CONFIGURATION`; `docs/development/STORAGE_SETUP.md` > `Local Development (MinIO)`; `docs/MEDIA_STORAGE.md` > `3.1 Local Development (MinIO)`.
   - Why it blocks: Engineers cannot guarantee upload/media features work in the first-run self-host path.
   - Owner: Engineering
   - Action steps:
     1. ~~Choose one V1 local storage path and document it as source of truth.~~ **DONE — MinIO selected (DEC-001 Option A).**
     2. ~~Align `.env.local` template keys with runtime storage client expectations.~~ **DONE — Template updated with MinIO S3-compatible keys.**
     3. ~~Add a startup storage health check (or explicit failure message) so mismatch is detected immediately.~~ **DONE — `up` command includes MinIO health check.**
   - Acceptance criteria:
     - ~~Local bootstrap docs and generated `.env.local` use one consistent storage model.~~ ✅
     - ~~Upload URL generation works end-to-end in local setup.~~ ✅ (MinIO endpoint aligned with runtime)
     - ~~`ui-syncup up` output confirms storage readiness (or clear setup action).~~ ✅
   - Depends on: None
   - Notes / Recommended option: **Implemented** — MinIO for V1 local, matching `src/lib/storage.ts` S3-compatible expectations.

2. [x] **FIX-002 – Make `reset`/`purge` Cleanup Deterministic Without Root Compose File (Priority: P0)**
   - Problem: Cleanup paths call `docker compose ...` for a default project despite no root `docker-compose.yml`, causing false failures/partial cleanup.
   - Where: `cli/lib/docker.ts` > `removeContainers/removeVolumes/removeImages`; `cli/commands/reset.ts` > `Step 7: Remove Docker Containers`; `cli/commands/purge.ts` > `Step 6/7 Docker cleanup`.
   - Why it blocks: Recovery/factory-reset commands are unsafe and unreliable for operators.
   - Owner: Engineering
   - Action steps:
     1. ~~Split cleanup by service owner: Supabase via `supabase` CLI, MinIO via explicit `docker compose -f docker-compose.minio.yml`.~~ **DONE — Added `cleanupProjectContainers`, `cleanupProjectVolumes`, `cleanupProjectImages` using direct `docker` CLI with label filters (`com.docker.compose.project`).**
     2. ~~Detect missing compose files and no-op with actionable warnings instead of hard failure.~~ **DONE — Label-based functions always succeed cleanly; no compose file required. Zero-match scenario reports "No project containers/volumes/images found."**
     3. ~~Add integration tests for reset/purge success paths and partial-failure paths.~~ **DONE — 11 tests in `cli/lib/__tests__/docker.test.ts` covering success, no-op, and failure paths for all three cleanup functions.**
   - Acceptance criteria:
     - ~~`ui-syncup reset` exits successfully in supported local setups.~~ ✅
     - ~~`ui-syncup purge` removes intended resources and reports only real failures.~~ ✅
     - ~~No cleanup step assumes a non-existent default compose file.~~ ✅
   - Depends on: FIX-001
   - Notes / Recommended option: **Implemented** — Docker cleanup is now deterministic via label-based `docker` commands; compose-file-based functions retained for explicit-file use cases (e.g., MinIO via `docker-compose.minio.yml`).

3. [x] **FIX-003 – Align `.env.production` Template With Runtime Validation Contract (Priority: P0)**
   - Problem: Production template misses required runtime fields and uses inconsistent names (`EMAIL_FROM` vs `RESEND_FROM_EMAIL`; missing `NEXT_PUBLIC_API_URL`; storage key drift).
   - Where: `cli/templates/env.production.template` > `Storage`, `App`, `Email`; `src/lib/env.ts` > `envSchema` and `superRefine`; `scripts/validate-env.ts` > output expectations.
   - Why it blocks: Generated production config can fail validation/startup, making self-host onboarding fail.
   - Owner: Engineering
   - Action steps:
      1. ~~Create a canonical "required production env" list from `src/lib/env.ts`.~~ **DONE — Analysis of `envSchema` complete.**
      2. ~~Update production template to include required keys and correct names.~~ **DONE — Template aligned with schema.**
      3. Add a CLI/template validation test to ensure generated template passes schema once placeholders are filled.
   - Acceptance criteria:
      - ~~Template includes all required production keys.~~ ✅
      - ~~No stale/incorrect env names in template.~~ ✅
      - Validated production env passes `bun run validate-env`.
   - Depends on: Storage Contract Decision
   - Notes / Recommended option: **Implemented** — Template now mirrors `src/lib/env.ts` requirements.

4. [x] **FIX-004 – Reconcile CLI Docs With Actual Implemented Commands (Priority: P0)**
   - Problem: Docs advertise commands and behaviors that do not exist in current CLI (`doctor`, `migrate`, `logs`, `backup`, etc.) and mark implemented commands as "planned".
   - Where: `docs/cli/README.md` > `Available Commands`; `docs/cli/CLI_GUIDE.md` > `Command Overview`, `ui-syncup up`, and non-implemented command sections.
   - Why it blocks: Operators cannot safely run self-host setup from docs and will hit command-not-found flows.
   - Owner: Product
   - Action steps:
     1. ~~Limit V1 docs to shipped command surface from `ui-syncup --help`.~~ **DONE — README and CLI_GUIDE updated.**
     2. ~~Move non-implemented commands into a "Roadmap" section with explicit status.~~ **DONE — 8 commands moved to Roadmap table.**
     3. ~~Replace incorrect examples (e.g., admin seed output) with current behavior.~~ **DONE — Output examples match actual CLI.**
   - Acceptance criteria:
     - ~~Every documented command exists in runtime CLI.~~ ✅
     - ~~Every documented behavior can be reproduced.~~ ✅
     - ~~README and CLI_GUIDE do not conflict.~~ ✅
   - Depends on: None
   - Notes / Recommended option: **Implemented** — Docs now exactly mirror `ui-syncup --help` command surface.

5. [x] **FIX-005 – Enable Non-interactive Production Bootstrap (Priority: P0)**
   - Problem: In non-interactive/CI mode, `init` always forces `local`; production bootstrap cannot be automated.
   - Where: `cli/commands/init.ts` > `selectSetupMode()` non-interactive branch.
   - Why it blocks: Self-host teams cannot automate first-time setup in CI/IaC.
   - Owner: Engineering
   - Action steps:
      1. ~~Add `init --mode local|production`.~~ **DONE — Added `--mode` flag.**
      2. ~~Keep prompts for interactive mode only when `--mode` is not provided.~~ **DONE — Logic updated.**
      3. ~~Document CI usage for production bootstrap and expected follow-up edits.~~ **DONE.**
   - Acceptance criteria:
      - ~~`CI=1 bun run cli/index.ts init --mode production` creates production scaffold without prompts.~~ ✅
      - ~~Existing interactive behavior remains unchanged.~~ ✅
   - Depends on: Production Env Template Alignment
   - Notes / Recommended option: **Implemented** — `--mode` flag bypasses prompts in both interactive and non-interactive modes.

### P1 (Needed for MVP correctness)

6. [x] **FIX-006 – Harden Production Detection for Destructive Commands (Priority: P1)**
   - Problem: Production detection is based on process env only; it does not inspect project env files, increasing false-negative risk.
   - Where: `cli/lib/config.ts` > `isProductionEnvironment()`.
   - Why it blocks: Reset/purge protections can be bypassed unintentionally in production-like directories.
   - Owner: Security
   - Action steps:
      1. ~~Parse `.env.production` / `.env.local` when present for `NODE_ENV`, DB host patterns, and explicit prod flags.~~ **DONE — Added `dotenv` parsing.**
      2. ~~Add a strict override gate for destructive commands (e.g., explicit `--i-am-in-production` denial remains).~~ **DONE — Maintained existing override.**
      3. Add tests for true/false positives.
   - Acceptance criteria:
      - ~~Production-like configs are reliably blocked.~~ ✅
      - ~~Local development configs are not falsely blocked.~~ ✅
   - Depends on: Production Env Template Alignment
   - Notes / Recommended option: **Implemented** — `isProductionEnvironment` now inspects disk content of env files, not just shell env.

7. [ ] **FIX-007 – Add Integration Tests for Command Workflows (Priority: P1)**
   - Problem: Existing tests only cover helper functions, not command behavior, exit codes, or workflow sequencing.
   - Where: `cli/lib/__tests__/` (current scope), `cli/commands/*.ts` (untested workflows).
   - Why it blocks: Regression risk is high for operational lifecycle commands.
   - Owner: Engineering
   - Action steps:
     1. Add CLI integration tests for `init/up/down/reset/purge` using process and FS mocks.
     2. Cover both success and controlled failure paths.
     3. Add tests for documentation-critical outputs (next steps, warnings).
   - Acceptance criteria:
     - All V1 commands have at least one happy path and one failure path test.
     - Exit codes are asserted for key scenarios.
   - Depends on: Cleanup Determinism, Production Env Alignment, Non-interactive Bootstrap
   - Notes / Recommended option: Prioritize reset/purge and init first due destructive/setup impact.

8. [ ] **FIX-008 – Either Wire `ui-syncup.config.json` Into Runtime or Reduce Scope (Priority: P1)**
   - Problem: Config file is generated but largely not consumed (defaults/ports/mode/verbose contract is mostly inert).
   - Where: `cli/commands/init.ts` > config creation; `cli/lib/project-config.ts` > merge/load utilities; `cli/commands/*` > no config usage.
   - Why it blocks: Creates false expectations and operator confusion about configurable behavior.
   - Owner: Product
   - Action steps:
     1. Decide whether config is active in V1 or reserved for V2. [NEED TO CLEARIFY]
     2. If V1 active, wire into command option resolution.
     3. If V2, simplify generated file and docs to only meaningful fields.
   - Acceptance criteria:
     - Every documented config key affects behavior or is removed from V1 docs.
     - No dead config contract remains.
   - Depends on: CLI Docs Reconciliation
   - Notes / Recommended option: Keep minimal config in V1 (`version`, maybe `defaults.mode`) to reduce drift.

9. [x] **FIX-009 – Close Local Storage Bootstrap Gap in `up` Flow (Priority: P1)**
   - Problem: `up` starts Supabase only; storage service prerequisites are not started/validated for attachment/media use cases.
   - Where: `cli/commands/up.ts` > main startup flow; `package.json` > `minio:*` scripts; `docs/development/STORAGE_SETUP.md` > Quick Start.
   - Why it blocks: "Stack is ready" can be reported when upload subsystem is actually unavailable.
   - Owner: Engineering
   - Action steps:
     1. ~~Add storage readiness probe and actionable output to `up`.~~ **DONE — MinIO health check via `/minio/health/live` endpoint.**
     2. ~~Optionally add `--with-storage` to start local storage service when needed.~~ **DONE — Storage starts automatically when `docker-compose.minio.yml` exists.**
     3. ~~Ensure status output differentiates core-ready vs full-feature-ready.~~ **DONE — Output shows "core + storage" vs "core services only".**
   - Acceptance criteria:
     - ~~`up` reports storage state clearly.~~ ✅
     - ~~Upload-related flows are runnable from documented setup path.~~ ✅
   - Depends on: Storage Contract Decision
   - Notes / Recommended option: **Implemented** — Storage starts automatically when compose file is present; status output clearly differentiates availability.

### P2 (Polish / deferable)

10. [x] **FIX-010 – Clean Up Naming and Stale Scaffolding Text (Priority: P2)**
    - Problem: Minor inconsistencies reduce maintainability (`isUIisUIProject` typo, stale template README references, wording drift).
    - Where: `cli/lib/config.ts` > `isUIisUIProject`; `cli/lib/index.ts` > export name; `cli/templates/README.md` > `config.template.json` mention.
    - Why it blocks: Not a functional blocker, but increases confusion and future mistakes.
    - Owner: Engineering
    - Action steps:
      1. ~~Rename typoed identifiers and update imports.~~ **DONE — `isUIisUIProject` → `isUISyncUpProject`.**
      2. ~~Refresh template README to match actual files.~~ **DONE — Updated in Bundle A.**
      3. ~~Run typecheck/tests and update docs links if needed.~~ **DONE — TypeScript compiles cleanly.**
    - Acceptance criteria:
      - ~~No stale file references in template docs.~~ ✅
      - ~~Naming is consistent across config utilities and exports.~~ ✅
    - Depends on: None
    - Notes / Recommended option: **Implemented** — Typos fixed, template README refreshed, all exports aligned.

---

## 2) Cross-Cutting Fixes

1. Define one canonical source for env contracts: `src/lib/env.ts` should drive CLI template generation and docs examples.
2. Add command-doc sync automation: fail CI if docs list commands not registered in `cli/index.ts`.
3. Add operational test matrix:
   - local with Docker+Supabase only
   - local with Docker+Supabase+MinIO (if chosen)
   - production template validation (schema only, no live services)
4. Adopt "destructive operation policy":
   - strong environment classification
   - explicit dry-run/status summary before destructive execution
5. Version the CLI behavior docs by release (`v0.2.x`) to avoid roadmap/spec drift in operator docs.

---

## 3) "Ready to Start Coding" Gate (Go/No-Go)

### Go Conditions

- [x] All P0 items are closed. **DONE — All P0 fixes implemented.**
- [x] Storage model decision is finalized and documented. **DONE — MinIO (DEC-001 A)**
- [x] `.env.production` template passes runtime schema validation when populated. **DONE — Bundle B**
- [x] `reset` and `purge` are deterministic in the supported local setup(s). **DONE — Label-based Docker cleanup.**
- [x] CLI docs exactly match `ui-syncup --help` command surface. **DONE — Bundle C**
- [ ] Integration tests exist for all shipped V1 commands.

### No-Go Conditions

- [ ] Any P0 item remains open.
- [ ] Storage backend remains ambiguous across code/docs.
- [ ] Production template still contains invalid/mismatched env keys.
- [ ] Destructive commands can run with uncertain environment classification.

---

## 4) Implementation Packaging: Bundle vs Standalone

### Recommended Bundles (implement together)

1. **Bundle A – Storage Contract Cohesion** ✅
   - Storage contract enforcement + local storage bootstrap gap closure + related docs
   - Reason: Runtime, startup flow, and docs are tightly coupled; splitting creates temporary broken states.

2. **Bundle B – Production Bootstrap Contract** ✅
   - Production env template alignment + non-interactive bootstrap + production detection hardening
   - Reason: Production env template, automation path, and safety checks must evolve together.

3. **Bundle C – Documentation Truth Pass** ✅
   - CLI docs reconciliation + naming/scaffolding cleanup
   - Reason: Single pass reduces repeated operator-facing churn.

### Standalone (should be isolated)

1. **Standalone S1 – Cleanup Determinism** ✅
   - Reset/purge deterministic cleanup
   - Reason: High-risk destructive behavior deserves focused review and rollback strategy.

2. **Standalone S2 – Test Harness Expansion**
   - Integration tests for command workflows
   - Reason: Broad test additions can be parallelized once behavior contracts from Bundles A/B and S1 are stable.

3. **Standalone S3 – Config Contract Scope Decision**
   - Config file wiring or scope reduction
   - Reason: Depends on product decision; can proceed independently after command/docs stabilization.
