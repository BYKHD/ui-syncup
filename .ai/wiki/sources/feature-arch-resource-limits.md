---
title: Source — docs/feature-architectures/RESOURCE_LIMITS.md
type: source
tags: [source, quotas, limits, self-host]
last_updated: 2026-05-05
original_path: docs/feature-architectures/RESOURCE_LIMITS.md
original_status: removed (canonical content in [[concepts/quotas-and-plans]])
---

# Source: `docs/feature-architectures/RESOURCE_LIMITS.md` *(original removed)*

> [!note]
> Original removed from the repo. **Canonical content lives in [[concepts/quotas-and-plans]].** This page exists only as provenance.

**Scope:** Per-instance resource quotas for self-hosted deployments — env-var-driven limits (`MAX_MEMBERS_PER_TEAM`, `MAX_PROJECTS_PER_TEAM`, `MAX_ISSUES_PER_TEAM`, `MAX_STORAGE_PER_TEAM_MB`), enforcement in `src/server/limits/`, and the team-settings UI surface. Replaces per-plan billing limits.

## Feeds into

- [[concepts/quotas-and-plans]] — canonical
- [[concepts/deployment]]
- [[features/team-settings]]
- [[entities/team]]
