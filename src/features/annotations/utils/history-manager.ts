import type {
  AnnotationHistoryEntry,
  AnnotationSnapshot,
  AnnotationActionType,
  AnnotationShape,
  AttachmentAnnotation,
} from '../types';

const HISTORY_LIMIT = 50;

/**
 * Creates a history entry for annotation operations
 * @param fullAnnotation - Complete annotation data for create/delete operations
 */
export function createHistoryEntry(
  action: AnnotationActionType,
  annotationId: string,
  snapshot: AnnotationSnapshot,
  previousSnapshot?: AnnotationSnapshot,
  fullAnnotation?: AttachmentAnnotation,
): AnnotationHistoryEntry {
  return {
    id: `${action}_${annotationId}_${Date.now()}`,
    action,
    timestamp: Date.now(),
    annotationId,
    snapshot,
    previousSnapshot,
    fullAnnotation,
  };
}

/**
 * Creates a snapshot from an annotation shape
 */
export function createSnapshot(annotationId: string, shape: AnnotationShape): AnnotationSnapshot {
  return {
    id: annotationId,
    shape: { ...shape },
  };
}

/**
 * Adds an entry to history and maintains history limit
 */
export function addToHistory(
  currentHistory: AnnotationHistoryEntry[],
  entry: AnnotationHistoryEntry,
): AnnotationHistoryEntry[] {
  return [...currentHistory, entry].slice(-HISTORY_LIMIT);
}

/**
 * Checks if two shapes are equal (for optimization)
 */
export function shapesAreEqual(shape1: AnnotationShape, shape2: AnnotationShape): boolean {
  if (shape1.type !== shape2.type) return false;

  if (shape1.type === 'pin' && shape2.type === 'pin') {
    return shape1.position.x === shape2.position.x && shape1.position.y === shape2.position.y;
  }

  if (shape1.type === 'box' && shape2.type === 'box') {
    return (
      shape1.start.x === shape2.start.x &&
      shape1.start.y === shape2.start.y &&
      shape1.end.x === shape2.end.x &&
      shape1.end.y === shape2.end.y
    );
  }

  return false;
}
