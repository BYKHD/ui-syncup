# [0.4.0-beta.18](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.17...v0.4.0-beta.18) (2026-03-24)


### Bug Fixes

* dokploy setup api n gzta ([#100](https://github.com/BYKHD/ui-syncup/issues/100)) ([a11b29e](https://github.com/BYKHD/ui-syncup/commit/a11b29e9e10c3574f3e0ecd95e6072e9c7e1ebe7))

# [0.4.0-beta.17](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.16...v0.4.0-beta.17) (2026-03-24)


### Bug Fixes

* update from develop ([#96](https://github.com/BYKHD/ui-syncup/issues/96)) ([726a71f](https://github.com/BYKHD/ui-syncup/commit/726a71ff1712cc78bffd2c0569470ffa691f7a5a))

# [0.4.0-beta.16](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.15...v0.4.0-beta.16) (2026-03-23)


### Bug Fixes

* always use relative URLs in browser to fix Dokploy/self-hosted setup ([#98](https://github.com/BYKHD/ui-syncup/issues/98)) ([ac47727](https://github.com/BYKHD/ui-syncup/commit/ac477274689d9802ba8cc8d5f5031834da0d3e3b))

# [0.4.0-beta.15](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.14...v0.4.0-beta.15) (2026-03-23)


### Bug Fixes

* build relative API URLs in browser when base URL is undefined. ([#97](https://github.com/BYKHD/ui-syncup/issues/97)) ([a75dc75](https://github.com/BYKHD/ui-syncup/commit/a75dc75ebc587ed8662f75e712077cfc410928ea))

# [0.4.0-beta.14](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.13...v0.4.0-beta.14) (2026-03-23)


### Features

* health check page before setup ([#93](https://github.com/BYKHD/ui-syncup/issues/93)) ([3ad1b7c](https://github.com/BYKHD/ui-syncup/commit/3ad1b7c3d66945ced5d25601f7a2b11cc47bdb93))

# [0.4.0-beta.13](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.12...v0.4.0-beta.13) (2026-03-23)


### Bug Fixes

* Improve setup error detection for missing tables and clarify the corresponding UI message. ([#95](https://github.com/BYKHD/ui-syncup/issues/95)) ([1c0280f](https://github.com/BYKHD/ui-syncup/commit/1c0280f576f8e0fd685a67a69913ec6607b92858))

# [0.4.0-beta.12](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.11...v0.4.0-beta.12) (2026-03-23)


### Bug Fixes

* rewrite storage health check to use shared S3 clients ([#92](https://github.com/BYKHD/ui-syncup/issues/92)) ([6598d7f](https://github.com/BYKHD/ui-syncup/commit/6598d7f431607c4a3e869fc42e0cb1a3f379e529))

# [0.4.0-beta.11](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.10...v0.4.0-beta.11) (2026-03-23)


### Features

* implement admin setup wizard and overhaul docker orchestration ([5495c10](https://github.com/BYKHD/ui-syncup/commit/5495c10a329b97ca7030f52dd5bccab44960ab67))

# [0.4.0-beta.10](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.9...v0.4.0-beta.10) (2026-03-23)


### Features

* Upgrade PostgreSQL to v17, refine database SSL connection logic, and ensure email worker state persists across HMR. ([#91](https://github.com/BYKHD/ui-syncup/issues/91)) ([ca2112d](https://github.com/BYKHD/ui-syncup/commit/ca2112dc28b774e62a2994e8a8441b6e64dead16))

# [0.4.0-beta.9](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.8...v0.4.0-beta.9) (2026-03-23)


### Features

* Add a plan for a health check page and implement automated database migrations for local development. ([#90](https://github.com/BYKHD/ui-syncup/issues/90)) ([b527e54](https://github.com/BYKHD/ui-syncup/commit/b527e54c054b71268e2774913163d81c4036bea1))

# [0.4.0-beta.8](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.7...v0.4.0-beta.8) (2026-03-23)


### Features

* add standalone /health page ([#87](https://github.com/BYKHD/ui-syncup/issues/87)) ([81dbe4e](https://github.com/BYKHD/ui-syncup/commit/81dbe4e97ccb5a7883e085f5b100d69618cb0b6f))

# [0.4.0-beta.7](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.6...v0.4.0-beta.7) (2026-03-22)


### Bug Fixes

* trigger release ([a55c60c](https://github.com/BYKHD/ui-syncup/commit/a55c60c0a7f5ccf9c8a7c60c7742774d11ea3a4e))

# [0.4.0-beta.6](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.5...v0.4.0-beta.6) (2026-03-22)


### Bug Fixes

* trigger release ([e8a2c22](https://github.com/BYKHD/ui-syncup/commit/e8a2c226a72061f0b402eeec836330d83b1cf53f))

# [0.4.0-beta.5](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.4...v0.4.0-beta.5) (2026-03-22)


### Bug Fixes

* stop publishing root Next.js app to npm, rename CLI package, fix shebang, guard skip-ci ([e7a6c43](https://github.com/BYKHD/ui-syncup/commit/e7a6c4365d7add42ba787094a3f98c589ad355cf))

# [0.4.0-beta.4](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.3...v0.4.0-beta.4) (2026-03-22)


### Bug Fixes

* rename CLI package to ui-syncup-cli, add shebang banner, guard CI against skip-ci commits ([3e9ef29](https://github.com/BYKHD/ui-syncup/commit/3e9ef2970eae274752a5ed74eb9b88d424d60233))

# [0.4.0-beta.3](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.2...v0.4.0-beta.3) (2026-03-22)


### Bug Fixes

* skip CI pipeline on semantic-release back-commits ([418cdbb](https://github.com/BYKHD/ui-syncup/commit/418cdbb1e1b293bfb2adeb223c36d40b38f30868))

# [0.4.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2026-03-22)


### Bug Fixes

* Remove manual changelog update instructions from versioning guide. ([d9cf394](https://github.com/BYKHD/ui-syncup/commit/d9cf3949c9c4a6700a40c0a85b4c06759bde96db))
* update image version comment to include `:beta` pre-release option ([142181b](https://github.com/BYKHD/ui-syncup/commit/142181b693dc26ddd398732f929f3140ac9720c1))


### Features

* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))

# [0.4.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2026-03-22)


### Bug Fixes

* update image version comment to include `:beta` pre-release option ([142181b](https://github.com/BYKHD/ui-syncup/commit/142181b693dc26ddd398732f929f3140ac9720c1))


### Features

* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))

# [0.4.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2026-03-22)


### Features

* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))

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
