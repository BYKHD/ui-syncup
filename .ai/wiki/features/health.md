---
title: Feature — health
type: feature
tags: [feature, health, ops]
last_updated: 2026-05-01
sources: [sources/steering-tech]
---

# Feature: `health`

Health-check surface for the running instance.

## Code map

- **screens/** — `health-screen.tsx`
- **api/** — `get-health.ts`
- **hooks/** — `use-health.ts`

Exposed as a UI page (for ops/admin) and as an API route (consumed by Docker / load-balancer health probes).

## Related

- Features: [[features/setup]], [[features/instance-settings]]
- Concepts: [[concepts/deployment]]
