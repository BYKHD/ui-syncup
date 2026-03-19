# Plan: Open-Source Distribution & Self-Hosting Standards — Development-Ready Spec

## Context

UI SyncUp (v0.2.4, MIT) has a working Dockerfile and a Next.js app but lacks CI/CD, a production
compose file, a published CLI, and standard OSS community files. The goal is to reach industry parity
with tools like Coolify and Appwrite so anyone can self-host with a single command.

The previous plan (`cli/refactor-installation` branch) had a full CLI that was removed in commit
`9ebfca9` in favor of agent skills. This plan rebuilds a leaner CLI and adds all missing infrastructure.

---

## Finalized Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | CLI approach | Rebuild from scratch — lean: `init`, `upgrade`, `doctor` only |
| 2 | Self-host DB stack | Plain `postgres:15` + `redis:7` + `minio` (no Supabase in compose.yml) |
| 3 | Docker Hub namespace | `bykhd/ui-syncup` |
| 4 | Docs platform | Skip for now — keep existing `/docs` markdown |
| 5 | Health endpoint | Update existing `GET /api/health` to return `{ status, version, timestamp }` |
| 6 | Versioning | `semantic-release` with conventional commits (`feat:`, `fix:`, `chore:`, etc.) |
| 7 | CI typecheck command | `bun run typecheck` (confirmed: `tsc --noEmit` in root `package.json`) |
| 8 | Default compose profile strategy | No profiles = no bundled services; all infrastructure is opt-in via `--profile` flags. Default stack = `app` container only (fully external mode). |
| 9 | Bundled service profiles | `--profile db` → postgres · `--profile cache` → redis · `--profile storage` → minio + minio-init. All three profiles active = all-in-one bundle. |

---

## Constraints

- Docker image must support `linux/amd64` AND `linux/arm64` (Mac M-series + standard servers)
- CI workflows must never log secrets (`--no-progress` flags, masked env vars)
- `install.sh` must be idempotent — safe to re-run on an existing installation
- `docker/compose.yml` must work without any Supabase cloud dependency
- CLI must work with Node ≥ 20 (no Bun required for end users)
- npm package name `ui-syncup` — must verify availability before publishing

---

## Non-Functional Requirements

- `GET /api/health` responds in < 100ms under normal load
- `docker compose -f docker/compose.yml up -d` brings all services to healthy state in < 60s
- CI run (lint + typecheck + test + Docker smoke) completes in < 10 minutes
- `install.sh` completes end-to-end in < 5 minutes on a fresh Ubuntu 22.04 server
- Docker image final layer size < 500MB (multi-stage build already in place)

---

## Environment Variables Catalog (docker/compose.yml)

All variables sourced from existing `.env.example`. Self-hosted compose uses PostgreSQL, not Supabase.

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL pooled connection — points to `postgres` service (bundled) or external host (Supabase, Neon, etc.) |
| `DIRECT_URL` | PostgreSQL non-pooled (for Prisma migrations) — same options as `DATABASE_URL` |
| `REDIS_URL` | Redis connection string — points to `redis` service (bundled) or external host (Upstash, Redis Cloud, etc.) |
| `BETTER_AUTH_SECRET` | Random string ≥ 32 chars |
| `BETTER_AUTH_URL` | Public URL of the app (e.g. `https://syncup.example.com`) |
| `NEXT_PUBLIC_APP_URL` | Same as above |
| `NEXT_PUBLIC_API_URL` | `${NEXT_PUBLIC_APP_URL}/api` |

### Storage (MinIO — optional profile, required if not using external S3)
| Variable | Default in compose |
|----------|-------------------|
| `STORAGE_ENDPOINT` | `http://minio:9000` |
| `STORAGE_REGION` | `us-east-1` |
| `MINIO_ROOT_USER` | Set in `.env` (e.g. `minioadmin`) — used by the `minio` service itself |
| `MINIO_ROOT_PASSWORD` | Set in `.env` (min 8 chars) — used by the `minio` service itself |
| `STORAGE_ACCESS_KEY_ID` | Set in `.env`; use the same value as `MINIO_ROOT_USER` |
| `STORAGE_SECRET_ACCESS_KEY` | Set in `.env`; use the same value as `MINIO_ROOT_PASSWORD` |
| `STORAGE_ATTACHMENTS_BUCKET` | `ui-syncup-attachments` |
| `STORAGE_ATTACHMENTS_PUBLIC_URL` | `${NEXT_PUBLIC_APP_URL}/storage/attachments` |
| `STORAGE_MEDIA_BUCKET` | `ui-syncup-media` |
| `STORAGE_MEDIA_PUBLIC_URL` | `${NEXT_PUBLIC_APP_URL}/storage/media` |

### Email (choose one)
| Variable | Notes |
|----------|-------|
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Cloud email |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM_EMAIL/SECURE` | Self-hosted SMTP |

### OAuth (all optional)
`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID`, `ATLASSIAN_CLIENT_ID/SECRET`

> **Removed from self-hosted compose**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
> (these remain in `.env.example` for cloud deployments only)

---

## Implementation Plan

### Phase 1 — Foundation (P1, unblocks everything)

#### Step 1: Repository Structure Cleanup
Establish clean layout before any new files are created.

```
/cli/                         ← new lean CLI package
/docker/
  compose.yml                 ← production all-in-one (NEW)
  compose.dev.yml             ← rename from docker-compose.override.yml
  compose.dev-minio.yml       ← rename from docker-compose.minio.yml
/.github/
  workflows/
    ci.yml                    ← NEW
    release.yml               ← NEW
  ISSUE_TEMPLATE/             ← NEW (Phase 3)
  PULL_REQUEST_TEMPLATE.md    ← NEW (Phase 3)
CHANGELOG.md                  ← auto-generated by semantic-release
CONTRIBUTING.md               ← NEW (Phase 3)
```

**Files to rename/move:**
- `docker-compose.override.yml` → `docker/compose.dev.yml`
- `docker-compose.minio.yml` → `docker/compose.dev-minio.yml`

**Acceptance criteria (EARS):**
- WHEN a developer clones the repo, THEN `docker/`, `.github/workflows/`, and `cli/` directories SHALL exist at the root level
- WHEN `docker-compose.minio.yml` is referenced in docs or scripts, THEN the reference SHALL be updated to `docker/compose.dev-minio.yml`

---

#### Step 2: `docker/compose.yml` — Production Self-Hosting

One-liner self-host target:
```bash
curl -fsSL https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml -o compose.yml
# edit .env
docker compose up -d
```

**Services:**
```yaml
services:
  app:        # ghcr.io/bykhd/ui-syncup or bykhd/ui-syncup image — always starts, no profile
  postgres:   # postgres:15-alpine, named volume, health check — profiles: ["db"]
  redis:      # redis:7-alpine, named volume, health check — profiles: ["cache"]
  minio:      # minio/minio — profiles: ["storage"]
  minio-init: # minio/mc — profiles: ["storage"] — creates buckets on first run
```

**Service Profile Matrix:**

| Profile flags | Containers started | Use case |
|---|---|---|
| _(none)_ | `app` only | Fully external — Supabase + Upstash + S3 + Resend |
| `--profile db` | `app` + `postgres` | Bundled DB, external cache/storage |
| `--profile cache` | `app` + `redis` | Bundled cache, external DB/storage |
| `--profile storage` | `app` + `minio` + `minio-init` | Bundled storage, external DB/cache |
| `--profile db --profile cache` | `app` + `postgres` + `redis` | Bundled DB + cache, external storage |
| `--profile db --profile cache --profile storage` | all services | All-in-one bundle (heaviest) |

> **Default is fully external.** Users opt into bundled services by activating profiles. This ensures the compose file is never heavier than needed.

**`app` container entrypoint (auto-migration):**
The `app` service SHALL use a startup wrapper that runs DB migrations before starting the application server — matching the Penpot pattern:
```yaml
# docker/compose.yml
services:
  app:
    command: >
      sh -c "bun run db:migrate && bun run start"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```
`depends_on` entries for `postgres` and `redis` are only relevant when those profiles are active. When running fully external (no profiles), the `app` service has no `depends_on` constraints and starts immediately — health checks for external services are the user's responsibility.

This means migrations run automatically on every `docker compose up -d` — no manual migration step is required after install or upgrade.

> **Migration failure behaviour:** If `bun run db:migrate` exits non-zero, the container exits immediately (before the app server starts). `docker compose up -d` will report the container as unhealthy/exited and the old version keeps running if it was already up. The full migration error is viewable via `docker compose logs app`.

**Acceptance criteria (EARS):**
- WHEN a user runs `docker compose -f docker/compose.yml up -d` with no profiles, THEN only the `app` service SHALL start — `postgres`, `redis`, and `minio` SHALL NOT be created
- WHEN a user runs `docker compose -f docker/compose.yml --profile db --profile cache --profile storage up -d`, THEN all services SHALL reach `healthy` status within 60 seconds
- WHEN `--profile db` is active, THEN `app` SHALL only start AFTER `postgres` passes its health check (`depends_on: condition: service_healthy`)
- WHEN `--profile cache` is active, THEN `app` SHALL only start AFTER `redis` passes its health check
- WHEN no db/cache profiles are active, THEN `app` SHALL start immediately with no `depends_on` constraints — external service availability is the user's responsibility
- WHEN `minio` profile is activated, THEN `ui-syncup-attachments` and `ui-syncup-media` buckets SHALL be created automatically by `minio-init`
- WHEN the `app` container starts, THEN `bun run db:migrate` SHALL run and complete successfully BEFORE the Next.js server begins accepting requests (regardless of whether DB is bundled or external)
- WHEN `bun run db:migrate` exits non-zero, THEN the `app` container SHALL exit immediately, the migration error SHALL be visible via `docker compose logs app`, and any previously running containers SHALL remain untouched
- WHEN a self-hoster runs the stack with no profiles, THEN NO bundled infrastructure SHALL be required — all services may be external

**Pattern reference:** Supabase `docker/docker-compose.yml` (health checks, named volumes, restart: always, explicit env var mapping from `.env`)

---

#### Step 3: GitHub Actions — CI Workflow (`.github/workflows/ci.yml`)

Triggers: push to `main`, all pull requests.

Jobs:
1. **lint** — `bun run lint`
2. **typecheck** — `bun run typecheck` (verified: `tsc --noEmit`)
3. **test** — `bun run test`
4. **docker-smoke** — build image, do NOT push (`push: false`)

**Acceptance criteria (EARS):**
- WHEN a PR is opened or updated, THEN all 4 CI jobs SHALL run and MUST pass before merge is allowed
- WHEN the Docker smoke build fails, THEN the CI run SHALL fail with the Docker build error output
- IF any CI step fails, THEN no secrets SHALL appear in the job logs

---

#### Step 4: GitHub Actions — Release Workflow (`.github/workflows/release.yml`)

Triggers: push of tag matching `v*.*.*`.

Jobs (in order):
1. **build-and-push** — Docker Buildx multi-arch (`linux/amd64,linux/arm64`)
   - Push to GHCR: `ghcr.io/bykhd/ui-syncup:latest`, `:v0.2.4`, `:v0.2`, `:v0`
   - Push to Docker Hub: `bykhd/ui-syncup:latest`, `:v0.2.4`, `:v0.2`, `:v0`
2. **publish-cli** — `npm publish` from `cli/` directory
3. **create-release** — GitHub Release with auto-generated notes

**Required GitHub secrets to document:**
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- `NPM_TOKEN`
- `GITHUB_TOKEN` (automatic)

**Acceptance criteria (EARS):**
- WHEN a `v*.*.*` tag is pushed, THEN the Docker image SHALL be available on both GHCR and Docker Hub within 15 minutes
- WHEN the release workflow runs, THEN the image SHALL be built for BOTH `linux/amd64` AND `linux/arm64`
- WHEN the CLI publish step runs, THEN the npm package version SHALL match the git tag version

---

#### Step 5: Rebuild CLI (`/cli/`) — Lean Version

New standalone npm package. **Scope: 3 commands only** — `init`, `upgrade`, `doctor`.
(Previous 6-command CLI removed in commit `9ebfca9`; backup/restore and logs deferred to Phase 3.)

**Package structure:**
```
cli/
  package.json          ← name: "ui-syncup", bin: { "ui-syncup": "./dist/index.js" }
  tsup.config.ts        ← entry: index.ts, format: cjs, target: node20, bundle: true
  index.ts              ← commander entry point
  src/
    commands/
      init.ts           ← guided setup: downloads compose.yml + .env template, walks user through config
      upgrade.ts        ← docker pull latest image + run migrations
      doctor.ts         ← validate all required env vars + service health checks
    lib/
      docker.ts         ← docker compose helpers
      env.ts            ← .env validation logic
      ui.ts             ← terminal output (colors, spinners)
```

**`init` command behavior:**
1. Check Docker is installed and running
2. Download `docker/compose.yml` from latest release tag
3. Download `.env.example` as `.env`
4. Interactively prompt for required vars and service backends (see wizard flow below)
5. Write completed `.env` file with secure permissions (0600)
6. Run `docker compose up -d` with the constructed `--profile` flags

**`init` wizard flow (Step 4 detail):**

Prompts are presented in this order. Each answer sets env vars AND determines which `--profile` flags are passed to `docker compose up -d` in Step 6.

```
? What is the public URL of your app? (e.g. https://syncup.example.com)
  → sets BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL

? BETTER_AUTH_SECRET — auto-generate a secure 64-char hex string? [Y/n]
  → sets BETTER_AUTH_SECRET via crypto.randomBytes(32).toString('hex')

? Database backend
  ❯ Bundled PostgreSQL (recommended)     → adds --profile db, sets DATABASE_URL/DIRECT_URL to postgres service
    External (Supabase / Neon / other)   → prompts for connection strings, no --profile db

? Cache backend
  ❯ Bundled Redis (recommended)          → adds --profile cache, sets REDIS_URL=redis://redis:6379
    External (Upstash / Redis Cloud)     → prompts for REDIS_URL, no --profile cache

? Storage backend
  ❯ Bundled MinIO (recommended)          → adds --profile storage, sets STORAGE_ENDPOINT + MINIO_* vars
    External S3 (AWS / R2 / Backblaze)  → prompts for STORAGE_* vars, no --profile storage

? Email provider
  ❯ Resend                               → prompts for RESEND_API_KEY + RESEND_FROM_EMAIL
    SMTP (self-hosted)                   → prompts for SMTP_HOST/PORT/USER/PASSWORD/FROM_EMAIL/SECURE
    Skip for now                         → leaves email vars empty
```

Profile flags are constructed from wizard answers and stored in memory. The final `docker compose up -d` call in Step 6 appends them: e.g. `docker compose -f compose.yml --profile db --profile cache up -d`.

**`upgrade` command behavior:**
1. `docker compose pull`
2. `docker compose up -d --remove-orphans`

> Migrations are NOT run as a separate step here. They run automatically inside the `app` container entrypoint on startup (see Step 2). `upgrade` only needs to pull the new image and restart the stack.

**`doctor` command behavior:**
1. Check Docker daemon is running
2. Validate `.env` has all required variables (non-empty)
3. `curl /api/health` and report status
4. Check disk space ≥ 2GB

**Acceptance criteria (EARS):**
- WHEN a user runs `npx ui-syncup init` and selects all bundled services, THEN the stack SHALL start without manual file editing and SHALL pass `docker compose logs app` showing successful migrations
- WHEN a user runs `npx ui-syncup init` and selects all external services, THEN `docker compose up -d` SHALL be called with NO `--profile` flags and ONLY the `app` container SHALL start
- WHEN the wizard collects service selections, THEN the constructed `--profile` flags SHALL exactly match the selected bundled services and NO others
- WHEN `ui-syncup doctor` detects a missing required env var, THEN it SHALL name the variable and link to `https://github.com/BYKHD/ui-syncup/blob/main/.env.example`
- WHEN `ui-syncup upgrade` runs, THEN it SHALL NOT delete user data volumes
- WHEN `ui-syncup upgrade` completes, THEN migrations SHALL have been applied automatically via the `app` container entrypoint — no separate migration step is required
- WHEN the `app` container entrypoint migration exits non-zero after an upgrade, THEN the container SHALL exit immediately, `docker compose logs app` SHALL show the full migration error, and any still-running containers SHALL remain untouched
- IF `BETTER_AUTH_SECRET` is not set in `.env`, THEN `init` SHALL auto-generate a cryptographically secure 64-char hex string
- WHEN `init` is re-run on an existing install, THEN `.env` SHALL NOT be overwritten — only missing vars SHALL be printed
- WHEN the user selects "External" for database, THEN `init` SHALL validate that `DATABASE_URL` and `DIRECT_URL` are reachable before writing `.env` (connection test with timeout)

---

### Phase 2 — Distribution Polish (P2)

#### Step 6: Docker Hub Registration
- Create Docker Hub repo `bykhd/ui-syncup` (manual — cannot be automated)
- Wire Docker Hub credentials as GitHub Actions secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`)
- Write Docker Hub README pointing to docs
- Add Docker Hub + GHCR badges to root `README.md`

**Acceptance criteria:**
- WHEN `docker pull bykhd/ui-syncup` is run, THEN it SHALL pull the latest published image

---

#### Step 7: Refactor `install.sh`
Change from "clone repo + run CLI" to "download compose + walk through setup":

```bash
# New flow:
# 1. Download docker/compose.yml
# 2. Download .env.example as .env
# 3. Prompt for essential vars + service backend choices (same 4-question matrix as CLI wizard)
# 4. Construct COMPOSE_PROFILES from answers (e.g. "db,cache,storage")
# 5. docker compose up -d (with --profile flags matching selections)
```

`install.sh` mirrors the `init` wizard question flow for parity. Users who prefer `curl | bash` over `npx` get identical service-selection behaviour. The constructed profile flags are written to `.env` as `COMPOSE_PROFILES=db,cache` so that a subsequent `docker compose up -d` (without the script) respects the same profile choices automatically.

**Path B note (Coolify / Dokploy):** Users on PaaS platforms do NOT use `install.sh` or the CLI. They configure profiles and env vars through the platform's UI directly. The compose file's profile gates work identically — the platform passes `--profile` flags or sets `COMPOSE_PROFILES` in its environment config.

**Acceptance criteria (EARS):**
- WHEN `install.sh` is run a second time on an existing install, THEN it SHALL NOT overwrite an existing `.env` file
- WHEN `install.sh` is run on a system without Docker, THEN it SHALL print install instructions and exit with code 1
- WHEN `install.sh` completes successfully, THEN the app SHALL be reachable at the configured URL
- WHEN a user selects all external services, THEN `install.sh` SHALL call `docker compose up -d` with no `--profile` flags and SHALL set `COMPOSE_PROFILES=` (empty) in `.env`
- WHEN `COMPOSE_PROFILES` is set in `.env`, THEN a bare `docker compose up -d` (no explicit flags) SHALL activate the same profiles on subsequent runs

---

#### Step 8: `CHANGELOG.md` + Semantic Release
- Add `semantic-release` config (`.releaserc.json` or `package.json#release`)
- Plugins: `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/git`, `@semantic-release/github`
- **Note:** `@semantic-release/npm` is NOT used. CLI npm publishing is handled exclusively by the dedicated `publish-cli` job in `release.yml`, which runs from the `cli/` subdirectory. semantic-release only manages versioning, changelog, and the GitHub Release.
- Commit convention: `feat:` → minor bump, `fix:` → patch bump, `feat!:` / `BREAKING CHANGE:` → major bump

**Config snippet:**
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    "@semantic-release/git",
    "@semantic-release/github"
  ]
}
```

**Acceptance criteria:**
- WHEN a `feat:` commit is merged to `main`, THEN semantic-release SHALL bump the minor version and update `CHANGELOG.md`
- WHEN `CHANGELOG.md` is updated by semantic-release, THEN the changes SHALL be committed back to `main` automatically

---

#### Step 9: Update `GET /api/health`
File: `src/app/api/health/route.ts` (already exists — update only)

**Target response:**
```json
{ "status": "ok", "version": "0.2.4", "timestamp": "2026-03-19T12:00:00.000Z" }
```

Version is read from `package.json` at build time via direct import: `import pkg from '../../../package.json'`. No `next.config.js` changes required; this works natively with the Next.js App Router.

**Acceptance criteria (EARS):**
- WHEN `GET /api/health` is called, THEN it SHALL respond with HTTP 200 and a JSON body containing `status`, `version`, and `timestamp` fields
- WHEN `GET /api/health` is called, THEN it SHALL respond in < 100ms
- WHEN the app version changes, THEN the `version` field SHALL automatically reflect the new version without manual edits

---

### Phase 3 — Community & DX (P3)

#### Step 10: Community Files
- `CONTRIBUTING.md` — setup guide, PR process, commit conventions
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — vulnerability disclosure process
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

#### Step 11: CLI — Additional Commands (deferred)
- `ui-syncup logs` — tail app/db logs
- `ui-syncup backup` — pg_dump + storage export to `.tar.gz`
- `ui-syncup restore <file>` — restore from backup archive

> **Backup format decision needed before implementation:** tarball containing `pg_dump.sql` + `storage/` directory snapshot, saved to `./backups/ui-syncup-YYYY-MM-DD.tar.gz` by default.

---

### Phase 4 — Advanced (Post-v1.0)

- Step 12: Kubernetes / Helm chart
- Step 13: One-click deploys (Railway, Render, Fly.io)
- Step 14: Dedicated docs site (Mintlify — deferred by decision)

---

## Files to Create / Modify

| File | Action | Priority |
|------|--------|----------|
| `docker/compose.yml` | Create | P1 |
| `docker/compose.dev.yml` | Rename from `docker-compose.override.yml` | P1 |
| `docker/compose.dev-minio.yml` | Rename from `docker-compose.minio.yml` | P1 |
| `.github/workflows/ci.yml` | Create | P1 |
| `.github/workflows/release.yml` | Create | P1 |
| `cli/package.json` | Create | P1 |
| `cli/tsup.config.ts` | Create | P1 |
| `cli/index.ts` + `cli/src/commands/` | Create | P1 |
| `src/app/api/health/route.ts` | Update (already exists) | P1 |
| `install.sh` | Refactor | P2 |
| `CHANGELOG.md` | Auto-generated by semantic-release | P2 |
| `.releaserc.json` | Create | P2 |
| `CONTRIBUTING.md` | Create | P3 |
| `CODE_OF_CONDUCT.md` | Create | P3 |
| `SECURITY.md` | Create | P3 |
| `.github/ISSUE_TEMPLATE/` | Create | P3 |

---

## Edge Cases & Failure Modes

| Scenario | Handling |
|----------|----------|
| Docker Hub unavailable during release | GHCR push still succeeds; Docker Hub push fails the job but does not block GitHub Release |
| `linux/arm64` build fails in Buildx | Fail the release workflow; do not publish a partial multi-arch manifest |
| `ui-syncup` npm name already taken | Fallback name: `@bykhd/ui-syncup` (scoped). Must check before publishing. |
| `.env` exists when `init` is re-run | Skip overwrite, print diff of missing vars only |
| `db:migrate` exits non-zero on container start | The `app` container exits immediately before the server starts; `docker compose logs app` shows the full error; running containers are NOT stopped — user re-runs `docker compose up -d` after fixing the issue |
| postgres health check times out in compose | `app` service will not start (when `--profile db` active); user sees clear depends_on failure message |
| CI `bun run test` fails | Block PR merge; no release can be triggered |
| User selects external DB but supplies invalid `DATABASE_URL` | `init` runs a connection test before writing `.env`; prints error and re-prompts. `install.sh` prints error and exits with code 1 |
| User activates `--profile db` but `DATABASE_URL` points to external host | Bundled postgres starts but app connects elsewhere — `doctor` warns if `DATABASE_URL` host does not match `postgres` service name when `--profile db` is detected |
| User switches from bundled to external DB after data exists | Not handled by CLI — user must migrate data manually; `doctor` warns if postgres volume exists but `--profile db` is not active |
| External Redis (Upstash) unreachable at startup | App starts (no `depends_on` constraint for external services) but auth/session features fail at runtime; `doctor` surfaces this via `REDIS_URL` ping check |
| `COMPOSE_PROFILES` not set and no `--profile` flags | Only `app` starts — correct fully-external behaviour; no error |

---

## Verification Checklist

**Core stack**
1. `npx ui-syncup init` (all bundled) — completes setup on a fresh Ubuntu 22.04 server; all 3 profiles active; stack healthy within 60s
2. `npx ui-syncup init` (all external) — no `--profile` flags passed; only `app` container starts; `DATABASE_URL`/`REDIS_URL`/`STORAGE_*` point to external services
3. `curl -fsSL .../install.sh | bash` — same 4-question wizard; full stack end-to-end
4. `docker compose -f docker/compose.yml up -d` (no flags) — ONLY `app` starts; postgres/redis/minio containers are NOT created
5. `docker compose -f docker/compose.yml --profile db --profile cache --profile storage up -d` — all services healthy within 60s
6. `docker compose logs app` — shows `bun run db:migrate` completing successfully before Next.js starts accepting requests

**Profile matrix spot-checks**
7. `--profile db` only — `app` + `postgres` start; `redis` and `minio` do NOT start; app uses `REDIS_URL` from env for external cache
8. `--profile storage` only — `app` + `minio` + `minio-init` start; postgres and redis do NOT start
9. `COMPOSE_PROFILES=db,cache` set in `.env`, bare `docker compose up -d` — activates db + cache profiles automatically; minio does NOT start

**Health & tooling**
10. `curl http://localhost:3000/api/health` → `{ "status": "ok", "version": "...", "timestamp": "..." }`
11. `ui-syncup doctor` — reports all configured services healthy; flags missing env vars by name with link to `.env.example`
12. `ui-syncup doctor` (external Redis unreachable) — reports ping failure with `REDIS_URL` value shown (masked)

**CI/CD**
13. GitHub Actions CI — passes on a test PR (lint + typecheck + test + docker smoke)
14. Release workflow — on tag push: Docker image appears on both GHCR and Docker Hub with correct arch tags
15. `docker pull bykhd/ui-syncup` — succeeds and pulls `linux/arm64` on M-series Mac
16. `npm info ui-syncup` — shows latest published version
17. `semantic-release --dry-run` — correctly identifies version bump from commit log

**Failure modes**
18. Migration failure test — intentionally break a migration; verify `app` container exits before server starts and `docker compose logs app` shows the error
19. External DB connection test — supply invalid `DATABASE_URL` in `init`; verify wizard re-prompts before writing `.env`
