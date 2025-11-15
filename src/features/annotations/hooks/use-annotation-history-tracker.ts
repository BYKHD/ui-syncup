import { useCallback, useRef } from 'react';
import type { AnnotationPosition, AnnotationHistoryEntry, AnnotationShape } from '../types';
import { createHistoryEntry, createSnapshot } from '../utils/history-manager';

export interface UseAnnotationHistoryTrackerOptions {
  annotations: Array<{ id: string; shape?: AnnotationShape }>;
  onPushHistory: (entry: AnnotationHistoryEntry) => void;
  enabled: boolean;
}

/**
 * Hook that wraps annotation move handlers to capture history only on action completion.
 *
 * Best practice: Only create history entries when user completes an action (on pointerUp),
 * not during intermediate drag movements. This keeps the undo stack clean and predictable.
 *
 * @example
 * ```tsx
 * const { startTracking, handleMove, handleBoxMove } = useAnnotationHistoryTracker({
 *   annotations: currentAnnotations,
 *   onPushHistory: pushAnnotationHistory,
 *   enabled: annotationEditModeEnabled,
 * });
 *
 * // Use these wrapped handlers instead of calling history directly
 * <AnnotationLayer
 *   onMove={handleMove}
 *   onBoxMove={handleBoxMove}
 * />
 * ```
 */
export function useAnnotationHistoryTracker(options: UseAnnotationHistoryTrackerOptions) {
  const { annotations, onPushHistory, enabled } = options;

  // Track the initial state when drag starts
  const dragStartState = useRef<{
    annotationId: string;
    initialShape: AnnotationShape;
  } | null>(null);

  /**
   * Call this when a drag operation starts to capture initial state
   */
  const startTracking = useCallback(
    (annotationId: string) => {
      if (!enabled) return;

      const annotation = annotations.find((ann) => ann.id === annotationId);
      if (annotation?.shape) {
        dragStartState.current = {
          annotationId,
          initialShape: { ...annotation.shape },
        };
      }
    },
    [annotations, enabled]
  );

  /**
   * Call this when drag completes to create history entry
   */
  const finishTracking = useCallback(
    (annotationId: string, finalShape: AnnotationShape) => {
      if (!enabled || !dragStartState.current) return;

      const { initialShape } = dragStartState.current;

      // Only create history if something actually changed
      if (JSON.stringify(initialShape) !== JSON.stringify(finalShape)) {
        const previousSnapshot = createSnapshot(annotationId, initialShape);
        const newSnapshot = createSnapshot(annotationId, finalShape);

        const action = finalShape.type === 'box' ? 'resize' : 'move';
        const historyEntry = createHistoryEntry(action, annotationId, newSnapshot, previousSnapshot);

        onPushHistory(historyEntry);
      }

      // Clear tracking state
      dragStartState.current = null;
    },
    [enabled, onPushHistory]
  );

  /**
   * Wrapped move handler for pin annotations
   * This should be called on EVERY move, but will only create history on completion
   */
  const createMoveHandler = useCallback(
    (onMoveCallback?: (annotationId: string, position: AnnotationPosition) => void) => {
      return (annotationId: string, position: AnnotationPosition, isComplete: boolean = false) => {
        // If this is the start of a drag, capture initial state
        if (!dragStartState.current) {
          startTracking(annotationId);
        }

        // Always apply the move
        onMoveCallback?.(annotationId, position);

        // If drag is complete, create history entry
        if (isComplete) {
          const finalShape: AnnotationShape = { type: 'pin', position };
          finishTracking(annotationId, finalShape);
        }
      };
    },
    [startTracking, finishTracking]
  );

  /**
   * Wrapped move handler for box annotations
   */
  const createBoxMoveHandler = useCallback(
    (
      onBoxMoveCallback?: (
        annotationId: string,
        start: AnnotationPosition,
        end: AnnotationPosition
      ) => void
    ) => {
      return (
        annotationId: string,
        start: AnnotationPosition,
        end: AnnotationPosition,
        isComplete: boolean = false
      ) => {
        // If this is the start of a drag, capture initial state
        if (!dragStartState.current) {
          startTracking(annotationId);
        }

        // Always apply the move
        onBoxMoveCallback?.(annotationId, start, end);

        // If drag is complete, create history entry
        if (isComplete) {
          const finalShape: AnnotationShape = { type: 'box', start, end };
          finishTracking(annotationId, finalShape);
        }
      };
    },
    [startTracking, finishTracking]
  );

  /**
   * Cancel tracking (e.g., if drag is cancelled)
   */
  const cancelTracking = useCallback(() => {
    dragStartState.current = null;
  }, []);

  return {
    startTracking,
    finishTracking,
    createMoveHandler,
    createBoxMoveHandler,
    cancelTracking,
  };
}
