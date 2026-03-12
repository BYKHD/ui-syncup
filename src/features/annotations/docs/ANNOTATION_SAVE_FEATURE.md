# Annotation Save Feature Implementation

## Overview

Implemented a complete **Ready-to-Wire Visual UI mockup** for saving annotation positions when users edit and exit edit mode. The feature includes visual feedback through the canvas state indicator and optional toast notifications.

## ✨ Features Implemented

### 1. Save State Management
- **Idle**: Default state when no save operation is active
- **Saving**: Shows loading spinner during API call (300-600ms simulated delay)
- **Success**: Green checkmark with "Annotation saved" message
- **Error**: Red error icon with error message (5% random failure for testing)

### 2. Visual Feedback Components
- **Canvas State Indicator** updates in real-time with save status
- Color-coded states:
  - Blue for saving (with spinner animation)
  - Green for success
  - Red for errors
  - Default gray for pan/zoom instructions

### 3. Mock API Integration
- Simulated backend with realistic network delays
- 5% random error rate for testing error handling
- Supports both pin and box annotation types
- Automatic ID generation and timestamp tracking

### 4. Toast Notifications (Optional)
- Success: "Annotation saved" / "Annotation created"
- Error: Displays specific error message
- Can be enabled per component with `enableToasts` flag

## 📁 Files Created

### Core Types
**`src/features/annotations/types/annotation.ts`**
- Added `AnnotationSaveStatus` type: `'idle' | 'saving' | 'success' | 'error'`
- Added `AnnotationSaveState` interface with status, error, and lastSavedAt
- Added `AnnotationSaveOperation` interface for tracking save operations

### Mock API
**`src/features/annotations/api/save-annotation.ts`**
```typescript
// Two main functions:
saveAnnotationPosition(params) // Updates existing annotation position
createAnnotation(params)        // Creates new annotation

// Features:
- Simulated 300-600ms network delay
- 5% random failure rate for error testing
- Proper shape handling for both pin and box types
- Backward compatible x, y coordinate extraction
```

### Save Hook
**`src/features/annotations/hooks/use-annotation-save.ts`**
```typescript
interface UseAnnotationSaveOptions {
  onSaveSuccess?: (annotation) => void
  onSaveError?: (error) => void
  autoResetDelay?: number      // Default: 2000ms
  enableToasts?: boolean       // Default: false
}

// Returns:
- saveState: { status, error?, lastSavedAt? }
- saveAnnotationPosition()
- createNewAnnotation()
- resetSaveState()
- isSaving: boolean
```

Key features:
- Prevents concurrent saves for same annotation
- Auto-resets to idle after success/error (configurable delay)
- Debounces rapid save operations
- Optional Sonner toast integration

## 📝 Files Modified

### 1. Canvas State Indicator
**`src/features/issues/components/canvas-state-indicator.tsx`**

Before:
```tsx
<CanvasStateIndicator pointerPanEnabled={true} />
```

After:
```tsx
<CanvasStateIndicator
  pointerPanEnabled={true}
  saveStatus="saving"      // 'idle' | 'saving' | 'success' | 'error'
  saveError="Failed..."    // Optional error message
/>
```

Visual states:
- **Saving**: Blue border, spinning loader icon, "Saving annotation..."
- **Success**: Green border, checkmark icon, "Annotation saved"
- **Error**: Red border, alert icon, error message
- **Idle**: Default border, pulsing dot, pan/zoom instructions

### 2. Centered Canvas View
**`src/features/issues/components/centered-canvas-view.tsx`**

Added props to pass save state down:
```tsx
interface CenteredCanvasViewProps {
  // ... existing props
  saveStatus?: AnnotationSaveStatus
  saveError?: string
}
```

### 3. Optimized Attachment View
**`src/features/issues/components/optimized-attachment-view.tsx`**

Integrated save functionality:

```tsx
// 1. Added save hook
const { saveState, saveAnnotationPosition, createNewAnnotation } = useAnnotationSave({
  onSaveSuccess: (annotation) => console.log('Saved:', annotation),
  onSaveError: (error) => console.error('Error:', error),
});

// 2. Updated draft commit to save new annotations
const { commitDraft } = useAnnotationDrafts({
  onCommit: async (draft, message) => {
    await createNewAnnotation({
      issueId,
      attachmentId: selectedAttachment.id,
      shape: draft.shape,
      label: nextLabel,
      description: message,
    });
  },
});

// 3. Updated move complete handlers to save position changes
const handleAnnotationMoveComplete = async (annotationId, finalPosition) => {
  // ... existing history logic

  if (hasChanged && selectedAttachment) {
    await saveAnnotationPosition({
      issueId,
      attachmentId: selectedAttachment.id,
      annotationId,
      shape: finalShape,
    });
  }
};

const handleBoxAnnotationMoveComplete = async (annotationId, finalStart, finalEnd) => {
  // ... existing history logic

  if (hasChanged && selectedAttachment) {
    await saveAnnotationPosition({
      issueId,
      attachmentId: selectedAttachment.id,
      annotationId,
      shape: finalShape,
    });
  }
};

// 4. Pass save state to CenteredCanvasView
<CenteredCanvasView
  {...otherProps}
  saveStatus={saveState.status}
  saveError={saveState.error}
/>
```

### 4. Annotations Barrel Export
**`src/features/annotations/index.ts`**

Added exports:
```typescript
export { useAnnotationSave } from './hooks/use-annotation-save';
export type { UseAnnotationSaveOptions, UseAnnotationSaveReturn } from './hooks/use-annotation-save';
```

### 5. Types Barrel Export
**`src/features/annotations/types/index.ts`**

Added exports:
```typescript
export type {
  AnnotationSaveStatus,
  AnnotationSaveState,
  AnnotationSaveOperation,
} from './annotation';
export { ANNOTATION_SAVE_STATUS } from './annotation';
```

## 🎯 User Experience Flow

### Creating New Annotation
1. User enters edit mode (Press E or click edit button)
2. User selects pin/box tool
3. User draws annotation on canvas
4. User adds optional comment
5. **Canvas indicator shows "Saving annotation..."** (blue, spinning)
6. Mock API simulates save (400-700ms)
7. **Canvas indicator shows "Annotation saved"** (green, checkmark)
8. Auto-resets to default state after 2 seconds

### Moving Existing Annotation
1. User enters edit mode
2. User drags pin or resizes box
3. User releases mouse (drag complete)
4. **Canvas indicator shows "Saving annotation..."** (blue, spinning)
5. Mock API simulates save (300-600ms)
6. **Canvas indicator shows "Annotation saved"** (green, checkmark)
7. Auto-resets to default state after 2 seconds

### Error Handling
1. Random 5% failure rate in mock API
2. **Canvas indicator shows error** (red, alert icon)
3. Error message displayed: "Network error: Failed to save annotation position"
4. Optional toast notification shows same error
5. Auto-resets to default state after 2 seconds
6. User can retry by moving annotation again

## 🔧 Configuration Options

### Enable Toast Notifications
```tsx
const { saveState, ... } = useAnnotationSave({
  enableToasts: true,  // Show success/error toasts
  autoResetDelay: 3000, // Reset after 3 seconds
  onSaveSuccess: (annotation) => {
    // Custom success handling
    updateLocalState(annotation);
  },
  onSaveError: (error) => {
    // Custom error handling
    logError(error);
  },
});
```

### Adjust Error Rate for Testing
Edit `src/features/annotations/api/save-annotation.ts`:
```typescript
// Line 38: Increase error rate for testing
if (Math.random() < 0.20) {  // 20% failure rate
  throw new Error('Network error: Failed to save annotation position');
}
```

### Adjust Network Delay
Edit `src/features/annotations/api/save-annotation.ts`:
```typescript
// Line 36: Adjust delay range
const delay = 100 + Math.random() * 200;  // 100-300ms (faster)
// or
const delay = 1000 + Math.random() * 1000; // 1-2 seconds (slower)
```

## 🎨 Architecture Alignment

Following **AGENTS.md** and **AI_MOCKUP_INST.md** guidelines:

✅ **Feature-first structure**: All code in `src/features/annotations/`
✅ **Strict layering**: API → Hooks → Components → Pages
✅ **Typed boundaries**: Full TypeScript with discriminated unions
✅ **Pure UI components**: No business logic in presentation layer
✅ **Mock data pattern**: Follows `src/mocks/` conventions
✅ **shadcn/ui composition**: Uses Sonner toast primitives
✅ **State coverage**: Idle, loading, success, error states
✅ **Accessibility**: Semantic icons, color + text indicators
✅ **Responsiveness**: Works on all screen sizes

## 🚀 Next Steps (Future Implementation)

### 1. Wire to Real Backend
Replace mock API in `save-annotation.ts`:
```typescript
export async function saveAnnotationPosition(params) {
  const response = await fetch(`/api/issues/${params.issueId}/annotations/${params.annotationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shape: params.shape }),
  });
  return response.json();
}
```

### 2. Add Auth Context
Replace hardcoded `actorId` with real user:
```typescript
import { useSession } from '@/features/auth';

const { user } = useSession();
const actorId = user?.id || 'anonymous';
```

### 3. Add Optimistic Updates
Update local state immediately, rollback on error:
```typescript
onSaveSuccess: (annotation) => {
  setAnnotations(prev => prev.map(a =>
    a.id === annotation.id ? annotation : a
  ));
},
onSaveError: (error) => {
  // Rollback to previous position
  revertAnnotation(annotationId);
},
```

### 4. Add Delete Operation
Extend save hook with delete support:
```typescript
const { deleteAnnotation } = useAnnotationSave();

await deleteAnnotation({
  issueId,
  attachmentId,
  annotationId,
});
```

### 5. Add Batch Save
Save multiple annotations in one request:
```typescript
const { saveBatchAnnotations } = useAnnotationSave();

await saveBatchAnnotations({
  issueId,
  attachmentId,
  updates: [
    { annotationId: 'ann_1', shape: {...} },
    { annotationId: 'ann_2', shape: {...} },
  ],
});
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create new pin annotation → See saving indicator → Success
- [ ] Create new box annotation → See saving indicator → Success
- [ ] Move pin annotation → See saving indicator → Success
- [ ] Resize box annotation → See saving indicator → Success
- [ ] Trigger error (reload page during save) → See error indicator
- [ ] Auto-reset after 2 seconds → Indicator returns to default
- [ ] Enable toasts → See toast notifications
- [ ] Dark mode → Indicators have proper contrast

### Edge Cases Covered
- ✅ Prevent concurrent saves for same annotation
- ✅ Handle unmount during save (cleanup in useEffect)
- ✅ Handle missing issueId/attachmentId gracefully
- ✅ Debounce rapid moves (only save on drag complete)
- ✅ Show error message in indicator
- ✅ Auto-reset timer cleanup on unmount

## 📊 Performance Considerations

- **Debounced saves**: Only save on drag complete, not every mousemove
- **Concurrent save prevention**: Uses Set to track in-flight saves
- **Auto-reset cleanup**: Clears timers on unmount
- **Minimal re-renders**: useCallback and useMemo optimization
- **Small bundle size**: Optional toast import (tree-shakeable)

## 🎓 Developer Notes

### Why Mock API?
Per AI_MOCKUP_INST.md:
> "When mock data is required to visualize UI, follow the mocks guidelines defined by AGENTS.md."

The mock API allows:
1. **Visual prototype**: Test UX without backend dependency
2. **Error testing**: Random failures help test error states
3. **Performance testing**: Adjustable delays simulate slow networks
4. **Isolated development**: Frontend team can work independently

### Why Not Use IssueUpdatePayload?
The existing `IssueUpdatePayload` is too generic:
```typescript
interface IssueUpdatePayload {
  field: string;    // Would be 'annotations'
  value: any;       // Would need entire annotations array
  actorId: string;
}
```

This approach requires:
- Sending entire annotations array on each update
- Handling array index updates
- Potential race conditions with concurrent updates

The dedicated annotation API is:
- More efficient (single annotation update)
- Better typed (specific shape parameter)
- Easier to extend (add comments, delete, batch operations)

---

**Implementation Date**: 2025-11-13
**Status**: ✅ Ready to Wire (DoRW)
**Framework**: Next.js 15 + TypeScript + shadcn/ui
**Mock API**: Sonner toast + simulated backend
