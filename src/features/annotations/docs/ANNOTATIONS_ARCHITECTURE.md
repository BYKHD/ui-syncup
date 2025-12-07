# Annotations Architecture

## Purpose
The annotations feature delivers a ready-to-wire UX for design QA without persisting data yet. It lives under `src/features/annotations` per the feature-first contract in `AGENTS.md` and exposes only the primitives other features (issues, projects, etc.) need to compose annotation experiences.

## Layers & Contracts

```
features/annotations/
├─ components/
│  ├─ annotation-toolbar.tsx        # Floating tool palette, undo/redo, edit-mode switch
│  ├─ annotation-layer.tsx          # Overlay renderer (pins today, other shapes later)
│  ├─ annotation-pin.tsx            # Interactive pin with keyboard-accessible interactions
│  └─ annotation-comments-panel.tsx # Thread list + preview panel
├─ hooks/
│  └─ use-annotation-tools.ts       # Tool state, edit mode, history, keyboard shortcuts
├─ types/
│  └─ annotation.ts                 # Domain contracts (authors, comments, threads, tools)
├─ utils/
│  └─ map-attachments-to-threads.ts # Normalizes attachments into annotation threads
└─ index.ts                         # Barrel exporting ready-to-wire API surface
```

### Components
- **AnnotationToolbar** (shadcn card) encapsulates tool selection, edit-mode, undo/redo and ships keyboard hinting. It only emits intents via callbacks so screens wire them to feature hooks or future mutations.
- **AnnotationLayer / AnnotationPin** render annotations on any canvas. Pins can run in read-only mode when edit-mode is off, avoiding accidental drags.
- **AnnotationCommentsPanel** stays feature-agnostic by taking `AnnotationThread` objects; screens supply data plus selection handlers.

### Hook
`use-annotation-tools` exposes:
- `tools`, `activeTool`, `editModeEnabled`
- `selectTool`, `toggleEditMode`, `undo`, `redo`, `pushHistory`
- Keyboard shortcuts: `1-4` for tools, `E` for edit-mode, `Cmd/Ctrl+Z` for undo, `Shift+Cmd/Ctrl+Z` for redo.

The hook never mutates annotations directly; it just manages intent/history, keeping UI pure.

### Types
- Re-exported unions keep Issue feature types aligned: `AnnotationAuthor`, `AttachmentAnnotation`, `AnnotationThread`, `AnnotationToolId`, `AnnotationHistoryEntry`.
- `ANNOTATION_TOOL_IDS` is the single source for supported tools.

### Utils
`mapAttachmentsToAnnotationThreads` accepts any attachment-like objects and decorates annotations with attachment metadata (name, variant, preview). Issues screens call it to seed sidebar threads.

### Mocks
`src/mocks/annotation.fixtures.ts` consolidates:
- `MOCK_ATTACHMENT_USERS` used by attachments + annotations.
- `MOCK_CPM101_ANNOTATIONS`, deterministic `createAnnotationFactory`, and scenarios for ready-to-wire demos.

Attachments now import these mocks to avoid duplication.

## Integration Points
- `src/features/issues/components/optimized-attachment-view.tsx` consumes the toolbar, hook, and layer to present the Zeplin-style mock. The screen records history events (select/move) so wiring to persistence later is straightforward.
- Other features can import from the annotations barrel without touching issues, staying within the layer contracts defined in `AGENTS.md`.

## State Boundaries
- **UI state** (active tool, edit mode) lives in the hook.
- **Annotation data** stays external (passed via props) so nothing ties the component tree to a specific backend or store.
- **History** is capped (50 entries) and local-only; when persistence arrives it can be synced.

## Accessibility & Responsiveness
- Toolbar buttons expose `aria-pressed`, tooltips include shortcut hints, and edit-mode switch is labeled.
- Pins remain focusable buttons with visible focus rings.
- The toolbar card is floating/responsive: max-width `md` and stacks gracefully on smaller screens.

## Extensibility
- Adding new tool types only requires updating `ANNOTATION_TOOL_IDS`, `TOOL_LABELS`/`TOOL_ICONS`, and rendering logic inside `AnnotationLayer`.
- `AnnotationHistoryEntry` leaves room for richer undo/redo integration once actual mutations exist.
