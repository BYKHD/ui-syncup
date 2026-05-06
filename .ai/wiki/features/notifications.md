---
title: Feature — notifications
type: feature
tags: [feature, notifications, sse, realtime]
last_updated: 2026-05-01
sources: [sources/feature-arch-notifications, sources/steering-tech]
---

# Feature: `notifications`

Real-time in-app notifications via SSE with polling fallback. Headless feature — no `screens/` or `components/` directories; UI surfaces live in shared headers/sidebar.

## API

`get-notifications`, `get-unread-count`, `mark-as-read`, `mark-all-as-read`, `delete-notification`.

## Hooks

- `use-notifications` — list query
- `use-unread-count` — badge query
- `use-notification-subscription` — `EventSource` connection to `/api/notifications/stream`
- `use-notification-toast` — toast on receive
- `use-mark-as-read`, `use-mark-all-as-read`, `use-delete-notification`

## Server-side

`/api/notifications/stream` (SSE), `src/lib/pg-listener.ts` (Postgres LISTEN), `src/lib/redis.ts` (pub/sub fan-out).

## Architecture

Action → service → DB insert → `pg_notify` → `pg-listener` → Redis publish → SSE → client toast + badge. Fire-and-forget, deduped, actor-excluded. See [[sources/feature-arch-notifications]] and [[concepts/realtime-sse]].

## Related

- Concepts: [[concepts/realtime-sse]], [[concepts/architecture]]
- Features: [[features/issues]], [[features/projects]], [[features/teams]] (all sources of notifications)
- Entities: [[entities/user]]
