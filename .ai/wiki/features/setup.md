---
title: Feature — setup
type: feature
tags: [feature, setup, onboarding, self-host]
last_updated: 2026-05-01
sources: [sources/feature-arch-teams, sources/steering-product]
---

# Feature: `setup`

First-run setup wizard for a fresh self-hosted instance: create admin, create first team, save instance config, complete setup, check service health.

## Screens

- `setup-screen.tsx`

## API

- `get-instance-status`, `get-service-health`
- `create-admin`, `create-first-team`
- `save-instance-config`
- `complete-setup`

## Hooks

- `use-instance-status`, `use-service-health`
- `use-create-admin`, `use-create-first-team`, `use-save-instance-config`
- `use-complete-setup`
- `use-setup-draft`, `use-setup-wizard`, `use-team-mode`

## Single vs Multi-team

`use-team-mode` reads the `MULTI_TEAM_MODE` env to determine whether the wizard skips the create/join choice (single) or surfaces it (multi). See [[sources/feature-arch-teams]].

## Related

- Features: [[features/auth]], [[features/teams]], [[features/instance-settings]], [[features/health]]
- Concepts: [[concepts/deployment]], [[concepts/cli-package]]
- Entities: [[entities/team]], [[entities/user]]
