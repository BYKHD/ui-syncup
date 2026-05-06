---
title: Concept — Quotas (Instance Limits)
type: concept
tags: [quotas, limits, self-host, instance-config]
last_updated: 2026-05-01
sources: [sources/feature-arch-resource-limits, sources/steering-product]
---

# Quotas (Instance-Level Limits)

UI SyncUp uses **per-instance quotas**, not per-team plans. Every team on the instance shares the same limits, configured by env vars at deploy time.

## Default quotas

| Variable | Default | Applies to |
|---|---|---|
| `MAX_MEMBERS_PER_TEAM` | unlimited | Team membership |
| `MAX_PROJECTS_PER_TEAM` | 100 | Project creation |
| `MAX_ISSUES_PER_TEAM` | unlimited | Issue creation |
| `MAX_STORAGE_PER_TEAM_MB` | 10000 | Total attachment + media bytes |

## Code locations

- `src/config/quotas.ts` — single source of truth (pure data; reads env at runtime).
- `src/server/limits/` — enforcement (`checkResourceLimit(teamId, kind)` returning `{allowed, …}`).
- `src/features/team-settings/` — UI surface showing usage vs. limit.
- `src/features/instance-settings/` — admin view of instance config.

## Enforcement

Quotas are checked **before** create operations on the server side. Client-side displays usage; never trust client checks.

## Why instance-level?

UI SyncUp is OSS and self-hosted. There is no SaaS billing layer to gate features by plan; instead, the operator picks limits at deploy time. See [[concepts/deployment]].

## Related

- Features: [[features/team-settings]], [[features/instance-settings]], [[features/setup]]
- Concepts: [[concepts/deployment]], [[concepts/rbac-roles]]
- Sources: [[sources/feature-arch-resource-limits]]
