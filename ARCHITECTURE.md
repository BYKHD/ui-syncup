# Architecture Summary

## Attachment Canvas
- `IssueAttachmentsView` now offers two modes: **Annotate** (single as-is canvas with draggable pins) and **Compare** (synced side-by-side as-is/to-be canvases).
- Canvas primitives (`ImageCanvas`, `CenteredCanvasView`) render a shared overlay layer so annotations inherit the same zoom/pan transforms and sit above a dotted background pattern.
- Annotation pins emit `onAnnotationMove` updates with normalized coordinates, keeping the view ready-to-wire without persisting to an API yet.

## Annotation State & Sync
- `ResponsiveIssueLayout` flattens attachment annotations into a shared `annotationThreads` state, enriching each pin with attachment metadata and wiring selection/move handlers.
- This state is passed to both the attachment canvas and the details panel so selections stay in sync across layouts (mobile + desktop) and updates remain optimistic.

## Issue Details Panel
- The right panel now exposes `General` + `Comments` tabs via shadcn tabs; `Comments` hosts the Zeplin-style thread list, preview, and (disabled) composer aligned with mock data.
- The comment tab renders annotations with status chips, variant badges, and relative timestamps, mirroring the pin selection from the canvas for a cohesive review workflow.

## Mock Fixtures
- Attachment fixtures define explicit `reviewVariant` roles (as-is/to-be/reference) and rich annotation threads referencing the new CPM-101 playground images to fuel the redesigned UI.
