---
title: Concept — Loading Patterns
type: concept
tags: [loading, ssr, performance, react-query]
last_updated: 2026-05-01
sources: [sources/feature-arch-loading]
---

# Loading Patterns

The canonical approach to loading states. Follow this for every new screen.

## Principles

1. **Single source of truth** — each screen has ONE loading-state owner.
2. **Server-first** — prefetch on the server when possible.
3. **Parallel fetching** — never wait for parent data you don't need.
4. **Preload on intent** — load components on hover/focus.
5. **Graceful degradation** — SSR failures fall back to client loading.

## Layered composition

```
Server component (prefetch + timeout-protected)
        ↓
Client wrapper (dynamic import, loading fallback) — prevents hydration mismatch
        ↓
Container component (loading owner — skeleton/spinner; uses initial data → React Query)
        ↓
Presentational component (pure render; no loading state; can preload on interaction)
```

## Initial-data pattern

Containers receive prefetched data as a prop. If absent, they fall back to React Query. Never run a parent-data query when the data was already fetched server-side.

## Example

[[features/issues]]'s `get-project-issues-server.ts` is a server-only fetcher (`api/` layer with no React) used by the page to prefetch issues; the client container reuses the result via React Query's initial-data mechanism.

## Related

- Concepts: [[concepts/architecture]], [[concepts/feature-module-anatomy]], [[concepts/import-rules]]
- Sources: [[sources/feature-arch-loading]]
