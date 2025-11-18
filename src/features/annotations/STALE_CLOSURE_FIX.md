# Stale Closure Fix: Multiple Move Undo Issue

## Problem Description

When moving a pin annotation multiple times in sequence (A→B→C→D), clicking undo would incorrectly return the pin to the original position A instead of the immediate previous position C.

**Expected behavior:**
- Move A→B→C→D
- Undo → Should move to C ✅
- Undo → Should move to B ✅
- Undo → Should move to A ✅

**Actual behavior (before fix):**
- Move A→B→C→D
- Undo → Moves to A ❌

## Root Cause: React Stale Closure

The issue was a **stale closure** problem in the `handleAnnotationMove` callback.

### The Code (Before Fix)

```tsx
const currentAnnotations = useMemo(
  () => (annotationThreads || []).filter(
    (annotation) => annotation.attachmentId === selectedAttachment?.id
  ),
  [annotationThreads, selectedAttachment]
);

const handleAnnotationMove = useCallback(
  (annotationId: string, payload: AnnotationPosition) => {
    if (!annotationDragState.current) {
      const annotation = currentAnnotations.find(ann => ann.id === annotationId);
      //                  ^^^^^^^^^^^^^^^^^^
      //                  This might be STALE!
      
      if (annotation && annotationEditModeEnabled) {
        const initialShape = annotation.shape || { 
          type: 'pin' as const, 
          position: { x: annotation.x, y: annotation.y } 
        };
        annotationDragState.current = {
          annotationId,
          initialShape: { ...initialShape },
          isDragging: true,
        };
      }
    }
    
    onAnnotationMove?.(annotationId, payload);
  },
  [currentAnnotations, annotationEditModeEnabled, onAnnotationMove]
);
```

### Why It Failed

1. **First drag (A→B):**
   - User starts dragging from position A
   - `handleAnnotationMove` executes
   - `currentAnnotations` contains annotation at position A
   - Initial shape captured: `{ position: A }`
   - Drag completes, history entry created: `A → B`
   - `annotationDragState.current = null` (cleared)

2. **Second drag (B→C):**
   - Parent component updates annotation position to B via `onAnnotationMove`
   - Props `annotationThreads` update with new position B
   - BUT: The `handleAnnotationMove` callback was created with `currentAnnotations` in its closure
   - User starts dragging from B
   - `handleAnnotationMove` executes
   - **Problem**: The callback might still reference the OLD `currentAnnotations` from when it was created
   - The memoized `currentAnnotations` might not have been recalculated yet
   - Result: Captures position A instead of position B
   - History entry created: `A → C` (WRONG! Should be `B → C`)

3. **When user clicks Undo:**
   - History says: restore position A
   - Expected: restore position C
   - Result: Pin jumps back to A ❌

### Technical Explanation

React's `useCallback` creates a closure over the dependencies at the time the callback is created. When a dependency changes, React creates a new callback with the updated values. However:

1. `currentAnnotations` is a **memoized value** (from `useMemo`)
2. It depends on `annotationThreads` and `selectedAttachment`
3. When `annotationThreads` updates, both `currentAnnotations` AND `handleAnnotationMove` need to be recreated
4. **Timing issue**: Between when the annotation updates and when the next drag starts, the callback might not have been recreated yet
5. Or the `useMemo` might not have recalculated yet
6. Result: The callback reads stale data

## The Solution

Read directly from `annotationThreads` (the prop) instead of the memoized `currentAnnotations`:

```tsx
const handleAnnotationMove = useCallback(
  (annotationId: string, payload: AnnotationPosition) => {
    if (!annotationDragState.current) {
      // ✅ Read directly from props (always fresh)
      const annotation = (annotationThreads || [])
        .filter(ann => ann.attachmentId === selectedAttachment?.id)
        .find(ann => ann.id === annotationId);

      if (annotation && annotationEditModeEnabled) {
        const initialShape = annotation.shape || {
          type: 'pin' as const,
          position: { x: annotation.x, y: annotation.y }
        };
        annotationDragState.current = {
          annotationId,
          initialShape: { ...initialShape },
          isDragging: true,
        };
      }
    }

    onAnnotationMove?.(annotationId, payload);
  },
  // ✅ Updated dependencies
  [annotationThreads, selectedAttachment?.id, annotationEditModeEnabled, onAnnotationMove]
);
```

### Why This Works

1. **Direct prop access**: Props are always up-to-date in React
2. **No intermediate memoization**: We skip the `currentAnnotations` memoization layer
3. **Fresh data guarantee**: When the callback executes, it reads the current value of `annotationThreads` from props
4. **Correct dependency array**: Callback is recreated when `annotationThreads` changes

### Flow After Fix

1. **First drag (A→B):**
   - Callback reads `annotationThreads` → finds annotation at A
   - Captures: `{ position: A }`
   - Completes: History entry `A → B` ✅

2. **Second drag (B→C):**
   - Parent updates annotation to B
   - `annotationThreads` prop updates
   - User starts new drag
   - Callback executes and reads `annotationThreads` **at execution time**
   - Finds annotation at B (fresh data!) ✅
   - Captures: `{ position: B }`
   - Completes: History entry `B → C` ✅

3. **Third drag (C→D):**
   - Same pattern
   - Captures: `{ position: C }`
   - Completes: History entry `C → D` ✅

4. **Undo:**
   - History stack: `[A→B, B→C, C→D]`
   - Pop last entry: `C → D`
   - Restore: position C ✅

## Files Changed

### [optimized-attachment-view.tsx:239-263](../issues/components/optimized-attachment-view.tsx#L239-L263)

```diff
  const handleAnnotationMove = useCallback(
    (annotationId: string, payload: AnnotationPosition) => {
-     // Track initial state on first move
      if (!annotationDragState.current) {
-       const annotation = currentAnnotations.find(ann => ann.id === annotationId);
+       // Read the most current annotation state from annotationThreads
+       // Use annotationThreads directly to avoid stale closure over currentAnnotations
+       const annotation = (annotationThreads || [])
+         .filter(ann => ann.attachmentId === selectedAttachment?.id)
+         .find(ann => ann.id === annotationId);
        
        if (annotation && annotationEditModeEnabled) {
          const initialShape = annotation.shape || { type: 'pin' as const, position: { x: annotation.x, y: annotation.y } };
          annotationDragState.current = {
            annotationId,
            initialShape: { ...initialShape },
            isDragging: true,
          };
        }
      }
      
      onAnnotationMove?.(annotationId, payload);
    },
-   [currentAnnotations, annotationEditModeEnabled, onAnnotationMove]
+   [annotationThreads, selectedAttachment?.id, annotationEditModeEnabled, onAnnotationMove]
  );
```

### [optimized-attachment-view.tsx:288-320](../issues/components/optimized-attachment-view.tsx#L288-L320)

Same fix applied to `handleBoxAnnotationMove`.

## Key Lessons

### 1. Props vs Memoized Values in Callbacks

**For display/rendering** (component body):
```tsx
// ✅ Use memoized values to avoid expensive recomputations
const filteredItems = useMemo(
  () => items.filter(predicate),
  [items, predicate]
);

return <List items={filteredItems} />;
```

**For event handlers** (callbacks):
```tsx
// ✅ Access props directly for freshest data
const handleClick = useCallback(() => {
  const item = items.find(predicate);  // Direct prop access
  //            ^^^^^
  //            Always fresh!
}, [items, predicate]);
```

### 2. Dependency Array Importance

```tsx
// ❌ Bad: Derived value in dependencies
const derived = useMemo(() => process(props), [props]);
const handler = useCallback(() => {
  use(derived);  // Might be stale
}, [derived]);

// ✅ Good: Original props in dependencies
const handler = useCallback(() => {
  const derived = process(props);  // Recompute on each call
  use(derived);  // Always fresh
}, [props]);
```

### 3. When Memoization Can Cause Issues

```tsx
// ❌ Problematic pattern
const memoizedData = useMemo(() => transform(props.data), [props.data]);

const handleEvent = useCallback(() => {
  const item = memoizedData.find(...);  // Might lag behind props.data
  //           ^^^^^^^^^^^^^
  //           Depends on useMemo recalculation timing
}, [memoizedData]);

// ✅ Better pattern
const handleEvent = useCallback(() => {
  const item = props.data.find(...);  // Direct prop access
  //           ^^^^^^^^^^
  //           Guaranteed fresh
}, [props.data]);
```

## Testing the Fix

### Manual Test

1. Enter annotation edit mode
2. Create a pin annotation at position A
3. Drag to position B
4. Drag to position C  
5. Drag to position D
6. Press `Cmd+Z` → Should move to C ✅
7. Press `Cmd+Z` → Should move to B ✅
8. Press `Cmd+Z` → Should move to A ✅
9. Press `Cmd+Shift+Z` → Should move to B ✅
10. Press `Cmd+Shift+Z` → Should move to C ✅

### Automated Test

```tsx
it('should track multiple consecutive moves correctly', () => {
  const { result } = renderHook(() => useAnnotationTools());
  const history: AnnotationHistoryEntry[] = [];
  
  result.current.onPushHistory = (entry) => history.push(entry);

  // Simulate 3 consecutive moves
  act(() => {
    // Move A→B
    handleAnnotationMove('pin-1', { x: 0.2, y: 0.2 });
    handleAnnotationMoveComplete('pin-1', { x: 0.2, y: 0.2 });
    
    // Update parent state to B
    updateAnnotationPosition('pin-1', { x: 0.2, y: 0.2 });
    
    // Move B→C
    handleAnnotationMove('pin-1', { x: 0.4, y: 0.4 });
    handleAnnotationMoveComplete('pin-1', { x: 0.4, y: 0.4 });
    
    // Update parent state to C
    updateAnnotationPosition('pin-1', { x: 0.4, y: 0.4 });
    
    // Move C→D
    handleAnnotationMove('pin-1', { x: 0.6, y: 0.6 });
    handleAnnotationMoveComplete('pin-1', { x: 0.6, y: 0.6 });
  });

  // Verify history entries
  expect(history).toHaveLength(3);
  expect(history[0].previousSnapshot.shape.position).toEqual({ x: 0.1, y: 0.1 }); // A
  expect(history[0].snapshot.shape.position).toEqual({ x: 0.2, y: 0.2 }); // B
  
  expect(history[1].previousSnapshot.shape.position).toEqual({ x: 0.2, y: 0.2 }); // B ✅
  expect(history[1].snapshot.shape.position).toEqual({ x: 0.4, y: 0.4 }); // C
  
  expect(history[2].previousSnapshot.shape.position).toEqual({ x: 0.4, y: 0.4 }); // C ✅
  expect(history[2].snapshot.shape.position).toEqual({ x: 0.6, y: 0.6 }); // D

  // Undo should restore C
  act(() => result.current.undo());
  expect(getCurrentPosition('pin-1')).toEqual({ x: 0.4, y: 0.4 }); // C ✅
});
```

## Related Issues

This fix also resolves similar issues with:
- Box annotation moves
- Box annotation resizes
- Any operation that captures state at the start of a drag

## Performance Impact

**Before:**
- One memoization layer (`currentAnnotations`)
- Potential for stale data

**After:**
- Direct prop filtering on each drag start
- Slightly more computation, but:
  - Only happens at START of drag (not during)
  - Negligible performance impact (array filter is fast)
  - Correctness is more important than micro-optimization

## Summary

The stale closure issue was caused by reading from a memoized value instead of directly from props. The fix ensures we always read fresh data by accessing `annotationThreads` directly in the callback, guaranteeing correct history tracking for consecutive move operations.

**Golden Rule**: In event handlers that need fresh data, prefer accessing props directly over memoized derived values.
