---
title: Source — .ai/steering/tech.md
type: source
tags: [source, steering, tech-stack]
last_updated: 2026-05-01
source_path: .ai/steering/tech.md
---

# Source: `.ai/steering/tech.md`

Steering doc defining the runtime, libraries, tooling, and CLI build pipeline. Canonical for *what's used and how to run it*.

## Key facts

- **Framework**: Next.js 16 (App Router), React 19.2, TypeScript 5, Node 20 LTS, Bun package manager.
- **UI**: shadcn/ui on Radix, Tailwind CSS 4, Framer Motion, Lucide + Remix Icons, `next-themes`.
- **Data**: TanStack Query 5 (primary), SWR (some features), Zod, SSE for real-time.
- **Forms**: React Hook Form + `@hookform/resolvers` (Zod).
- **DB**: PostgreSQL 15, Drizzle ORM, PGlite for tests.
- **Storage**: S3-compatible (MinIO / R2 / S3 / Lightsail), single-bucket model, AWS SDK v3, no CORS required.
- **Auth & security**: `better-auth`, `@node-rs/argon2`, optional `ioredis` for rate-limit + session + SSE fan-out.
- **Email**: Resend + React Email templates.
- **Testing**: Vitest, Testing Library, Playwright, fast-check, PGlite.
- **Test rule**: ALWAYS `bun run test`, NEVER `bun test` (Bun native runner can corrupt the local DB).
- **CLI package**: `cli/` is a standalone npm package built with `tsup`; `commander` is an external runtime dep due to dual ESM/CJS exports.
- **Path alias**: `@/*` → `./src/*`.
- **Env vars**: validated with Zod in `src/lib/env.ts`; `bun run validate-env` to check.
- **Local dev**: `docker compose -f docker/compose.local.yml up -d` for Redis/MinIO/Mailpit; Postgres via `bun run supabase:start`.
- **Architecture rules**: server components by default, Zod at every network boundary, httpOnly cookies (never localStorage), use `lib/logger` and `lib/performance` for instrumentation.

## Feeds into

- [[concepts/tech-stack]]
- [[concepts/cli-package]]
- [[concepts/storage]]
- [[concepts/realtime-sse]]
- [[concepts/testing]]
