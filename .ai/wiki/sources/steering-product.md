---
title: Source — .ai/steering/product.md
type: source
tags: [source, steering, product]
last_updated: 2026-05-01
source_path: .ai/steering/product.md
---

# Source: `.ai/steering/product.md`

Steering doc that defines what UI SyncUp is, who it's for, and the role system at the product level. Canonical for product-level vocabulary.

## Key facts

- **Product**: visual feedback + issue tracking for design-to-development collaboration.
- **Core features**: visual annotations (pin + box), issue management with workflow states, multi-team workspaces, two-tier RBAC, self-host or cloud.
- **Issue workflow**: Open → In Progress → In Review → Resolved → Archived.
- **Two-tier role system**:
  - Management roles: `TEAM_OWNER`, `TEAM_ADMIN`.
  - Operational roles: `TEAM_EDITOR`, `TEAM_MEMBER`, `TEAM_VIEWER`.
  - Project roles: `PROJECT_OWNER`, `PROJECT_EDITOR`, `PROJECT_DEVELOPER`, `PROJECT_VIEWER`.
- **Auto-promotion**: becoming `PROJECT_OWNER` or `PROJECT_EDITOR` auto-promotes the user to `TEAM_EDITOR`.
- **Target users**: Designers/QA, Developers, Project Managers, Team Admins, Team Owners.
- **License**: MIT. Self-host CLI on npm (`ui-syncup`); Docker Compose support; PostgreSQL required, Redis + S3 optional.
- **Community channels**: GitHub Issues, Discussions, Pull Requests.

## Feeds into

- [[entities/team]], [[entities/project]], [[entities/issue]], [[entities/user]], [[entities/annotation]]
- [[concepts/rbac-roles]], [[concepts/issue-workflow]], [[concepts/deployment]]
- [[overview]]
