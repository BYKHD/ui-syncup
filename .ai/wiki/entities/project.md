---
title: Entity — Project
type: entity
tags: [entity, project]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/feature-arch-rbac, sources/feature-arch-invitations]
---

# Project

A workspace within a team. Owns issues + their annotations + project-scoped membership.

## Membership

`project_members(role)` — `PROJECT_OWNER` (4) > `PROJECT_EDITOR` (3) > `PROJECT_DEVELOPER` (2) > `PROJECT_VIEWER` (1).

Becoming `PROJECT_OWNER` or `PROJECT_EDITOR` auto-promotes the user to `TEAM_EDITOR` at the team level. See [[concepts/rbac-roles]].

## Invitations

Project invites use `/invite/project/TOKEN`, support unauthenticated decline, and track email delivery (3 DB columns). See [[sources/feature-arch-invitations]].

## Demotion guard

A user holding `PROJECT_OWNER` cannot be demoted below `TEAM_EDITOR` until ownership is transferred. Use `getOwnedProjects(userId)` then `demoteWithOwnershipTransfer()`.

## Code surface

- Tables: `projects`, `project_members`, `project_invitations`.
- Feature: [[features/projects]].
- Endpoints: `/api/projects/*`, `/api/invite/project/*`.

## Related

- Features: [[features/projects]], [[features/issues]], [[features/annotations]]
- Concepts: [[concepts/rbac-roles]]
- Entities: [[entities/team]], [[entities/user]], [[entities/issue]]
