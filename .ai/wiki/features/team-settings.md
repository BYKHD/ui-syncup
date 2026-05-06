---
title: Feature — team-settings
type: feature
tags: [feature, team, settings]
last_updated: 2026-05-01
sources: [sources/feature-arch-teams, sources/feature-arch-resource-limits, sources/feature-arch-invitations]
---

# Feature: `team-settings`

Settings UI scoped to a single team. Gated to TEAM_OWNER / TEAM_ADMIN [[concepts/rbac-roles]].

## Screens

- `team-settings-screen.tsx`

## Hooks

- `use-team-settings`
- `use-transfer-ownership`

(API operations are exposed through the `teams/` feature; this feature mostly composes UI.)

## Surfaces

Member management, role changes (incl. demotion-with-ownership-transfer flow), team invitations, danger zone (delete + transfer ownership), team logo upload (`media/` prefix — see [[concepts/storage]]), resource-usage display vs. quotas (see [[concepts/quotas-and-plans]]).

## Related

- Features: [[features/teams]], [[features/auth]] (session/role gating)
- Concepts: [[concepts/rbac-roles]], [[concepts/quotas-and-plans]], [[concepts/storage]]
- Entities: [[entities/team]], [[entities/user]]
