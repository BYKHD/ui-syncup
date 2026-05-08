---
title: Feature — projects
type: feature
tags: [feature, projects, members, invitations, access-requests]
last_updated: 2026-05-07
sources: [sources/feature-arch-invitations, sources/feature-arch-rbac]
---

# Feature: `projects`

Project CRUD, membership, role updates, project-level invitations (incl. accept flow), project access requests, and the project detail screen.

## Screens

- `projects-list-screen.tsx`
- `project-detail-screen.tsx` + `project-detail-screen-wrapper.tsx`
- `invitation-acceptance-screen.tsx`
- `access-request-screen.tsx`

## API

CRUD: `create-project`, `update-project`, `delete-project`, `get-project`, `get-projects`.
Members: `get-project-members`, `update-member-role`, `remove-member`, `leave-project`, `join-project`.
Invitations: `create-invitation`, `list-invitations`, `resend-invitation`, `revoke-invitation`.
Access requests: `create-access-request`, `list-access-requests`, `approve-access-request`, `decline-access-request`, `cancel-access-request`.
Activity: `get-project-activities`.

## Hooks

`use-create-project`, `use-delete-project`, `use-project-activities`, `use-project-filters`, `use-project-invitations`, `use-project-members`, `use-create-invitation`, `use-join-project`, `use-leave-project`.
`use-create-access-request`, `use-my-access-request`, `use-project-access-requests`, `use-approve-access-request`, `use-decline-access-request`, `use-cancel-access-request`.

## Permissions

`PROJECT_OWNER` > `PROJECT_EDITOR` > `PROJECT_DEVELOPER` > `PROJECT_VIEWER`. Becoming OWNER/EDITOR auto-promotes to TEAM_EDITOR. See [[concepts/rbac-roles]].

## Invitations

Project invitation flow includes unauthenticated decline and email-delivery tracking — see [[sources/feature-arch-invitations]].

## Access requests

Project-scoped request-to-join flow for private projects; see [[concepts/access-requests]].

## Related

- Features: [[features/teams]], [[features/issues]], [[features/annotations]]
- Concepts: [[concepts/rbac-roles]], [[concepts/access-requests]]
- Entities: [[entities/project]], [[entities/team]], [[entities/user]], [[entities/issue]]
