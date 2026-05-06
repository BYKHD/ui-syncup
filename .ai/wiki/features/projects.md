---
title: Feature — projects
type: feature
tags: [feature, projects, members, invitations]
last_updated: 2026-05-01
sources: [sources/feature-arch-invitations, sources/feature-arch-rbac]
---

# Feature: `projects`

Project CRUD, membership, role updates, project-level invitations (incl. accept flow), and the project detail screen.

## Screens

- `projects-list-screen.tsx`
- `project-detail-screen.tsx` + `project-detail-screen-wrapper.tsx`
- `invitation-acceptance-screen.tsx`

## API

CRUD: `create-project`, `update-project`, `delete-project`, `get-project`, `get-projects`.
Members: `get-project-members`, `update-member-role`, `remove-member`, `leave-project`, `join-project`.
Invitations: `create-invitation`, `list-invitations`, `resend-invitation`, `revoke-invitation`.
Activity: `get-project-activities`.

## Hooks

`use-create-project`, `use-delete-project`, `use-project-activities`, `use-project-filters`, `use-project-invitations`, `use-project-members`, `use-create-invitation`, `use-join-project`, `use-leave-project`.

## Permissions

`PROJECT_OWNER` > `PROJECT_EDITOR` > `PROJECT_DEVELOPER` > `PROJECT_VIEWER`. Becoming OWNER/EDITOR auto-promotes to TEAM_EDITOR. See [[concepts/rbac-roles]].

## Invitations

Project invitation flow includes unauthenticated decline and email-delivery tracking — see [[sources/feature-arch-invitations]].

## Related

- Features: [[features/teams]], [[features/issues]], [[features/annotations]]
- Concepts: [[concepts/rbac-roles]]
- Entities: [[entities/project]], [[entities/team]], [[entities/user]], [[entities/issue]]
