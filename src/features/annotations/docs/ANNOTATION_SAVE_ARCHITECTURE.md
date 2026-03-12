# Annotation Save Feature - Architecture Diagram

## Component Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    IssueAttachmentsView (Parent)                    │
│  • Manages annotation state & canvas state                          │
│  • Props: issueId, attachments, annotationThreads                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Props: saveStatus, saveError
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     CenteredCanvasView                              │
│  • Container for canvas + overlays                                  │
│  • Passes save state to indicator                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  CanvasStateIndicator                               │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  [Icon] Message                                             │    │
│  │  • Idle:    [Dot]      "Drag to pan · Scroll to zoom"     │    │
│  │  • Saving:  [Spinner]  "Saving annotation..."             │    │
│  │  • Success: [Check]    "Annotation saved"                  │    │
│  │  • Error:   [Alert]    "Failed to save annotation"        │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Hook Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              IssueAttachmentsView Component                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  useAnnotationSave()                                      │      │
│  │  ├─ saveState: { status, error, lastSavedAt }           │      │
│  │  ├─ saveAnnotationPosition(params)                       │      │
│  │  ├─ createNewAnnotation(params)                          │      │
│  │  └─ isSaving: boolean                                    │      │
│  └──────────────┬───────────────────────────────────────────┘      │
│                 │                                                   │
│                 │ Calls                                             │
│                 ↓                                                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  Mock API Layer                                           │      │
│  │  src/features/annotations/api/save-annotation.ts          │      │
│  │  ├─ saveAnnotationPosition() → 300-600ms delay           │      │
│  │  ├─ createAnnotation() → 400-700ms delay                 │      │
│  │  └─ 5% random error rate for testing                     │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State Machine

```
                    ┌─────────────┐
                    │    IDLE     │
                    │  (default)  │
                    └──────┬──────┘
                           │
                           │ User drags annotation
                           │ & releases mouse
                           ↓
                    ┌─────────────┐
                    │   SAVING    │ ← Show spinner + "Saving..."
                    │  (API call) │   Blue border
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        Success (95%)             Error (5%)
              │                         │
              ↓                         ↓
    ┌─────────────────┐       ┌──────────────────┐
    │    SUCCESS      │       │      ERROR       │
    │  "Saved" ✓      │       │  "Failed" ⚠      │
    │  Green border   │       │  Red border      │
    └────────┬────────┘       └────────┬─────────┘
             │                         │
             │  Auto-reset after 2s    │
             │                         │
             └────────────┬────────────┘
                          │
                          ↓
                    ┌─────────────┐
                    │    IDLE     │
                    └─────────────┘
```

## Event Flow: Moving Annotation

```
1. USER ACTION
   User drags annotation pin/box
        │
        ↓
2. DRAG START
   handleAnnotationMove()
   • Track initial shape
   • Store in annotationDragState.current
        │
        ↓
3. DRAG ACTIVE
   handleAnnotationMove() (multiple times)
   • Update visual position immediately
   • Call onAnnotationMove() for smooth dragging
   • NO API calls yet
        │
        ↓
4. DRAG END
   handleAnnotationMoveComplete()
   • Compare initial vs final shape
   • If changed → Add to history
        │
        ↓
5. SAVE TO API
   await saveAnnotationPosition({ issueId, attachmentId, annotationId, shape })
   • saveState.status = 'saving'
   • CanvasStateIndicator shows spinner
        │
        ├──→ SUCCESS (300-600ms later)
        │    • saveState.status = 'success'
        │    • CanvasStateIndicator shows checkmark
        │    • Optional toast: "Annotation saved"
        │    • Auto-reset after 2s
        │
        └──→ ERROR (5% chance)
             • saveState.status = 'error'
             • CanvasStateIndicator shows error
             • Optional toast: error message
             • Auto-reset after 2s
```

## Event Flow: Creating Annotation

```
1. USER ACTION
   User draws new annotation (pin/box)
        │
        ↓
2. DRAFT CREATION
   handlePointerDown() in AnnotationCanvas
   • createDraft({ id, tool, shape })
   • Start tracking pointer
        │
        ↓
3. DRAFT UPDATE
   handlePointerMove()
   • updateDraft({ ...draft, shape: updatedShape })
   • Show preview on canvas
        │
        ↓
4. DRAFT COMMIT
   handlePointerUp()
   • Show comment input (if required)
   • User adds optional description
   • commitDraft(draft, message)
        │
        ↓
5. SAVE TO API
   await createNewAnnotation({
     issueId,
     attachmentId,
     shape: draft.shape,
     label: nextLabel,
     description: message
   })
   • saveState.status = 'saving'
   • CanvasStateIndicator shows spinner
        │
        ├──→ SUCCESS (400-700ms later)
        │    • saveState.status = 'success'
        │    • CanvasStateIndicator shows checkmark
        │    • Optional toast: "Annotation created"
        │    • Add to history stack
        │    • Auto-reset after 2s
        │
        └──→ ERROR (3% chance)
             • saveState.status = 'error'
             • CanvasStateIndicator shows error
             • Optional toast: error message
             • Auto-reset after 2s
```

## File Structure

```
src/features/
├── annotations/
│   ├── api/
│   │   └── save-annotation.ts           ← NEW: Mock API for save operations
│   │
│   ├── hooks/
│   │   ├── use-annotation-tools.ts
│   │   ├── use-annotation-drafts.ts
│   │   └── use-annotation-save.ts       ← NEW: Save state management
│   │
│   ├── components/
│   │   ├── annotation-layer.tsx
│   │   ├── annotation-pin.tsx
│   │   ├── annotation-box.tsx
│   │   ├── annotation-canvas.tsx
│   │   └── annotation-toolbar.tsx
│   │
│   ├── types/
│   │   ├── annotation.ts                ← MODIFIED: Added save types
│   │   └── index.ts                     ← MODIFIED: Export save types
│   │
│   └── index.ts                         ← MODIFIED: Export useAnnotationSave
│
└── issues/
    └── components/
        ├── canvas-state-indicator.tsx   ← MODIFIED: Added save status UI
        ├── centered-canvas-view.tsx     ← MODIFIED: Pass save state down
        └── optimized-attachment-view.tsx ← MODIFIED: Integrated save hook
```

## Type Hierarchy

```typescript
// Core Save Types
interface AnnotationSaveState {
  status: 'idle' | 'saving' | 'success' | 'error'
  error?: string
  lastSavedAt?: number
}

// API Request Types
interface SaveAnnotationPositionParams {
  issueId: string
  attachmentId: string
  annotationId: string
  shape: AnnotationShape  // Pin or Box
  actorId: string         // TODO: From auth context
}

interface CreateAnnotationParams {
  issueId: string
  attachmentId: string
  shape: AnnotationShape
  label: string           // "1", "2", "A", "B"
  description?: string
  actorId: string
}

// API Response Types
interface SaveAnnotationPositionResponse {
  annotation: AttachmentAnnotation
  timestamp: string
}

// Hook Options
interface UseAnnotationSaveOptions {
  onSaveSuccess?: (annotation: AttachmentAnnotation) => void
  onSaveError?: (error: Error) => void
  autoResetDelay?: number   // Default: 2000ms
  enableToasts?: boolean    // Default: false
}

// Hook Return
interface UseAnnotationSaveReturn {
  saveState: AnnotationSaveState
  saveAnnotationPosition: (params) => Promise<void>
  createNewAnnotation: (params) => Promise<void>
  resetSaveState: () => void
  isSaving: boolean
}
```

## Props Cascade

```
IssueAttachmentsView
├─ useAnnotationSave() hook
│  └─ Returns saveState: { status, error, lastSavedAt }
│
└─ <CenteredCanvasView
      saveStatus={saveState.status}     ← Passed down
      saveError={saveState.error}       ← Passed down
   />
   │
   └─ <CanvasStateIndicator
         saveStatus={saveStatus}         ← Received from parent
         saveError={saveError}           ← Received from parent
      />
      │
      └─ Renders based on saveStatus:
         • 'idle'    → Default pan/zoom message
         • 'saving'  → Blue spinner + "Saving annotation..."
         • 'success' → Green check + "Annotation saved"
         • 'error'   → Red alert + error message
```

## Testing Strategy

### Unit Tests (TODO)
```typescript
describe('useAnnotationSave', () => {
  it('should start in idle state')
  it('should transition to saving on save call')
  it('should transition to success after API success')
  it('should transition to error on API failure')
  it('should auto-reset after delay')
  it('should prevent concurrent saves')
  it('should show toasts when enabled')
})

describe('CanvasStateIndicator', () => {
  it('should render idle state by default')
  it('should render saving state with spinner')
  it('should render success state with checkmark')
  it('should render error state with alert icon')
  it('should prioritize save status over custom message')
})
```

### Integration Tests (TODO)
```typescript
describe('Annotation Save Flow', () => {
  it('should save annotation position on drag complete')
  it('should save new annotation on draft commit')
  it('should show error state on network failure')
  it('should auto-reset to idle after success')
  it('should update history on successful save')
})
```

### E2E Tests (TODO)
```typescript
describe('Annotation Save E2E', () => {
  it('user can create annotation and see save indicator')
  it('user can move annotation and see save indicator')
  it('user sees error state on network failure')
  it('user can retry after error')
})
```

## Performance Optimizations

1. **Debounced Saves**
   - Only save on drag **complete**, not during drag
   - Prevents excessive API calls

2. **Concurrent Save Prevention**
   ```typescript
   const savingRef = useRef<Set<string>>(new Set());
   if (savingRef.current.has(annotationId)) return; // Skip
   ```

3. **Auto-reset Cleanup**
   ```typescript
   useEffect(() => {
     return () => {
       if (resetTimerRef.current) {
         clearTimeout(resetTimerRef.current);
       }
     };
   }, []);
   ```

4. **Minimal Re-renders**
   - `useCallback` for all event handlers
   - `useMemo` for derived state
   - Small, focused components

5. **Tree-shakeable Toasts**
   - Toast import only when `enableToasts: true`
   - No bundle bloat if toasts disabled

## Security Considerations

1. **No Sensitive Data in Client**
   - `actorId` will come from server-side auth context
   - Annotations visible only to authorized users

2. **Server-side Validation (TODO)**
   ```typescript
   // Backend should validate:
   - User has permission to edit annotation
   - Annotation belongs to specified issue
   - Shape data is within valid bounds
   - Issue exists and user has access
   ```

3. **CSRF Protection (TODO)**
   - Use httpOnly cookies for auth
   - Include CSRF token in requests

4. **Rate Limiting (TODO)**
   - Prevent spam saves
   - Max N saves per minute per user

## Accessibility

1. **Visual + Text Indicators**
   - Color (blue/green/red) + icon (spinner/check/alert)
   - Text message for screen readers

2. **Semantic HTML**
   - Proper ARIA labels
   - Focusable elements

3. **Keyboard Support**
   - Undo/redo shortcuts work with save
   - Edit mode toggle: E key

4. **High Contrast**
   - Works in dark mode
   - Sufficient color contrast ratios

---

**Architecture Status**: ✅ Complete
**Follows**: AGENTS.md + AI_MOCKUP_INST.md
**Ready for**: Backend integration + Real database
