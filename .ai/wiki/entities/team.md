---
title: Entity — Team
type: entity
tags: [entity, team]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/feature-arch-teams, sources/feature-arch-rbac, sources/feature-arch-resource-limits]
---

# Team

Top-level organizational unit. Owns members, projects, and team-scoped settings.

## Hierarchy

```
Instance
└── Team
    ├── Members (with roles)
    ├── Projects → Issues → Annotations
    └── Settings
```

## Membership

A user joins a team via `team_members`, with one **management role** (optional: `TEAM_OWNER` / `TEAM_ADMIN`) and one **operational role** (required: `TEAM_EDITOR` / `TEAM_MEMBER` / `TEAM_VIEWER`). See [[concepts/rbac-roles]].

## Modes

- **Single-team** (`MULTI_TEAM_MODE=false`, default) — one team auto-created during setup; switcher hidden.
- **Multi-team** — switcher + create-team UI shown.

## Quotas

Per-instance quotas apply: members, projects, issues, storage. See [[concepts/quotas-and-plans]].

## Code surface

- Tables: `teams`, `team_members`, `team_invitations`.
- Service: `src/server/teams/team-service.ts` + `member-service.ts` + `invitation-service.ts` + `member-counts.ts` + `resource-limits.ts`.
- Feature: [[features/teams]], [[features/team-settings]].
- Endpoints: `/api/teams/*`.

## Lifecycle

Create → invite/add members → create projects → daily ops → (transfer ownership / delete). Deletion gated to `TEAM_OWNER`; transfer-ownership available via `useTransferOwnership`.

## Related

- Features: [[features/teams]], [[features/team-settings]], [[features/setup]]
- Concepts: [[concepts/rbac-roles]], [[concepts/quotas-and-plans]]
- Entities: [[entities/project]], [[entities/user]]
