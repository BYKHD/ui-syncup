---
title: Concept — Testing
type: concept
tags: [testing, vitest, playwright, pglite]
last_updated: 2026-05-01
sources: [sources/steering-tech, sources/steering-structure]
---

# Testing

| Layer | Tool | Location |
|---|---|---|
| Unit | Vitest + jsdom/happy-dom | Co-located `__tests__/` or `*.test.ts(x)` |
| Component | `@testing-library/react` | Same as unit |
| Integration (DB) | Vitest + PGlite via `src/lib/testing/test-db.ts` | Same as unit |
| E2E | Playwright | `tests/e2e/*.spec.ts` |
| Property-based | `fast-check` | `*.property.test.ts` |

## Test-runner rule

> [!important]
> **ALWAYS** use `bun run test` (Vitest). **NEVER** use `bun test` — Bun's native runner ignores test config and can corrupt the local DB. [[sources/steering-tech]]

## In-memory DB

Unit + integration tests use **PGlite** — an in-process WASM Postgres — so there's no external DB dependency for tests. Safe to run anywhere.

## E2E

Playwright runs against a local DB. `bun run test:ui`. Helpers in `tests/e2e/helpers/test-fixtures.ts`.

## Mocks

Mock fixtures live in `src/mocks/*.fixtures.ts` (one file per domain). Tied to the feature that consumes them — when a feature's Zod DTO changes, refresh the matching fixture.

## Related

- Concepts: [[concepts/tech-stack]], [[concepts/feature-module-anatomy]]
- Sources: [[sources/steering-tech]], [[sources/steering-structure]]
