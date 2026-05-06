---
title: Concept — Real-time SSE
type: concept
tags: [sse, realtime, notifications, redis, postgres]
last_updated: 2026-05-01
sources: [sources/feature-arch-notifications, sources/steering-tech]
---

# Real-time via SSE

Push-based real-time delivery using Server-Sent Events backed by PostgreSQL `LISTEN/NOTIFY` and Redis pub/sub for multi-process fan-out.

## Pipeline

```
service.create() → INSERT notifications
                 → pg_notify('new_notification', payload)
                 → pg-listener (Node singleton)
                 → Redis PUBLISH
                 → SSE /api/notifications/stream
                 → client EventSource → toast + badge
```

## Properties

- **Fire-and-forget** — notification creation never blocks the triggering action; failures are logged.
- **Actor exclusion** — `shouldCreateNotification()` prevents users from notifying themselves.
- **Deduplication** — `isDuplicate()` collapses spam.
- **Polling fallback** — if SSE drops, the client polls `/api/notifications/unread-count` every 30 s.
- **Auth** — SSE stream is session-authenticated.

## Code locations

- `src/lib/pg-listener.ts` — Postgres `LISTEN` singleton.
- `src/lib/redis.ts` — lazy ioredis publisher/subscriber singletons.
- `src/features/notifications/hooks/use-notification-subscription.ts` — client `EventSource` hook.
- `src/app/api/notifications/stream/` — SSE route handler.

## Why Redis is optional but recommended

Without Redis, multi-process deployments can't fan out events between Next.js workers. A single-process deployment can run without it.

## Related

- Features: [[features/notifications]]
- Concepts: [[concepts/architecture]], [[concepts/deployment]]
- Sources: [[sources/feature-arch-notifications]]
