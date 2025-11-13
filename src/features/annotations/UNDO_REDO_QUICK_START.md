# Quick Start: Undo/Redo for Annotations

This guide shows you the quickest way to add undo/redo functionality to your annotations.

## 🚀 Simple Implementation (3 Steps)

### Step 1: Use the hooks

```tsx
import {
  useAnnotationTools,
  useAnnotationsWithHistory,
  AnnotationToolbar,
  AnnotationLayer,
  AnnotationCanvas,
} from '@/features/annotations';

function MyComponent() {
  // Step 1a: Set up history manager
  const {
    annotations,
    handleAnnotationMove,
    handleBoxAnnotationMove,
    applyUndo,
    applyRedo,
  } = useAnnotationsWithHistory({
    initialAnnotations: [],
  });

  // Step 1b: Set up toolbar with undo/redo
  const {
    tools,
    activeTool,
    editModeEnabled,
    canUndo,
    canRedo,
    selectTool,
    toggleEditMode,
    undo,
    redo,
    pushHistory,
  } = useAnnotationTools({
    initialTool: 'box',
    onUndo: applyUndo,  // Connect undo handler
    onRedo: applyRedo,  // Connect redo handler
  });

  // ... rest of your component
}
```

### Step 2: Connect the toolbar

```tsx
<AnnotationToolbar
  activeTool={activeTool}
  tools={tools}
  editModeEnabled={editModeEnabled}
  canUndo={canUndo}          // ← These control button states
  canRedo={canRedo}          // ←
  onToolChange={selectTool}
  onToggleEditMode={toggleEditMode}
  onUndo={undo}              // ← Already wired to keyboard shortcuts
  onRedo={redo}              // ←
/>
```

### Step 3: Connect the annotation layer

```tsx
<AnnotationLayer
  annotations={annotations}
  overlayRef={overlayRef}
  onMove={handleAnnotationMove}        // ← Handles pin moves with history
  onBoxMove={handleBoxAnnotationMove}  // ← Handles box moves/resizes with history
  // ... other props
/>
```

## ✅ That's it!

You now have:
- ✅ Undo/Redo buttons in the toolbar (enabled/disabled automatically)
- ✅ Keyboard shortcuts: `Cmd+Z` / `Ctrl+Z` for undo, `Cmd+Shift+Z` / `Ctrl+Y` for redo
- ✅ Full history tracking for moves and resizes
- ✅ Automatic history limit (50 actions)

## 📝 Complete Example

```tsx
import { useRef } from 'react';
import {
  useAnnotationTools,
  useAnnotationsWithHistory,
  AnnotationToolbar,
  AnnotationLayer,
  AnnotationCanvas,
} from '@/features/annotations';

export function AnnotationExample() {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Manage annotations with history
  const {
    annotations,
    handleAnnotationMove,
    handleBoxAnnotationMove,
    handleAnnotationCreate,
    applyUndo,
    applyRedo,
  } = useAnnotationsWithHistory({
    initialAnnotations: [],
  });

  // Manage toolbar and tools
  const {
    tools,
    activeTool,
    editModeEnabled,
    canUndo,
    canRedo,
    selectTool,
    toggleEditMode,
    undo,
    redo,
    pushHistory,
    handToolActive,
  } = useAnnotationTools({
    initialTool: 'box',
    onUndo: applyUndo,
    onRedo: applyRedo,
  });

  return (
    <div className="relative h-screen w-screen">
      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-20">
        <AnnotationToolbar
          activeTool={activeTool}
          tools={tools}
          editModeEnabled={editModeEnabled}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={selectTool}
          onToggleEditMode={toggleEditMode}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      {/* Canvas and layers */}
      <div ref={overlayRef} className="relative h-full w-full">
        <AnnotationCanvas
          overlayRef={overlayRef}
          activeTool={activeTool}
          editModeEnabled={editModeEnabled}
          handToolActive={handToolActive}
          onDraftCommit={(draft) => {
            // Handle creating new annotation
            const newAnnotation = {
              id: draft.id,
              attachmentId: 'some-attachment-id',
              label: String(annotations.length + 1),
              x: 0.5,
              y: 0.5,
              shape: draft.shape,
              author: { id: '1', name: 'Current User' },
              createdAt: new Date().toISOString(),
            };
            handleAnnotationCreate(newAnnotation);
          }}
        />

        <AnnotationLayer
          annotations={annotations}
          overlayRef={overlayRef}
          interactive={editModeEnabled}
          onMove={handleAnnotationMove}
          onBoxMove={handleBoxAnnotationMove}
        />
      </div>
    </div>
  );
}
```

## 🎮 User Experience

### Keyboard Shortcuts
- **`E`**: Toggle edit mode
- **`1` or `C`**: Select cursor tool
- **`2` or `P`**: Select pin tool
- **`3` or `B`**: Select box tool
- **`Cmd+Z` / `Ctrl+Z`**: Undo
- **`Cmd+Shift+Z` / `Ctrl+Y`**: Redo

### Toolbar Buttons
- Undo/Redo buttons automatically enable/disable based on history state
- Moving or resizing annotations automatically adds to history
- New actions clear the redo stack

## 🔧 Advanced: Custom State Management

If you're managing annotations externally (e.g., in a parent component or Redux), you can use the core hooks separately:

```tsx
import { useAnnotationTools, createHistoryEntry, createSnapshot } from '@/features/annotations';

function MyComponent() {
  const [annotations, setAnnotations] = useState(externalAnnotations);

  // Custom undo handler
  const handleUndo = (entry) => {
    // Your custom logic here
    if (entry.action === 'move' && entry.previousSnapshot) {
      setAnnotations(prev =>
        prev.map(ann =>
          ann.id === entry.annotationId
            ? { ...ann, shape: entry.previousSnapshot.shape }
            : ann
        )
      );
    }
  };

  const { undo, redo, pushHistory, ... } = useAnnotationTools({
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  // Your custom move handler
  const handleMove = (id, position) => {
    const annotation = annotations.find(a => a.id === id);
    const prevSnapshot = createSnapshot(id, annotation.shape);

    // Update state
    setAnnotations(prev => /* ... */);

    // Push to history
    const newSnapshot = createSnapshot(id, newShape);
    pushHistory(createHistoryEntry('move', id, newSnapshot, prevSnapshot));
  };
}
```

## 📚 See Also

- [Full Implementation Guide](./UNDO_REDO_IMPLEMENTATION.md) - Detailed architecture and API reference
- [Annotation Types](./types/annotation.ts) - TypeScript type definitions
- [History Manager](./utils/history-manager.ts) - Core utility functions

# Annotation Undo/Redo Best Practices

## ✅ Best Practice: Capture History on Action Completion

When implementing undo/redo for drag operations, **only create history entries when the user completes an action**, not during intermediate steps.

### ❌ Wrong: Capture on Every Move

```tsx
// BAD: Creates history for every pixel moved during drag
const handleMove = (id, position) => {
  const previous = getCurrentShape(id);
  const historyEntry = createHistoryEntry('move', id, newShape, previous);
  pushHistory(historyEntry);  // ← Creates 100+ entries during one drag!
  applyMove(id, position);
};
```

**Problems:**
- Clutters undo stack with hundreds of entries
- Single "undo" only moves annotation by 1 pixel
- User has to press Cmd+Z hundreds of times to undo one drag
- Poor user experience and confusing behavior

### ✅ Correct: Capture on Drag Complete

```tsx
// GOOD: Capture initial state, then create ONE history entry when done
const dragState = useRef(null);

const handleMove = (id, position) => {
  // On first move, capture initial state
  if (!dragState.current) {
    dragState.current = {
      id,
      initialShape: getCurrentShape(id),
    };
  }

  // Always apply move immediately (smooth dragging)
  applyMove(id, position);
};

// When drag completes, create ONE history entry
useEffect(() => {
  const handlePointerUp = () => {
    if (dragState.current) {
      const { id, initialShape } = dragState.current;
      const finalShape = getCurrentShape(id);

      // Create single history entry for entire drag
      if (shapesChanged(initialShape, finalShape)) {
        const entry = createHistoryEntry('move', id, finalShape, initialShape);
        pushHistory(entry);
      }

      dragState.current = null;
    }
  };

  window.addEventListener('pointerup', handlePointerUp);
  return () => window.removeEventListener('pointerup', handlePointerUp);
}, []);
```

**Benefits:**
- Clean, predictable undo stack
- One undo = undo entire drag operation
- Matches user mental model
- Better performance (fewer history entries)

## Implementation Example

See the reference implementation in [optimized-attachment-view.tsx:239-319](../issues/components/optimized-attachment-view.tsx#L239-L319):

```tsx
// Track drag state
const annotationDragState = useRef<{
  annotationId: string;
  initialShape: AnnotationShape;
  isDragging: boolean;
} | null>(null);

// On first move: capture initial state
const handleMove = useCallback((id, position) => {
  if (!annotationDragState.current) {
    const annotation = annotations.find(a => a.id === id);
    if (annotation?.shape) {
      annotationDragState.current = {
        annotationId: id,
        initialShape: { ...annotation.shape },
        isDragging: true,
      };
    }
  }

  // Apply move immediately
  applyMove(id, position);
}, [annotations]);

// On pointer up: create history entry
useEffect(() => {
  const handlePointerUp = () => {
    if (annotationDragState.current) {
      const { annotationId, initialShape } = annotationDragState.current;
      const finalShape = getCurrentShape(annotationId);

      // Only create history if position changed
      if (JSON.stringify(initialShape) !== JSON.stringify(finalShape)) {
        const entry = createHistoryEntry(
          'move',
          annotationId,
          createSnapshot(annotationId, finalShape),
          createSnapshot(annotationId, initialShape)
        );
        pushHistory(entry);
      }

      annotationDragState.current = null;
    }
  };

  window.addEventListener('pointerup', handlePointerUp);
  return () => window.removeEventListener('pointerup', handlePointerUp);
}, []);
```

## When to Create History Entries

| Operation | When to Capture | Example |
|-----------|----------------|---------|
| **Drag/Move** | On pointer up | User drags annotation → releases mouse → ONE history entry |
| **Resize** | On pointer up | User drags resize handle → releases → ONE history entry |
| **Create** | On commit | User finishes drawing → submits comment → ONE history entry |
| **Delete** | Immediately | User presses delete → IMMEDIATE history entry |
| **Batch Edit** | On complete | User selects multiple → moves all → ONE entry for group |

## Additional Optimizations

### 1. Detect if Position Actually Changed

```tsx
const hasChanged = JSON.stringify(initialShape) !== JSON.stringify(finalShape);
if (hasChanged) {
  pushHistory(entry);  // Only create history if something changed
}
```

### 2. Debounce Rapid Operations

```tsx
// For operations like continuous resizing via keyboard
const debouncedPushHistory = useMemo(
  () => debounce((entry) => pushHistory(entry), 500),
  [pushHistory]
);
```

### 3. Coalesce Similar Operations

```tsx
// If user is repeatedly adjusting the same annotation,
// you might want to coalesce into single entry
const shouldCoalesce =
  lastHistoryEntry?.annotationId === currentId &&
  Date.now() - lastHistoryEntry.timestamp < 1000;

if (shouldCoalesce) {
  updateLastEntry(entry);
} else {
  pushHistory(entry);
}
```

## User Experience Guidelines

### Good Undo Stack
```
1. Created annotation "Box 1"
2. Moved "Box 1" to new position
3. Resized "Box 1"
4. Created annotation "Pin 2"
5. Moved "Pin 2"
```
✅ Clear, understandable actions

### Bad Undo Stack
```
1. Moved "Box 1" by 1px
2. Moved "Box 1" by 1px
3. Moved "Box 1" by 1px
... (98 more entries)
101. Moved "Box 1" by 1px
```
❌ Cluttered, confusing, unusable

## Testing Undo Stack Quality

```tsx
it('should create one history entry per drag operation', () => {
  const { result } = renderHook(() => useAnnotationTools());

  // Simulate drag: 100 move events
  for (let i = 0; i < 100; i++) {
    act(() => {
      handleMove('ann-1', { x: i / 100, y: 0.5 });
    });
  }

  // Complete drag
  act(() => {
    fireEvent.pointerUp(window);
  });

  // Should have exactly ONE history entry
  expect(result.current.history).toHaveLength(1);
  expect(result.current.history[0].action).toBe('move');
});
```

## Common Pitfalls

### ❌ Pitfall 1: Creating History in onMove Handler
```tsx
// BAD
const handleMove = (id, pos) => {
  pushHistory(createEntry('move', id, pos));  // ← Called 100+ times!
  applyMove(id, pos);
};
```

### ✅ Solution: Use Event Listener
```tsx
// GOOD
useEffect(() => {
  const handleComplete = () => {
    pushHistory(createEntry('move', id, finalPos));  // ← Called once!
  };
  window.addEventListener('pointerup', handleComplete);
  return () => window.removeEventListener('pointerup', handleComplete);
}, []);
```

### ❌ Pitfall 2: Not Checking if Position Changed
```tsx
// BAD: Creates history even if position didn't change
onPointerUp(() => {
  pushHistory(entry);  // ← Might be identical to before!
});
```

### ✅ Solution: Compare States
```tsx
// GOOD
onPointerUp(() => {
  if (initialPos !== finalPos) {
    pushHistory(entry);  // ← Only if actually moved
  }
});
```

### ❌ Pitfall 3: Memory Leaks from Event Listeners
```tsx
// BAD: Listener never cleaned up
useEffect(() => {
  window.addEventListener('pointerup', handler);
  // Missing cleanup!
});
```

### ✅ Solution: Always Clean Up
```tsx
// GOOD
useEffect(() => {
  window.addEventListener('pointerup', handler);
  return () => window.removeEventListener('pointerup', handler);  // ← Cleanup!
}, []);
```

## Summary

**Golden Rule**: One user action = One undo operation

- ✅ User drags annotation → Press Cmd+Z → Annotation returns to start position
- ✅ User types in field → Press Cmd+Z → All typing undone
- ✅ User resizes box → Press Cmd+Z → Box returns to original size

This creates a predictable, intuitive undo experience that matches user expectations!

## Related Documentation

- [Implementation Guide](./UNDO_REDO_IMPLEMENTATION.md) - Full architecture details
- [Quick Start](./QUICK_START.md) - Get started in 3 steps
- [Complete Example](./examples/complete-example.tsx) - Working code reference
