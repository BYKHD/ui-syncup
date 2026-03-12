import { useCallback, useState } from 'react';
import type {
  AttachmentAnnotation,
  AnnotationPosition,
  AnnotationHistoryEntry,
  AnnotationShape,
} from '../types';
import { createHistoryEntry, createSnapshot } from '../utils/history-manager';

export interface UseAnnotationsWithHistoryOptions {
  initialAnnotations?: AttachmentAnnotation[];
  onPushHistory?: (entry: AnnotationHistoryEntry) => void;
}

/**
 * Hook for managing annotations with full undo/redo support.
 *
 * This hook provides a complete implementation of annotation state management
 * with history tracking. It handles create, move, resize, and delete operations
 * and creates proper history entries that can be undone/redone.
 *
 * @example
 * ```tsx
 * const {
 *   annotations,
 *   handleAnnotationMove,
 *   handleBoxAnnotationMove,
 *   handleAnnotationCreate,
 *   handleAnnotationDelete,
 *   applyUndo,
 *   applyRedo,
 * } = useAnnotationsWithHistory({
 *   initialAnnotations: annotationThreads,
 *   onPushHistory: pushAnnotationHistory,
 * });
 *
 * // Wire to useAnnotationTools
 * const { undo, redo, ... } = useAnnotationTools({
 *   onUndo: applyUndo,
 *   onRedo: applyRedo,
 * });
 * ```
 */
export function useAnnotationsWithHistory(options: UseAnnotationsWithHistoryOptions = {}) {
  const { initialAnnotations = [], onPushHistory } = options;
  const [annotations, setAnnotations] = useState<AttachmentAnnotation[]>(initialAnnotations);

  // Store for tracking which history entries we've processed
  // This prevents double-application of undo/redo
  const [lastProcessedHistoryId, setLastProcessedHistoryId] = useState<string | null>(null);

  /**
   * Apply undo operation from history entry
   */
  const applyUndo = useCallback((entry: AnnotationHistoryEntry) => {
    const { action, annotationId, previousSnapshot, snapshot } = entry;

    // Prevent double-processing
    if (entry.id === lastProcessedHistoryId) return;
    setLastProcessedHistoryId(entry.id);

    setAnnotations((prev) => {
      switch (action) {
        case 'create':
          // Undo create: remove the annotation
          return prev.filter((ann) => ann.id !== annotationId);

        case 'move':
        case 'resize':
          // Undo move/resize: restore previous shape
          if (!previousSnapshot) return prev;
          return prev.map((ann) => {
            if (ann.id !== annotationId) return ann;

            // Update shape
            const updatedAnn = { ...ann, shape: previousSnapshot.shape };

            // Update x, y for backward compatibility
            if (previousSnapshot.shape.type === 'pin') {
              updatedAnn.x = previousSnapshot.shape.position.x;
              updatedAnn.y = previousSnapshot.shape.position.y;
            } else if (previousSnapshot.shape.type === 'box') {
              updatedAnn.x = (previousSnapshot.shape.start.x + previousSnapshot.shape.end.x) / 2;
              updatedAnn.y = (previousSnapshot.shape.start.y + previousSnapshot.shape.end.y) / 2;
            }

            return updatedAnn;
          });

        case 'delete':
          // Undo delete: restore the annotation using stored fullAnnotation
          if (!entry.fullAnnotation) {
            console.warn('Cannot undo delete: fullAnnotation not stored in history entry');
            return prev;
          }
          // Check if annotation already exists (prevent duplicates)
          if (prev.some((ann) => ann.id === annotationId)) return prev;
          return [...prev, entry.fullAnnotation];

        default:
          return prev;
      }
    });
  }, [lastProcessedHistoryId]);

  /**
   * Apply redo operation from history entry
   */
  const applyRedo = useCallback((entry: AnnotationHistoryEntry) => {
    const { action, annotationId, snapshot } = entry;

    // Prevent double-processing
    if (entry.id === lastProcessedHistoryId) return;
    setLastProcessedHistoryId(entry.id);

    setAnnotations((prev) => {
      switch (action) {
        case 'create':
          // Redo create: add the annotation back using stored fullAnnotation
          if (!entry.fullAnnotation) {
            console.warn('Cannot redo create: fullAnnotation not stored in history entry');
            return prev;
          }
          // Check if annotation already exists (prevent duplicates)
          if (prev.some((ann) => ann.id === annotationId)) return prev;
          return [...prev, entry.fullAnnotation];

        case 'move':
        case 'resize':
          // Redo move/resize: apply the new shape
          return prev.map((ann) => {
            if (ann.id !== annotationId) return ann;

            // Update shape
            const updatedAnn = { ...ann, shape: snapshot.shape };

            // Update x, y for backward compatibility
            if (snapshot.shape.type === 'pin') {
              updatedAnn.x = snapshot.shape.position.x;
              updatedAnn.y = snapshot.shape.position.y;
            } else if (snapshot.shape.type === 'box') {
              updatedAnn.x = (snapshot.shape.start.x + snapshot.shape.end.x) / 2;
              updatedAnn.y = (snapshot.shape.start.y + snapshot.shape.end.y) / 2;
            }

            return updatedAnn;
          });

        case 'delete':
          // Redo delete: remove the annotation
          return prev.filter((ann) => ann.id !== annotationId);

        default:
          return prev;
      }
    });
  }, [lastProcessedHistoryId]);

  /**
   * Handle pin annotation movement
   */
  const handleAnnotationMove = useCallback(
    (annotationId: string, position: AnnotationPosition) => {
      // Capture previous state before updating (to avoid StrictMode double-call issues)
      let historyEntry: AnnotationHistoryEntry | null = null;

      setAnnotations((prev) => {
        const annotation = prev.find((ann) => ann.id === annotationId);
        if (!annotation || !annotation.shape) return prev;

        // Only create history entry once (first call in StrictMode)
        if (!historyEntry) {
          const previousSnapshot = createSnapshot(annotationId, annotation.shape);
          const newShape: AnnotationShape = { type: 'pin', position };
          const newSnapshot = createSnapshot(annotationId, newShape);
          historyEntry = createHistoryEntry('move', annotationId, newSnapshot, previousSnapshot);
        }

        // Update annotation
        return prev.map((ann) => {
          if (ann.id !== annotationId) return ann;
          const newShape: AnnotationShape = { type: 'pin', position };
          return {
            ...ann,
            x: position.x,
            y: position.y,
            shape: newShape,
          };
        });
      });

      // Push history AFTER setState (only called once, not inside the callback)
      if (historyEntry) {
        onPushHistory?.(historyEntry);
      }
    },
    [onPushHistory]
  );

  /**
   * Handle box annotation movement or resize
   */
  const handleBoxAnnotationMove = useCallback(
    (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => {
      // Capture previous state before updating
      let historyEntry: AnnotationHistoryEntry | null = null;

      setAnnotations((prev) => {
        const annotation = prev.find((ann) => ann.id === annotationId);
        if (!annotation || !annotation.shape) return prev;

        // Only create history entry once (first call in StrictMode)
        if (!historyEntry) {
          const previousSnapshot = createSnapshot(annotationId, annotation.shape);
          const newShape: AnnotationShape = { type: 'box', start, end };
          const newSnapshot = createSnapshot(annotationId, newShape);
          historyEntry = createHistoryEntry('resize', annotationId, newSnapshot, previousSnapshot);
        }

        // Update annotation
        return prev.map((ann) => {
          if (ann.id !== annotationId) return ann;

          const newShape: AnnotationShape = { type: 'box', start, end };
          return {
            ...ann,
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
            shape: newShape,
          };
        });
      });

      // Push history AFTER setState
      if (historyEntry) {
        onPushHistory?.(historyEntry);
      }
    },
    [onPushHistory]
  );

  /**
   * Handle annotation creation
   */
  const handleAnnotationCreate = useCallback(
    (newAnnotation: AttachmentAnnotation) => {
      setAnnotations((prev) => {
        const updated = [...prev, newAnnotation];

        // Create snapshot and push to history with full annotation for undo support
        if (newAnnotation.shape) {
          const snapshot = createSnapshot(newAnnotation.id, newAnnotation.shape);
          const historyEntry = createHistoryEntry(
            'create',
            newAnnotation.id,
            snapshot,
            undefined, // no previousSnapshot for create
            newAnnotation // store full annotation for undo
          );
          onPushHistory?.(historyEntry);
        }

        return updated;
      });
    },
    [onPushHistory]
  );

  /**
   * Handle annotation deletion
   */
  const handleAnnotationDelete = useCallback(
    (annotationId: string) => {
      setAnnotations((prev) => {
        const annotation = prev.find((ann) => ann.id === annotationId);
        if (!annotation || !annotation.shape) return prev;

        // Create snapshot and history entry with full annotation for undo support
        const snapshot = createSnapshot(annotationId, annotation.shape);
        const historyEntry = createHistoryEntry(
          'delete',
          annotationId,
          snapshot,
          undefined, // no previousSnapshot for delete
          annotation // store full annotation for undo restoration
        );
        onPushHistory?.(historyEntry);

        return prev.filter((ann) => ann.id !== annotationId);
      });
    },
    [onPushHistory]
  );

  /**
   * Handle annotation description edit
   * Note: Does not create history entry (description edits are not undoable in current implementation)
   */
  const handleAnnotationEdit = useCallback(
    (annotationId: string, description: string) => {
      setAnnotations((prev) => {
        return prev.map((ann) => {
          if (ann.id !== annotationId) return ann;
          return {
            ...ann,
            description: description.trim(),
          };
        });
      });
    },
    []
  );

  /**
   * Update annotations from external source (e.g., API)
   */
  const setAnnotationsFromExternal = useCallback((newAnnotations: AttachmentAnnotation[]) => {
    setAnnotations(newAnnotations);
  }, []);

  return {
    annotations,
    setAnnotations: setAnnotationsFromExternal,
    handleAnnotationMove,
    handleBoxAnnotationMove,
    handleAnnotationCreate,
    handleAnnotationDelete,
    handleAnnotationEdit,
    applyUndo,
    applyRedo,
  };
}
