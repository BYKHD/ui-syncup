---
title: Feature — issues
type: feature
tags: [feature, issues, workflow, attachments]
last_updated: 2026-05-21
sources: [sources/steering-product, sources/feature-arch-storage, sources/feature-arch-loading]
---

# Feature: `issues`

Issue tracking and details: create, view, update status, delete, attach images, view activities, public share. The center of gravity of the product alongside [[features/annotations]].

## Screens

- `issue-details-screen.tsx`, `issue-details-skeletons.tsx`
- `issue-share-screen.tsx`

## API

`create-issue`, `update-issue`, `delete-issue`, `get-issue-details`, `get-issue-activities`, `get-project-issues`, `get-project-issues-server` (server prefetch — see [[concepts/loading-patterns]]), `upload-attachment`.

## Hooks

`use-issue-details`, `use-issue-activities`, `use-issue-update`, `use-issue-delete`, `use-issue-filters`, `use-create-issue`, `use-canvas-transform`, `use-elastic-scroll`, `use-keyboard-shortcuts`.

## Workflow

Open → In Progress → In Review → Resolved → Archived [[sources/steering-product]]. See [[concepts/issue-workflow]].

## Attachments

Issue attachments live under the `attachments/` prefix in S3 and are always private — served via presigned URLs. See [[concepts/storage]].

## Route resolution

`issueKey` (e.g. `PRJ-1`) is **only unique per project** — the `issues` table enforces `issues_project_issue_key_unique` on `(projectId, issueKey)`, and project `key` is only team-unique (`projects_team_key_unique`). So multiple teams can each own an issue `PRJ-1`. The `/issue/[issueKey]` route therefore resolves via `getIssueByRef(ref, userId)` (server, `issue-service.ts`): a UUID resolves directly through `getIssueById`; a legacy key is disambiguated by returning the first match the viewer can access via `canViewIssue` [[concepts/rbac-roles]]. App-generated links (issue list, dashboard, issue notifications) route by the globally-unique `issues.id` UUID; only legacy/older notification links may still carry a bare key. The page still gates the resolved issue with `getProjectForAccessCheck`, so a genuine non-member sees the access-request flow [[concepts/access-requests]].

## Related

- Features: [[features/annotations]], [[features/projects]], [[features/dashboard]], [[features/notifications]]
- Concepts: [[concepts/issue-workflow]], [[concepts/rbac-roles]], [[concepts/storage]], [[concepts/loading-patterns]]
- Entities: [[entities/issue]], [[entities/annotation]], [[entities/project]], [[entities/user]]
