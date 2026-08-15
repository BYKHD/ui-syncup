---
title: Feature — annotations
type: feature
tags: [feature, annotations, canvas]
last_updated: 2026-06-15
sources: [sources/steering-product, sources/steering-structure]
---

# Feature: `annotations`

Visual annotation system: pin and box annotations on attachments, threaded comments, undo/redo history, drafts/auto-save, popover UI.

## What it does

Lets users place pins or draw boxes on top of an image attachment, attach a thread of comments, and edit/delete with permission gating. Tightly integrated with [[features/issues]] (annotations sit on issue attachments) and [[entities/annotation]].

## Code map (`src/features/annotations/`)

- **api/** — `annotations-api.ts`, `comments-api.ts`, `save-annotation.ts`, `schemas.ts`
- **components/** — `AnnotationLayer`, `AnnotationPin`, `AnnotationBox`, `AnnotationCanvas`, `AnnotationToolbar`, `AnnotationDrawer`, `AnnotationCommentInput`, `AnnotationAnnotationsPanel`, `AnnotationThreadPanel`, `AnnotationThreadPreview`, `AnnotatedAttachmentView`, `AnnotationPopover`, `KeyboardShortcutsModal`, `CanvasScaleProvider`/`useCanvasTransientScale` (`annotation-scale-context`, canvas zoom counter-scale)
- **hooks/** — `useAnnotationTools`, `useAnnotationDrafts`, `useAnnotationsWithHistory`, `useAnnotationSave`, `useAnnotationEditState`, `useAnnotationIntegration`, `useAnnotationComments`, `useAnnotationPermissions`, `useAnnotationBatchSave`, `useAutoSave`, `useAnnotationPopover`, `useAnnotationHistoryTracker`
- **types/** — `AnnotationAuthor`, `AnnotationComment`, `AnnotationPosition`, `AnnotationThread`, `AnnotationDraft`, `AnnotationShape`, `AnnotationSnapshot`, `AnnotationPermissions`, `ANNOTATION_TOOL_IDS`
- **utils/** — `mapAttachmentsToAnnotationThreads`, history manager (`createHistoryEntry`, `createSnapshot`, `addToHistory`, `shapesAreEqual`)
- **docs/** — feature-local docs (Phase 4 integration notes etc.)
- **examples/** — usage examples

## Constraints

- **Box hit area is the whole interior, not the border.** `annotation-box.tsx`'s "Box Border" div is `absolute inset-0` with the pointer handlers (and `stopPropagation` on pointerdown). Overlapping boxes therefore depend on z-index for clickability: boxes get `zIndex = 1000 - area/10` (smaller area → higher z), the active box gets `2000`, pins sit at `2001`. Without this, a bigger box fully occludes any smaller annotation beneath it. Locked by `__tests__/annotation-box.test.tsx`.

## Related

- Entities: [[entities/annotation]], [[entities/issue]], [[entities/user]]
- Concepts: [[concepts/rbac-roles]] (permission gating via `useAnnotationPermissions`), [[concepts/annotations-canvas-performance]] (drag/draw/zoom smoothness)
- Features: [[features/issues]]
