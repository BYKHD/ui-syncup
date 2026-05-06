---
title: Concept — Rate Limiting
type: concept
tags: [rate-limiting, redis, auth, security]
last_updated: 2026-05-01
sources: [sources/feature-arch-rate-limit-reset, sources/steering-tech]
---

# Rate Limiting

Redis-backed rate limits on auth-sensitive endpoints. Implemented in `src/server/auth/rate-limiter.ts`.

## Default rules

| Action | Limit | Window | Key |
|---|---|---|---|
| Sign-in by IP | 5 | 1 min | `signin:ip:{ip}` |
| Sign-in by email | 3 | 15 min | `signin:email:{email}` |
| Password reset | 3 | 1 hr | `reset:email:{email}` |
| Sign-up by IP | 10 | 1 hr | `signup:ip:{ip}` |
| Team invite create | 10 | 1 hr | per team [[sources/feature-arch-invitations]] |
| Project invite create | 10 | 1 hr | per project [[sources/feature-arch-invitations]] |

## Dev reset paths

1. UI: `http://localhost:3000/dev/auth` → "Reset Rate Limits".
2. Shell: `./scripts/reset-rate-limit.sh [email]`.
3. API: `POST /api/auth/dev/reset-rate-limit` with optional `{key}`.

See [[sources/feature-arch-rate-limit-reset]] for full details.

## Without Redis

Rate limiting requires Redis. In a single-process self-host without Redis, rate-limit features degrade — the system continues to function but the protection is bypassed. Audit before exposing publicly.

## Related

- Features: [[features/auth]]
- Concepts: [[concepts/security]], [[concepts/realtime-sse]] (Redis is also used for SSE fan-out), [[concepts/deployment]]
