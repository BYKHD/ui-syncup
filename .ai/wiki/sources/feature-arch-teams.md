---
title: Source — docs/feature-architectures/TEAMS.md
type: source
tags: [source, teams, multi-tenancy, single-team]
last_updated: 2026-05-01
original_path: docs/feature-architectures/TEAMS.md
original_status: removed (this wiki page is now canonical)
---

# Source: `docs/feature-architectures/TEAMS.md` *(original removed)*

> [!note]
> The original `docs/feature-architectures/TEAMS.md` has been removed. **This wiki page is now the canonical reference.**

Team is the top-level org unit. Doc covers the structure and the single-team vs multi-team modes.

## Key facts

- **Hierarchy**: Instance → Team(s) → Members + Projects + Settings; Project → Issues + Annotations.
- **Two modes** controlled by `MULTI_TEAM_MODE`:
  - **Single-team (default)**: one team auto-created during setup; team switcher hidden; no "create team" button; settings labeled "Settings"; onboarding skips create/join choice.
  - **Multi-team**: switcher + create-team UI shown; full onboarding flow.
- **UI surface differences** are documented as a comparison table — see source for details.
- Members carry both a management role and an operational role (see [[concepts/rbac-roles]]).
- Each team has `team_members`, owned projects, and team-scoped settings.

## Feeds into

- [[features/teams]]
- [[features/team-settings]]
- [[features/setup]]
- [[entities/team]]
- [[concepts/deployment]]
