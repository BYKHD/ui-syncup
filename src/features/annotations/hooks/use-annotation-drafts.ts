import { useCallback, useState } from 'react';
import type { AnnotationDraft, AnnotationPosition } from '../types';

export interface UseAnnotationDraftsOptions {
  onCommit?: (draft: AnnotationDraft, message?: string) => void;
  onCancel?: () => void;
}

export interface UseAnnotationDraftsReturn {
  currentDraft: AnnotationDraft | null;
  isDrawing: boolean;
  createDraft: (draft: AnnotationDraft) => void;
  updateDraft: (draft: AnnotationDraft) => void;
  commitDraft: (draft: AnnotationDraft, message?: string) => void;
  cancelDraft: () => void;
  clearDraft: () => void;
}

/**
 * Hook for managing annotation draft state during drawing operations.
 * Provides callbacks for creating, updating, committing, and canceling drafts.
 *
 * This hook is designed to work with AnnotationCanvas for drawing new annotations
 * and can be wired to persistence layers (API calls, local state, etc.) via the
 * onCommit callback.
 *
 * @example
 * ```tsx
 * const { currentDraft, createDraft, updateDraft, commitDraft } = useAnnotationDrafts({
 *   onCommit: async (draft) => {
 *     // Convert draft to AttachmentAnnotation and persist
 *     await createAnnotation({
 *       attachmentId: attachmentId,
 *       label: nextLabel,
 *       shape: draft.shape,
 *       // ... other fields
 *     });
 *   }
 * });
 * ```
 */
export function useAnnotationDrafts(options: UseAnnotationDraftsOptions = {}): UseAnnotationDraftsReturn {
  const { onCommit, onCancel } = options;
  const [currentDraft, setCurrentDraft] = useState<AnnotationDraft | null>(null);

  const createDraft = useCallback((draft: AnnotationDraft) => {
    setCurrentDraft(draft);
  }, []);

  const updateDraft = useCallback((draft: AnnotationDraft) => {
    setCurrentDraft(draft);
  }, []);

  const commitDraft = useCallback(
    (draft: AnnotationDraft, message?: string) => {
      onCommit?.(draft, message);
      setCurrentDraft(null);
    },
    [onCommit],
  );

  const cancelDraft = useCallback(() => {
    onCancel?.();
    setCurrentDraft(null);
  }, [onCancel]);

  const clearDraft = useCallback(() => {
    setCurrentDraft(null);
  }, []);

  return {
    currentDraft,
    isDrawing: currentDraft !== null,
    createDraft,
    updateDraft,
    commitDraft,
    cancelDraft,
    clearDraft,
  };
}

/**
 * Helper to convert an AnnotationDraft to an AttachmentAnnotation.
 * This is useful when committing a draft to create a new annotation.
 *
 * @param draft - The draft to convert
 * @param attachmentId - The attachment ID to associate with
 * @param author - The annotation author
 * @param label - The annotation label (e.g., "A", "B", "1", "2")
 * @param message - Optional initial comment/message for the annotation
 * @returns Partial AttachmentAnnotation (missing id which comes from backend)
 */
export function draftToAnnotation(
  draft: AnnotationDraft,
  attachmentId: string,
  author: { id: string; name: string; email?: string; avatarUrl?: string | null },
  label: string,
  message?: string,
): Omit<import('../types').AttachmentAnnotation, 'id'> {
  // Get position for x, y fields (required for backward compatibility)
  let x = 0;
  let y = 0;

  if (draft.shape.type === 'pin') {
    x = draft.shape.position.x;
    y = draft.shape.position.y;
  } else if (draft.shape.type === 'box') {
    // Use center of box for x, y
    x = (draft.shape.start.x + draft.shape.end.x) / 2;
    y = (draft.shape.start.y + draft.shape.end.y) / 2;
  } else if (draft.shape.type === 'arrow') {
    // Use start position for x, y
    x = draft.shape.start.x;
    y = draft.shape.start.y;
  }

  // Create initial comment if message is provided
  const comments = message
    ? [
        {
          id: `comment-${Date.now()}`,
          annotationId: draft.id,
          author,
          message,
          createdAt: new Date(draft.createdAt).toISOString(),
        },
      ]
    : undefined;

  return {
    attachmentId,
    label,
    description: message, // Store message as description as well
    x,
    y,
    author,
    createdAt: new Date(draft.createdAt).toISOString(),
    shape: draft.shape,
    comments,
  };
}
