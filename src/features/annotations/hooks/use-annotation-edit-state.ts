import { useState, useCallback, useRef } from 'react';
import type { AttachmentAnnotation, AnnotationAuthor } from '../types';
import { calculateCommentInputPosition } from '../utils/position-comment-input';

export interface AnnotationEditState<A extends AnnotationAuthor = AnnotationAuthor> {
  editingAnnotation: AttachmentAnnotation<A> | null;
  showEditDialog: boolean;
  editPopoverPosition: { x: number; y: number } | null;
}

export interface UseAnnotationEditStateReturn<A extends AnnotationAuthor = AnnotationAuthor> {
  editState: AnnotationEditState<A>;
  openEdit: (annotationId: string, annotations: AttachmentAnnotation<A>[], overlayRef: React.RefObject<HTMLElement | null>) => void;
  closeEdit: () => void;
  submitEdit: (newDescription: string, onUpdate: (annotationId: string, updates: Partial<AttachmentAnnotation<A>>) => void) => void;
}

/**
 * Shared hook for managing annotation edit dialog state.
 *
 * Handles:
 * - Edit dialog visibility state
 * - Current editing annotation
 * - Smart popover positioning based on annotation location
 *
 * @example
 * ```tsx
 * const { editState, openEdit, closeEdit, submitEdit } = useAnnotationEditState();
 *
 * // Open edit dialog
 * const handleEdit = (id: string) => {
 *   openEdit(id, annotations, overlayRef);
 * };
 *
 * // Submit changes
 * const handleSubmit = (description: string) => {
 *   submitEdit(description, (id, updates) => {
 *     // Update annotation in parent state
 *   });
 * };
 * ```
 */
export function useAnnotationEditState<A extends AnnotationAuthor = AnnotationAuthor>(): UseAnnotationEditStateReturn<A> {
  const [editingAnnotation, setEditingAnnotation] = useState<AttachmentAnnotation<A> | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editPopoverPosition, setEditPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  const openEdit = useCallback(
    (
      annotationId: string,
      annotations: AttachmentAnnotation<A>[],
      overlayRef: React.RefObject<HTMLElement | null>
    ) => {
      const annotation = annotations.find((a) => a.id === annotationId);
      if (!annotation || !overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const position = calculateCommentInputPosition(annotation, {
        width: rect.width,
        height: rect.height,
      });

      setEditingAnnotation(annotation);
      setEditPopoverPosition(position);
      setShowEditDialog(true);
    },
    []
  );

  const closeEdit = useCallback(() => {
    setShowEditDialog(false);
    setEditingAnnotation(null);
    setEditPopoverPosition(null);
  }, []);

  const submitEdit = useCallback(
    (
      newDescription: string,
      onUpdate: (annotationId: string, updates: Partial<AttachmentAnnotation<A>>) => void
    ) => {
      if (!editingAnnotation) return;

      onUpdate(editingAnnotation.id, { description: newDescription });
      closeEdit();
    },
    [editingAnnotation, closeEdit]
  );

  return {
    editState: {
      editingAnnotation,
      showEditDialog,
      editPopoverPosition,
    },
    openEdit,
    closeEdit,
    submitEdit,
  };
}
