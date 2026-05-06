---
title: Feature — dashboard
type: feature
tags: [feature, dashboard]
last_updated: 2026-05-01
sources: [sources/steering-structure]
---

# Feature: `dashboard`

Authenticated landing surface for a signed-in user. Shows "my issues" — issues assigned to or created by the current user across their teams.

## Code map

- **screens/** — `dashboard-screen.tsx`
- **api/** — `get-my-issues.ts`
- **hooks/** — `use-my-issues.ts`

Lightweight feature; most of the heavy lifting happens in [[features/issues]].

## Related

- Features: [[features/issues]], [[features/projects]]
- Entities: [[entities/issue]], [[entities/user]]
