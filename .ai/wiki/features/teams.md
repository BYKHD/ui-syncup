---
title: Feature — teams
type: feature
tags: [feature, teams, invitations, switcher]
last_updated: 2026-05-01
sources: [sources/feature-arch-teams, sources/feature-arch-invitations, sources/feature-arch-rbac]
---

# Feature: `teams`

Team creation, switching, deletion, member/role management, and team-level invitations. See [[entities/team]].

## Screens

- `team-invitation-acceptance-screen.tsx`

(Most team list/switch UX lives in `components/shared/sidebar` and the protected layout.)

## API

CRUD: `create-team`, `update-team`, `delete-team`, `get-team`, `get-teams`, `switch-team`, `leave-team`.
Members: `get-team-members`, `update-member-roles`, `remove-member`.
Invitations: `create-invitation`, `get-invitations`, `cancel-invitation`, `resend-invitation`.
Demotion-safety: `get-owned-projects` (for the demotion-with-ownership-transfer flow — see [[concepts/rbac-roles]]).

## Hooks

`use-create-team`, `use-delete-team`, `use-leave-team`, `use-invitations`, `use-create-invitation`, `use-cancel-invitation`, `use-can-manage-team`, `use-can-manage-members`.

## Mode

Single-team vs multi-team toggled by `MULTI_TEAM_MODE` env var. UI surfaces (switcher, "create team" button, settings nav label) change accordingly. See [[sources/feature-arch-teams]].

## Related

- Features: [[features/team-settings]], [[features/projects]], [[features/setup]]
- Concepts: [[concepts/rbac-roles]], [[concepts/quotas-and-plans]]
- Entities: [[entities/team]], [[entities/user]], [[entities/project]]
