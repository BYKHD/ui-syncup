---
title: Concept — Security
type: concept
tags: [security, csp, cors, headers, auth]
last_updated: 2026-05-01
sources: [sources/feature-arch-security, sources/feature-arch-rbac, sources/feature-arch-rate-limit-reset]
---

# Security

Multiple layers: CSP, CORS, security headers, HSTS, rate limiting, RBAC enforcement, Argon2 password hashing, httpOnly session cookies.

## Browser-facing layers

- **CSP** — `default-src 'self'`; `connect-src` allow-lists Supabase, R2, Google accounts; `frame-ancestors 'none'`; `upgrade-insecure-requests` in production.
- **CORS** — controlled per-origin in `src/lib/cors.ts`.
- **HSTS** — enforced in production.
- **Other headers** — defined in `src/lib/security-headers.ts`.

## Configuration sites

| File | Purpose |
|---|---|
| `next.config.ts` | Global headers on all routes |
| `src/proxy.ts` | Dynamic headers + CORS preflight |
| `src/lib/cors.ts` | CORS utilities for API routes |
| `src/lib/security-headers.ts` | Centralized header definitions |

## Server-side enforcement

- **RBAC** — every protected operation calls `requirePermission` / `requireRole`. See [[concepts/rbac-roles]].
- **Rate limiting** — Redis-backed; sign-in / sign-up / password-reset all rate-limited. See [[concepts/rate-limiting]].
- **Sessions** — httpOnly cookies via `better-auth` + `src/server/auth/cookies.ts`.
- **Passwords** — Argon2 (`@node-rs/argon2`).
- **Tokens** — invitation tokens stored as SHA-256 hashes only [[sources/feature-arch-invitations]].
- **Validation** — Zod at every network boundary.

## Dev exceptions

`'unsafe-eval'` in script CSP and `localhost` / `ws://localhost` in `connect-src` apply only in development.

## Related

- Concepts: [[concepts/rbac-roles]], [[concepts/rate-limiting]], [[concepts/proxy]], [[concepts/storage]]
- Sources: [[sources/feature-arch-security]], [[sources/feature-arch-rbac]], [[sources/feature-arch-invitations]]
