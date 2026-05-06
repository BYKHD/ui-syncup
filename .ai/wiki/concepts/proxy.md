---
title: Concept — Proxy (Next 16)
type: concept
tags: [proxy, middleware, next, http]
last_invariant: 2026-05-01
sources: [sources/steering-structure, sources/feature-arch-security]
---

# Proxy (Next 16)

Next.js 16 replaces `middleware.ts` with `src/proxy.ts`. The exported handler must be named `proxy`.

## Migration

Use the codemod if a legacy `middleware.ts` still exists:

```bash
npx @next/codemod@canary middleware-to-proxy
```

## Allowed responsibilities

- Read/modify request headers.
- Set response headers (security headers, CORS — see [[concepts/security]]).
- Quick auth redirects (e.g., unauthenticated → `/sign-in`).
- CORS preflight handling.

## Disallowed

- Feature logic — use App Router route handlers, rewrites, or server components instead.
- Heavy computation — proxy runs for every matching request; keep stateless and fast.

## Surfaces touching the proxy

- Auth-protected routes (`(protected)` group) — but the actual gate lives in `app/(protected)/layout.tsx`, not the proxy.
- Security headers (mostly via `next.config.ts`; dynamic ones via proxy).

## Related

- Concepts: [[concepts/security]], [[concepts/architecture]]
- Sources: [[sources/steering-structure]], [[sources/feature-arch-security]]
