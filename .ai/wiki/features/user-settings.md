---
title: Feature — user-settings
type: feature
tags: [feature, user, preferences, integrations]
last_updated: 2026-05-01
sources: [sources/steering-structure]
---

# Feature: `user-settings`

Per-user preferences: profile, notifications, integrations, other. Self-scoped; no RBAC beyond auth.

## Screens

- `user-settings-screen.tsx` (root)
- `setting-preferences-screen.tsx`
- `notifications-screen.tsx`
- `integrations-screen.tsx`
- `other-settings-screen.tsx`

## Hooks

- `use-user-preferences`
- `use-notification-preferences`

## Notable

Has `actions/` directory (server actions) in addition to `api/` — user-settings uses Next server actions for some mutations, an exception within the feature-first pattern.

## Related

- Features: [[features/auth]], [[features/notifications]]
- Concepts: [[concepts/storage]] (avatar uploads under `media/`)
- Entities: [[entities/user]]
