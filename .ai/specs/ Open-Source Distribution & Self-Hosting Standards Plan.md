# Plan: Open-Source Distribution & Self-Hosting Standards for UI SyncUp

## Context

UI SyncUp is MIT-licensed and already has a working Dockerfile and a CLI (currently being refactored on the `cli/refactor-installation` branch). The goal is to match or exceed the industry standard for open-source, self-hostable SaaS tools like Penpot, Cal.com, Coolify, Appwrite, and Supabase — making it trivially easy for anyone to self-host, while keeping cloud deployment seamless.

**Current gaps vs. industry standard:**
- No GitHub Actions CI/CD workflows
- No all-in-one `docker-compose.yml` for self-hosting (only dev overrides and minio-only)
- No Docker Hub publishing (only ghcr.io planned)
- No multi-arch Docker builds (only x86)
- CLI is not a published npm package (no `npx ui-syncup`)
- No `CHANGELOG.md`, `CONTRIBUTING.md`, issue/PR templates
- No dedicated documentation site
- No health check API endpoint

---

## Industry Standards Research Summary

| Aspect | Gold Standard | Best Example |
|--------|-------------|--------------|
| Install UX | `curl -fsSL .../install.sh \| bash` | Coolify, Dokploy |
| Container registry | Docker Hub (primary) + GHCR (secondary) | Appwrite, Supabase |
| Multi-arch | `linux/amd64` + `linux/arm64` via Docker Buildx | Appwrite, Coolify |
| CLI distribution | `npm install -g` + `npx` + install script | Appwrite, Dokploy |
| Versioning | Semantic-release (auto CHANGELOG + tags) | Coolify, Appwrite |
| Dev/prod Docker | `docker-compose.yml` (prod) + `docker-compose.override.yml` (dev) | Supabase |
| Docs | Dedicated domain (`docs.project.com`) + MDX | Supabase, Coolify |
| CI/CD | GitHub Actions: CI on PR, Release on tag | All major projects |

---

## Step-by-Step Implementation Plan

### Phase 1 — Foundation (Do First)

#### Step 1: Repository Structure Cleanup
**Goal:** Establish clean monorepo-style layout

- Move `/cli` → keep as `/cli` but treat it as an independent package (simpler than full monorepo for now)
- Add `/docker/` folder with deployment-focused compose files
- Rename confusing files: `docker-compose.minio.yml` → `docker/compose.dev-minio.yml`
- Create proper structure:
  ```
  /cli/                     ← standalone npm package
  /docker/
    compose.yml             ← production all-in-one (new)
    compose.dev.yml         ← local dev overrides (rename from override)
    compose.dev-minio.yml   ← MinIO-only dev helper
  /docs/                    ← keep existing docs
  /.github/
    workflows/
      ci.yml               ← new
      release.yml          ← new
    ISSUE_TEMPLATE/        ← new
    PULL_REQUEST_TEMPLATE.md ← new
  CHANGELOG.md             ← new (auto-generated)
  CONTRIBUTING.md          ← new
  ```

**Critical files to create/move:**
- `docker/compose.yml` (new)
- `.github/workflows/ci.yml` (new)
- `.github/workflows/release.yml` (new)

---

#### Step 2: All-in-One `docker/compose.yml` for Self-Hosting
**Goal:** One-liner self-host like Coolify/Supabase

The production compose file must include ALL required services so a user can run:
```bash
curl -fsSL https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml -o docker-compose.yml
# edit .env
docker compose up -d
```

**Services to include:**
- `app` — Next.js app (from ghcr.io or Docker Hub image)
- `postgres` — PostgreSQL 15 (with volume)
- `redis` — Redis 7 (for Better Auth sessions)
- `minio` — MinIO S3-compatible storage (optional profile)

**Pattern to follow:** Supabase `docker/docker-compose.yml` — includes health checks, named volumes, restart policies, explicit env var mapping.

---

#### Step 3: GitHub Actions CI/CD Workflows
**Goal:** Automated quality checks + image publishing

**`ci.yml`** — Runs on every PR and push to `main`:
- Lint (`bun run lint`)
- Typecheck (`bun run typecheck`)
- Unit tests (`bun run test`)
- Docker build smoke test (build but don't push)

**`release.yml`** — Runs on version tag push (`v*.*.*`):
- Build multi-arch Docker image (amd64 + arm64)
- Push to GHCR: `ghcr.io/bykhd/ui-syncup`
- Push to Docker Hub: `bykhd/ui-syncup` (need Docker Hub account)
- Publish CLI to npm: `npm publish` from `cli/` directory
- Create GitHub Release with auto-generated notes

---

#### Step 4: Multi-Arch Docker Builds
**Goal:** Support Mac M-series (arm64) and standard servers (amd64)

Update `Dockerfile` and release workflow to use:
```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
```

Tags strategy:
```
latest
v0.2.4
v0.2
v0
```

---

#### Step 5: Fix CLI as a Proper npm Package
**Goal:** Enable `npx ui-syncup init` — no global install required

The CLI was being refactored on the current branch. Key requirements:
- `cli/package.json` with `"bin": { "ui-syncup": "./dist/index.js" }`
- `cli/tsup.config.ts` — bundle to `cli/dist/` as CommonJS + ESM
- `cli/package.json` → `"files": ["dist"]` to exclude source from npm
- Published to npm as `ui-syncup` (check availability)
- Supports both `npx ui-syncup` (no install) and `npm install -g ui-syncup`
- Version synced with main app via shared version file or script

**Key files:**
- [cli/package.json](cli/package.json)
- [cli/tsup.config.ts](cli/tsup.config.ts)
- [cli/index.ts](cli/index.ts)

---

### Phase 2 — Distribution Polish

#### Step 6: Docker Hub Registration
- Create Docker Hub repo: `bykhd/ui-syncup` (or `uisyncup/app`)
- Set up automated push from GitHub Actions
- Write Docker Hub README (points to docs)
- Add Docker Hub badge to main README

#### Step 7: Update `install.sh` to Coolify Standard
Current `install.sh` clones the repo and runs the CLI. Better pattern:
```bash
# New pattern: download compose file + guide through .env setup
curl -fsSL https://raw.githubusercontent.com/BYKHD/ui-syncup/main/install.sh | bash
# Downloads docker/compose.yml + .env.example → walks through config → docker compose up
```

#### Step 8: Add `CHANGELOG.md` + Semantic Release
- Set up `semantic-release` with `@semantic-release/changelog`
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Auto-generates `CHANGELOG.md` on tag push
- Creates GitHub Release

#### Step 9: Add `/api/health` Endpoint
- New route: `src/app/api/health/route.ts`
- Returns `{ status: "ok", version: "0.2.4", timestamp: "..." }`
- Used by Docker health checks and monitoring tools

---

### Phase 3 — Developer Experience & Community

#### Step 10: Community Files
- `CONTRIBUTING.md` — Setup, PR process, commit conventions
- `CODE_OF_CONDUCT.md` — Contributor Covenant standard
- `.github/ISSUE_TEMPLATE/bug_report.yml` — Structured bug reports
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `SECURITY.md` — How to report vulnerabilities

#### Step 11: Dedicated Documentation Site
**Recommendation:** [Mintlify](https://mintlify.com) (used by Supabase, Resend, Loops)
- Fastest to set up, MDX-based, beautiful out of the box
- Alternative: Docusaurus (more control, requires hosting)
- Structure:
  ```
  /docs/
    quickstart.mdx
    self-hosting/
      docker.mdx
      cli.mdx
      environment-variables.mdx
      upgrade.mdx
    cloud/
      getting-started.mdx
    development/
      (existing docs migrated)
    api-reference/
      (auto-generated from routes)
  ```

#### Step 12: CLI Enhancement Commands
Add to existing CLI:
- `ui-syncup upgrade` — Pull latest Docker image + run migrations
- `ui-syncup doctor` — Check all required env vars, service health
- `ui-syncup logs` — Tail app/db logs
- `ui-syncup backup` — Dump PostgreSQL + export storage
- `ui-syncup restore <file>` — Restore from backup

---

### Phase 4 — Advanced (Post-v1.0)

#### Step 13: Kubernetes / Helm Chart
- Create `helm/` directory with basic chart
- Targets teams deploying to k8s
- Document in docs site

#### Step 14: One-Click Cloud Deployments
- "Deploy to Railway" button
- "Deploy to Render" button
- "Deploy to Fly.io" guide
- These are free for the project and bring significant discovery

---

## Priority Order (What to Do First)

```
MUST DO NOW (unblocks everything):
  1. Step 3 → GitHub Actions CI/CD (ci.yml + release.yml)
  2. Step 2 → All-in-one docker/compose.yml
  3. Step 5 → Fix CLI npm package (finish the current branch)
  4. Step 4 → Multi-arch Docker builds (part of release.yml)

DO NEXT (polish & distribution):
  5. Step 6 → Docker Hub registration
  6. Step 7 → Update install.sh
  7. Step 8 → CHANGELOG + semantic-release
  8. Step 9 → /api/health endpoint

DO AFTER (community):
  9. Step 10 → CONTRIBUTING, issue templates, etc.
  10. Step 11 → Mintlify docs site
  11. Step 12 → CLI upgrade/doctor/backup commands

DO LATER (v1.0+):
  12. Step 13 → Helm chart
  13. Step 14 → One-click deploys
```

---

## Critical Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `docker/compose.yml` | Create | P1 |
| `.github/workflows/ci.yml` | Create | P1 |
| `.github/workflows/release.yml` | Create | P1 |
| `cli/package.json` | Fix/update | P1 |
| `cli/tsup.config.ts` | Fix/update | P1 |
| `Dockerfile` | Add multi-arch labels | P1 |
| `src/app/api/health/route.ts` | Create | P2 |
| `install.sh` | Refactor | P2 |
| `CHANGELOG.md` | Create | P2 |
| `CONTRIBUTING.md` | Create | P3 |
| `.github/ISSUE_TEMPLATE/` | Create | P3 |

---

## Verification

After implementation, verify:
1. `npx ui-syncup init` — works without global install
2. `curl -fsSL .../install.sh | bash` — completes setup end-to-end
3. `docker compose -f docker/compose.yml up -d` — starts full stack
4. `curl http://localhost:3000/api/health` → `{ status: "ok" }`
5. GitHub Actions: CI passes on PR, release workflow publishes images on tag push
6. Docker Hub and GHCR both have the image with correct version tags
7. `npm info ui-syncup` shows latest version published
