---
title: Concept — Deployment
type: concept
tags: [deployment, self-host, docker, cli]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/steering-tech, sources/feature-arch-resource-limits, sources/feature-arch-storage]
---

# Deployment

UI SyncUp ships as both a Next.js app and a standalone CLI for self-hosting. MIT licensed.

## Modes

- **Self-host** — `ui-syncup` CLI (npm) + Docker Compose. Full data ownership.
- **Managed** — point env vars at managed services (Vercel + Neon + R2 etc.).

## Required services

| Service | Required? | Notes |
|---|---|---|
| PostgreSQL 15 | **Required** | Self-hosted, Neon, Supabase, any provider |
| Redis | Optional | Needed for rate limiting + SSE fan-out across processes — see [[concepts/rate-limiting]], [[concepts/realtime-sse]] |
| S3-compatible storage | Optional | MinIO / R2 / S3 / Lightsail — see [[concepts/storage]] |
| Email (Resend) | Optional | For invitations, password reset, notifications |

## Local dev stack

```bash
docker compose -f docker/compose.local.yml up -d   # Redis, MinIO, Mailpit
bun run supabase:start                              # Postgres
bun dev                                             # Next.js
```

Or point `DATABASE_URL`, `REDIS_URL`, `STORAGE_*` at managed services.

## Setup wizard

First boot launches the [[features/setup]] wizard: create admin, configure instance, create first team, run health checks.

## Team mode

`MULTI_TEAM_MODE=true` enables multi-tenancy UI; default is single-team — see [[sources/feature-arch-teams]].

## Quotas

Instance-wide limits via env vars — see [[concepts/quotas-and-plans]].

## CLI package

The `ui-syncup` CLI on npm bootstraps deployment — see [[concepts/cli-package]].

## Related

- Concepts: [[concepts/cli-package]], [[concepts/storage]], [[concepts/rate-limiting]], [[concepts/realtime-sse]], [[concepts/quotas-and-plans]]
- Features: [[features/setup]], [[features/health]], [[features/instance-settings]]
- Sources: [[sources/steering-product]], [[sources/steering-tech]]
