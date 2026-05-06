---
title: Concept — Architecture
type: concept
tags: [architecture, layout, layers]
last_updated: 2026-05-01
sources: [sources/steering-structure, sources/steering-tech, sources/feature-arch-loading]
---

# Architecture

Feature-first Next.js 16 (App Router) application. Code is organized by product domain, not technical type. Strict layer contracts keep features decoupled.

## Top-level dirs

```
src/
├── app/         # Next.js App Router (routing only — thin pages)
├── features/    # Feature modules (mini-packages)
├── components/  # ui/ (shadcn primitives) + shared/ (cross-feature widgets)
├── config/      # Single sources of truth (pure data) — roles, workflow, quotas
├── lib/         # App-wide utilities (api-client, query, env, redis, pg-listener…)
├── server/      # Server-only (auth, db, email, teams services)
├── mocks/       # Fixture data
├── hooks/       # Global hooks
├── providers/   # React context providers
├── styles/      # Global Tailwind imports
└── types/       # Global TS types

cli/             # Standalone npm package (CLI for self-host)
docs/            # Architecture docs (sources for the wiki)
drizzle/         # Database migrations
tests/           # E2E + integration tests
```

## Layered import rules

See [[concepts/import-rules]].

## Page pattern

Thin pages: read params/cookies → auth gate → light Zod → render one feature `Screen`. Pages own `loading.tsx`, `error.tsx`, `not-found.tsx`.

## Loading composition

Server prefetch → client wrapper (dynamic import) → container (loading owner) → presentational (pure render). See [[concepts/loading-patterns]].

## Real-time path

PostgreSQL `pg_notify` → `pg-listener` (Node) → Redis pub/sub → SSE stream → client. See [[concepts/realtime-sse]].

## Proxy

`src/proxy.ts` is the Next 16 replacement for `middleware.ts`. Last-resort HTTP boundary — auth redirects, headers, CORS preflight. Stateless. See [[concepts/proxy]].

## Related

- Concepts: [[concepts/feature-module-anatomy]], [[concepts/import-rules]], [[concepts/tech-stack]], [[concepts/loading-patterns]], [[concepts/realtime-sse]], [[concepts/proxy]]
- Sources: [[sources/steering-structure]], [[sources/steering-tech]]
