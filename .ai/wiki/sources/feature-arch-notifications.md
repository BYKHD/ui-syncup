---
title: Source — docs/feature-architectures/NOTIFICATION_ARCHITECTURE.md
type: source
tags: [source, notifications, sse, realtime]
last_updated: 2026-05-05
original_path: docs/feature-architectures/NOTIFICATION_ARCHITECTURE.md
original_status: removed (canonical content in [[concepts/realtime-sse]])
---

# Source: `docs/feature-architectures/NOTIFICATION_ARCHITECTURE.md` *(original removed)*

> [!note]
> Original removed from the repo. **Canonical content lives in [[concepts/realtime-sse]].** This page exists only as provenance.

**Scope:** Push-based notification system — `pg_notify` → pg-listener → Redis pub/sub → SSE stream → client `EventSource`. Fire-and-forget creation, actor exclusion, deduplication, polling fallback.

## Feeds into

- [[concepts/realtime-sse]] — canonical
- [[features/notifications]]
- [[concepts/architecture]]
