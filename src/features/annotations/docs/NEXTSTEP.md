# Annotations Next Steps

1. **Persist Drafts**
   - Wire `use-annotation-tools` outputs to feature hooks (e.g., `useIssueAnnotations`) that call transport DTOs (`POST /api/issues/:id/annotations`).
   - Use `pushHistory` events to trigger optimistic updates and rollback on failure.

2. **Add Shape Models**
   - Extend `AttachmentAnnotation.shape` with discriminated unions for `box`, `arrow`, `highlight`.
   - Update `AnnotationLayer` to render SVG overlays for each shape and keep pins as the selection affordance.

3. **Toolbar Enhancements**
   - Surface contextual controls below the toolbar (snap toggle, grid overlay toggle, delete button for active annotation).
   - Add inline success/error toasts using the existing `sonner` setup when actions succeed/fail.

4. **Collaboration Hooks**
   - Subscribe to annotation updates via issue activity feed or websockets so multiple designers see changes live.
   - Show presence indicators (avatars) on pins when another user is editing.

5. **Mock Coverage**
   - Extend `createAnnotationFactory` to emit shapes + metadata (severity, tokens) and update scenarios so Storybook / playground views demonstrate the richer UX before the API is ready.

6. **Testing**
   - Snapshot test `AnnotationToolbar` states in RTL (default, read-only, disabled buttons).
   - Write unit tests for `use-annotation-tools` covering keyboard shortcuts, undo/redo, and edit-mode toggling.

7. **Accessibility & Mobile**
   - Add keyboard shortcut help modal tied to `?` key.
   - Provide a compact toolbar layout for ≤768px screens (horizontal scrollable chip list).
