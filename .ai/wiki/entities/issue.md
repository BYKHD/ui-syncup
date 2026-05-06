---
title: Entity — Issue
type: entity
tags: [entity, issue, workflow]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/feature-arch-storage, sources/feature-arch-rbac]
---

# Issue

A unit of feedback or bug report scoped to a project. Holds metadata (priority, type, status), attachments, comments, and one or more annotations.

## Workflow

Open → In Progress → In Review → Resolved → Archived. See [[concepts/issue-workflow]].

## Permissions

| Action | Roles |
|---|---|
| `issue:view` | All |
| `issue:create` | TEAM_OWNER/ADMIN/EDITOR, PROJECT_OWNER/EDITOR |
| `issue:update` | All of the above + PROJECT_DEVELOPER |
| `issue:delete` | TEAM_OWNER/ADMIN/EDITOR, PROJECT_OWNER/EDITOR |
| `issue:assign` | TEAM_OWNER/ADMIN/EDITOR, PROJECT_OWNER/EDITOR |
| `issue:comment` | All except VIEWER |

[[sources/feature-arch-rbac]]

## Attachments

Stored under the `attachments/` prefix in S3, always private, served via presigned GET URLs. Uploaded via `/api/uploads/attachment`. See [[concepts/storage]].

## Activities

Issue activities (status changes, comments, assignments) drive notification fan-out via [[concepts/realtime-sse]].

## Code surface

- Tables: `issues`, `issue_attachments`, `issue_activities`, `issue_comments`.
- Feature: [[features/issues]].
- Sharing: public share via [[features/issues]]'s `issue-share-screen.tsx`.

## Related

- Features: [[features/issues]], [[features/annotations]], [[features/dashboard]], [[features/notifications]]
- Concepts: [[concepts/issue-workflow]], [[concepts/storage]], [[concepts/rbac-roles]], [[concepts/realtime-sse]]
- Entities: [[entities/project]], [[entities/annotation]], [[entities/user]]
