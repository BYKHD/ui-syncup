---
title: Concept — Tech Stack
type: concept
tags: [tech, stack, dependencies]
last_updated: 2026-05-01
sources: [sources/steering-tech]
---

# Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19.2, TypeScript 5 |
| Runtime | Node 20 LTS, Bun (package manager) |
| UI | shadcn/ui + Radix, Tailwind CSS 4, Framer Motion, Lucide + Remix Icons, `next-themes` |
| Data | TanStack Query 5 (primary), SWR (some features), Zod, SSE for real-time |
| Forms | React Hook Form + `@hookform/resolvers` |
| Database | PostgreSQL 15 + Drizzle ORM; PGlite (in-process WASM) for tests |
| Storage | S3-compatible single-bucket — see [[concepts/storage]] |
| Auth | `better-auth`, `@node-rs/argon2`, optional `ioredis` |
| Email | Resend + React Email templates |
| Testing | Vitest, Testing Library, Playwright, fast-check |
| Build (CLI) | `tsup` — see [[concepts/cli-package]] |
| Lint/Format | ESLint 9, Prettier |

## Architectural defaults

- Server components by default; `'use client'` only when needed.
- Validate every network boundary with Zod.
- httpOnly cookies for sessions/tokens — never `localStorage`.
- Use `lib/logger` and `lib/performance` for instrumentation.

## Common commands

```bash
bun dev                # Dev server
bun build              # Production build
bun typecheck          # TS check
bun lint               # ESLint
bun run test           # Unit (Vitest)  ← always `bun run`, never `bun test`
bun run test:ui        # E2E (Playwright)
bun run db:generate    # Drizzle migrations
bun run db:migrate     # Apply migrations
bun run db:studio      # Drizzle Studio
bun run validate-env   # Env Zod check
```

## Test rule

> [!important] Test runner
> Use `bun run test` (Vitest), **not** `bun test` (Bun's native runner — ignores test config and can corrupt the local DB). [[sources/steering-tech]]

## Related

- Concepts: [[concepts/storage]], [[concepts/realtime-sse]], [[concepts/cli-package]], [[concepts/testing]]
- Sources: [[sources/steering-tech]]
