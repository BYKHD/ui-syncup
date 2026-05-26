---
title: Concept — Issue Workflow
type: concept
tags: [workflow, issues, states]
last_updated: 2026-05-27
sources: [sources/steering-product]
---

# Issue Workflow

Issues move through a fixed five-state workflow. The states and transitions are defined in `src/config/workflow.ts` (single source of truth).

## States

```
Open → In Progress → In Review → Resolved → Archived
```

## Who can transition

Status updates require `issue:update`, granted to TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR, PROJECT_DEVELOPER. Note: `PROJECT_DEVELOPER` *can* update status — this is the typical developer workflow [[sources/feature-arch-rbac]].

When the parent project is archived, **all** issue writes (status transitions included) are denied at the permission layer — the project must be unarchived first. See the archive write-freeze section in [[features/projects]].

## Code surface

- `src/config/workflow.ts` — state constants + allowed transitions.
- `src/config/issue-options.ts` — issue metadata options (priority, type, etc.).
- `src/features/issues/api/update-issue.ts` — backend transition handler.
- `src/features/issues/hooks/use-issue-update.ts` — client mutation hook.

## Related

- Features: [[features/issues]], [[features/dashboard]], [[features/notifications]] (state-change events trigger notifications)
- Entities: [[entities/issue]]
- Concepts: [[concepts/rbac-roles]]
