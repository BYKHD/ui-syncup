# [0.4.0-beta.1](https://github.com/BYKHD/ui-syncup/compare/v0.3.14...v0.4.0-beta.1) (2026-03-21)


### Features

* Configure semantic-release for automated versioning with beta support from `develop` and temporarily disable the setup page redirect. ([6f00c0e](https://github.com/BYKHD/ui-syncup/commit/6f00c0e2a4a5134a5dd37b8c4e842deacf268da7))
* Enable setup completion check and redirect to sign-in page. ([8b28b90](https://github.com/BYKHD/ui-syncup/commit/8b28b9007598fd8288290b9707872608c1f52923))

# Changelog

All notable changes to this project will be documented in this file.

This file is maintained by [semantic-release](https://github.com/semantic-release/semantic-release).

---

## [0.3.0] - 2026-03-19

### Features

- **Docker-native self-hosting** — production `docker/compose.yml` with profile-gated bundled services (`--profile db`, `--profile cache`, `--profile storage`)
- **CLI package** (`ui-syncup` on npm) — three-command lifecycle: `init` (setup wizard), `upgrade` (pull + restart), `doctor` (health diagnostics)
- **One-command installer** — `install.sh` bash wizard, no Bun or Node required on the host
- **Multi-arch Docker images** — `linux/amd64` + `linux/arm64` published to GHCR (`ghcr.io/bykhd/ui-syncup`) and Docker Hub (`bykhd/ui-syncup`)
- **Automated releases** — semantic-release pipeline: CHANGELOG generation, GitHub release, npm CLI publish, Docker image tagging
- **CI pipeline** — lint, typecheck, and test jobs on every PR via GitHub Actions
- **Health endpoint** — `GET /api/health` returns `{ status, version, timestamp }`; `HEAD /api/health` for uptime checks
- **OSS community files** — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue templates, PR template

### Changes

- Dockerfile runner switched from `node:20-alpine` to `oven/bun:1-alpine` to support `bun run db:migrate` at container start
- `docker-compose.override.yml` → `docker/compose.dev.yml`
- `docker-compose.minio.yml` → `docker/compose.dev-minio.yml`
- CLI rebuilt as a standalone npm package (`cli/`) — removed old `up`, `down`, `reset`, `purge` commands

---
