---
title: Entity — User
type: entity
tags: [entity, user, account]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/steering-tech, sources/feature-arch-rbac]
---

# User

An authenticated account. Belongs to one or more teams (in multi-team mode) and zero or more projects within them.

## Authentication

`better-auth` + Argon2 + httpOnly session cookies. See [[features/auth]] and [[concepts/security]].

## Roles

A user holds:
- One **management role** per team (optional): `TEAM_OWNER` / `TEAM_ADMIN`.
- One **operational role** per team (required): `TEAM_EDITOR` / `TEAM_MEMBER` / `TEAM_VIEWER`.
- One project role per project they're a member of.

See [[concepts/rbac-roles]].

## Profile & preferences

- Avatar uploads → `media/` prefix. See [[concepts/storage]].
- Notification preferences, integrations, settings → [[features/user-settings]].

## Account operations

Delete account, link external accounts, view linked accounts — all in [[features/auth]]'s hooks (`use-delete-account`, `use-link-account`, `use-linked-accounts`).

## Code surface

- Tables: `users`, `user_preferences`, `user_notification_preferences`, `team_members`, `project_members`.
- Features: [[features/auth]], [[features/user-settings]].
- Session: `src/server/auth/session.ts`, client: `features/auth/hooks/use-session.ts`.

## Related

- Features: [[features/auth]], [[features/user-settings]], [[features/teams]], [[features/projects]]
- Concepts: [[concepts/rbac-roles]], [[concepts/security]]
- Entities: [[entities/team]], [[entities/project]]
