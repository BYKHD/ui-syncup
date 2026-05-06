---
title: Entity — Annotation
type: entity
tags: [entity, annotation, canvas]
last_updated: 2026-05-01
sources: [sources/steering-product]
---

# Annotation

A pin or box overlay placed on an issue attachment, with a thread of comments. Annotations let designers/QA point at exactly where on a mockup something is wrong.

## Shapes

- **Pin** — single coordinate (`AnnotationPin`).
- **Box** — rectangle (`AnnotationBox`).

Defined as `AnnotationShape` in [[features/annotations]]'s `types/`.

## Permissions

| Action | Roles |
|---|---|
| `annotation:view` | All |
| `annotation:create` | TEAM_OWNER/ADMIN/EDITOR, PROJECT_OWNER/EDITOR |
| `annotation:update` | Same |
| `annotation:delete` | Same |
| `annotation:comment` | All except VIEWER |

See [[concepts/rbac-roles]].

## Drafts & history

Edits are tracked client-side via `useAnnotationsWithHistory` + a history-manager (`createSnapshot`, `addToHistory`). Drafts (`useAnnotationDrafts`) allow staging changes before save. Auto-save via `useAutoSave`.

## Code surface

- Tables: `annotations`, `annotation_comments`.
- Feature: [[features/annotations]].
- Belongs to: [[entities/issue]] (via attachment).

## Related

- Features: [[features/annotations]], [[features/issues]]
- Concepts: [[concepts/rbac-roles]]
- Entities: [[entities/issue]], [[entities/user]]
