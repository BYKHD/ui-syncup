---
title: Concept — RBAC & Roles
type: concept
tags: [rbac, security, permissions, roles]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/feature-arch-rbac, sources/feature-arch-resource-limits]
---

# RBAC & Roles

UI SyncUp uses a two-tier role model at the team level plus a separate project role hierarchy. Permissions — not roles — are checked in business logic.

## Role hierarchy

### Team — management roles (control settings)
| Role | Capabilities |
|---|---|
| **TEAM_OWNER** | Full team control. Transfer ownership, delete team. |
| **TEAM_ADMIN** | Manage members, projects, integrations. Cannot delete or transfer. |

### Team — operational roles (control content access)
| Role | Level | Notes |
|---|---|---|
| **TEAM_EDITOR** | 3 | Create/manage issues + annotations. Auto-assigned when user becomes PROJECT_OWNER/EDITOR. |
| **TEAM_MEMBER** | 2 | View + comment. Assignable to projects. |
| **TEAM_VIEWER** | 1 | Read-only. |

A user may hold one management role *and* one operational role.

### Project roles
`PROJECT_OWNER` (4) > `PROJECT_EDITOR` (3) > `PROJECT_DEVELOPER` (2) > `PROJECT_VIEWER` (1).

## Auto-promotion

Assigning `PROJECT_OWNER` or `PROJECT_EDITOR` triggers `autoPromoteToEditor()` / `ensureOperationalRole()` to upgrade the team-level operational role to `TEAM_EDITOR`. Only upgrades; never downgrades. [[sources/feature-arch-rbac]]

## Demotion guard

`updateRole` blocks demoting a user out of `TEAM_EDITOR` if they own any project. Use `getOwnedProjects(userId)` then `demoteWithOwnershipTransfer()` to transfer ownership atomically. [[sources/feature-arch-rbac]]

## Storage (single source of truth)

| Resource | Table | Columns |
|---|---|---|
| Team | `team_members` | `managementRole`, `operationalRole` |
| Project | `project_members` | `role` |

No duplicate `user_roles` rows for project resources.

## API surface

`assignRole`, `assignRoles`, `removeRole`, `updateRole`, `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `requirePermission`, `requireRole`, `getUserRoles`, `getUserTeamRoles`, `getUserProjectRoles`, `getHighestTeamRole`, `getHighestProjectRole`, `getOwnedProjects`, `demoteWithOwnershipTransfer`, `autoPromoteToEditor`, `ensureOperationalRole`.

## Code locations

- `src/config/roles.ts` — role + permission constants (single source for UI + server).
- `src/server/auth/rbac.ts` — enforcement.
- `src/features/auth/hooks/use-session.ts` — client-side role surface.
- `src/app/(protected)/layout.tsx` — protected-route gate.

## Best practices

- Enforce on server (always); client checks are UX only.
- Check permissions, not roles, in business logic.
- Use `requirePermission` guards in API routes.
- Batch with `assignRoles` for transactional changes.
- Permission denials log automatically (`rbac.permission_denied`).

## Related

- Features: [[features/auth]], [[features/teams]], [[features/team-settings]], [[features/projects]]
- Entities: [[entities/team]], [[entities/project]], [[entities/user]]
- Concepts: [[concepts/security]], [[concepts/quotas-and-plans]]
