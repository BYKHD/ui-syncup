---
title: Feature — projects
type: feature
tags: [feature, projects, members, invitations, access-requests]
last_updated: 2026-05-27
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

CRUD: `create-project`, `update-project`, `delete-project`, `get-project`, `get-projects`, `archive-project`, `unarchive-project`.
Members: `get-project-members`, `update-member-role`, `remove-member`, `leave-project`, `join-project`.
Invitations: `create-invitation`, `list-invitations`, `resend-invitation`, `revoke-invitation`.
Access requests: `create-access-request`, `list-access-requests`, `approve-access-request`, `decline-access-request`, `cancel-access-request`.
Activity: `get-project-activities`.

## Hooks

`use-create-project`, `use-delete-project`, `use-project-activities`, `use-project-filters`, `use-project-invitations`, `use-project-members`, `use-create-invitation`, `use-join-project`, `use-leave-project`.
`use-create-access-request`, `use-my-access-request`, `use-project-access-requests`, `use-approve-access-request`, `use-decline-access-request`, `use-cancel-access-request`.
`use-archive-project`, `use-unarchive-project`.

## Permissions

`PROJECT_OWNER` > `PROJECT_EDITOR` > `PROJECT_DEVELOPER` > `PROJECT_VIEWER`. Becoming OWNER/EDITOR auto-promotes to TEAM_EDITOR. See [[concepts/rbac-roles]].

## Invitations

Project invitation flow includes unauthenticated decline and email-delivery tracking — see [[sources/feature-arch-invitations]].

## Access requests

Project-scoped request-to-join flow for private projects; see [[concepts/access-requests]].

## Archive workflow

Project owners can archive active projects through `POST /api/projects/[id]/archive` when the project has at least one issue and every non-deleted issue is `resolved` or `archived`. `DELETE /api/projects/[id]/archive` restores the project to active. The archive/unarchive service functions do their own transactional DB work and write `project_archived` / `project_unarchived` activity rows.

Archived projects are hidden from the default project list via the active status filter, show a read-only banner on the detail screen, hide issue creation and join actions, and cannot be joined through the public-project join route.

### Write freeze on archived projects

Archived projects are a frozen historical record. Two server-side permission chokepoints enforce this — there is no role bypass; to edit, an owner must unarchive first.

- `hasPermission` ([src/server/auth/rbac.ts](../../src/server/auth/rbac.ts)) — short-circuits to `false` for `issue:create|update|delete|assign|comment` and `annotation:create|update|delete|comment` when `projects.status === 'archived'`. `project:archive` stays granted so owners can unarchive; reads stay granted.
- `getAnnotationPermissions` ([src/server/annotations/permission-utils.ts](../../src/server/annotations/permission-utils.ts)) — zeros out all annotation write flags on archived projects while leaving `canView` true.

Both call into [`isProjectArchived`](../../src/server/projects/archive-status.ts), a leaf helper kept out of `project-service.ts` to avoid an import cycle with rbac. Tests: [`archive-permissions.integration.test.ts`](../../src/server/projects/__tests__/archive-permissions.integration.test.ts).

## Related

- Features: [[features/teams]], [[features/issues]], [[features/annotations]]
- Concepts: [[concepts/rbac-roles]], [[concepts/access-requests]]
- Entities: [[entities/project]], [[entities/team]], [[entities/user]], [[entities/issue]]
