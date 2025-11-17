import type { AttachmentAnnotation, AnnotationAuthor } from '../types';

/**
 * Re-sequences annotation labels to be sequential after deletions.
 *
 * When an annotation is deleted, remaining annotations should be renumbered
 * to maintain a clean sequence (1, 2, 3...) without gaps.
 *
 * @param annotations - Array of annotations to re-sequence
 * @returns New array with updated labels, maintaining creation order
 *
 * @example
 * ```ts
 * // Before: [{ id: 'a', label: '1', createdAt: '...' }, { id: 'c', label: '3', createdAt: '...' }]
 * // After:  [{ id: 'a', label: '1', createdAt: '...' }, { id: 'c', label: '2', createdAt: '...' }]
 * ```
 */
export function reSequenceLabels<A extends AnnotationAuthor = AnnotationAuthor>(
  annotations: AttachmentAnnotation<A>[]
): AttachmentAnnotation<A>[] {
  // Sort by creation time to maintain original order
  const sorted = [...annotations].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  // Re-assign labels sequentially (1, 2, 3...)
  return sorted.map((annotation, index) => ({
    ...annotation,
    label: String(index + 1),
  }));
}

/**
 * Gets the next label number for a new annotation.
 *
 * @param annotations - Existing annotations
 * @returns Next sequential label as string
 *
 * @example
 * ```ts
 * getNextLabel([{ label: '1', ... }, { label: '2', ... }]) // Returns '3'
 * getNextLabel([]) // Returns '1'
 * ```
 */
export function getNextLabel<A extends AnnotationAuthor = AnnotationAuthor>(
  annotations: AttachmentAnnotation<A>[]
): string {
  if (annotations.length === 0) {
    return '1';
  }

  // Find highest numeric label
  const highestLabel = annotations.reduce((max, annotation) => {
    const labelNum = parseInt(annotation.label, 10);
    return isNaN(labelNum) ? max : Math.max(max, labelNum);
  }, 0);

  return String(highestLabel + 1);
}

/**
 * Checks if labels need re-sequencing (have gaps in numbering).
 *
 * @param annotations - Array of annotations to check
 * @returns True if labels have gaps and need re-sequencing
 *
 * @example
 * ```ts
 * needsReSequencing([{ label: '1' }, { label: '3' }]) // true (gap at 2)
 * needsReSequencing([{ label: '1' }, { label: '2' }]) // false (no gap)
 * ```
 */
export function needsReSequencing<A extends AnnotationAuthor = AnnotationAuthor>(
  annotations: AttachmentAnnotation<A>[]
): boolean {
  if (annotations.length === 0) return false;

  // Sort by creation time
  const sorted = [...annotations].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  // Check if labels are sequential (1, 2, 3...)
  return sorted.some((annotation, index) => {
    const expectedLabel = String(index + 1);
    return annotation.label !== expectedLabel;
  });
}
