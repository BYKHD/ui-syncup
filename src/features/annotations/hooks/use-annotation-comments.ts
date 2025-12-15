/**
 * useAnnotationComments Hook
 *
 * Manages comments within an annotation thread. Provides add, update, delete
 * mutations with optimistic updates and tracks unread status.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5
 *
 * @module features/annotations/hooks/use-annotation-comments
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AnnotationComment, AttachmentAnnotation, AnnotationAuthor } from '../types';
import {
  addComment as apiAddComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
  markAsRead as apiMarkAsRead,
} from '../api/comments-api';
import { annotationKeys } from './use-annotation-integration';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAnnotationCommentsOptions {
  issueId: string;
  attachmentId: string;
  annotationId: string;
  /** Current user for optimistic updates */
  currentUser?: AnnotationAuthor;
  /** Last read timestamp for this annotation */
  lastReadAt?: string;
  /** Callback when errors occur */
  onError?: (error: Error) => void;
}

export interface UseAnnotationCommentsResult {
  // State
  isAddingComment: boolean;
  isUpdatingComment: boolean;
  isDeletingComment: boolean;
  hasUnreadComments: boolean;

  // Actions
  addComment: (message: string) => Promise<void>;
  updateComment: (commentId: string, message: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  markAsRead: () => Promise<void>;

  // Derived state
  unreadCount: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing comments on an annotation.
 *
 * Provides mutations for add, update, delete operations with optimistic updates.
 * Tracks unread status based on lastReadAt timestamp.
 *
 * Note: Comments are embedded within annotations and are synced via the parent
 * annotation query. This hook focuses on mutations and unread tracking.
 *
 * @example
 * ```tsx
 * const {
 *   addComment,
 *   updateComment,
 *   deleteComment,
 *   hasUnreadComments,
 *   markAsRead,
 * } = useAnnotationComments({
 *   issueId: 'issue_1',
 *   attachmentId: 'attach_1',
 *   annotationId: 'ann_1',
 *   currentUser: { id: 'user_1', name: 'Alice' },
 *   lastReadAt: '2024-01-01T00:00:00Z',
 * });
 * ```
 */
export function useAnnotationComments(
  options: UseAnnotationCommentsOptions
): UseAnnotationCommentsResult {
  const {
    issueId,
    attachmentId,
    annotationId,
    currentUser,
    lastReadAt,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const queryKey = annotationKeys.list(issueId, attachmentId);

  // Track last read time locally for immediate UI updates
  const [localLastReadAt, setLocalLastReadAt] = useState<string | undefined>(lastReadAt);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get current annotation from cache
   */
  const getAnnotationFromCache = useCallback((): AttachmentAnnotation | undefined => {
    const annotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);
    return annotations?.find((ann) => ann.id === annotationId);
  }, [queryClient, queryKey, annotationId]);

  /**
   * Update annotation in cache
   */
  const updateAnnotationInCache = useCallback(
    (updater: (ann: AttachmentAnnotation) => AttachmentAnnotation) => {
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) =>
        old?.map((ann) => (ann.id === annotationId ? updater(ann) : ann))
      );
    },
    [queryClient, queryKey, annotationId]
  );

  // ============================================================================
  // MUTATIONS - Add Comment
  // ============================================================================

  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiAddComment(issueId, attachmentId, annotationId, message);
      return response.comment;
    },
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey });

      const previousAnnotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);

      // Optimistically add comment
      if (currentUser) {
        const optimisticComment: AnnotationComment = {
          id: `optimistic_${Date.now()}`,
          annotationId,
          author: currentUser,
          message,
          createdAt: new Date().toISOString(),
        };

        updateAnnotationInCache((ann) => ({
          ...ann,
          comments: [...(ann.comments ?? []), optimisticComment],
        }));
      }

      return { previousAnnotations };
    },
    onSuccess: () => {
      toast.success('Comment added');
      // Update last read time since we just commented
      setLocalLastReadAt(new Date().toISOString());
    },
    onError: (error: Error, _message, context) => {
      if (context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
      }
      toast.error('Failed to add comment');
      onError?.(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // ============================================================================
  // MUTATIONS - Update Comment
  // ============================================================================

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, message }: { commentId: string; message: string }) => {
      const response = await apiUpdateComment(issueId, attachmentId, annotationId, commentId, message);
      return response.comment;
    },
    onMutate: async ({ commentId, message }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousAnnotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);

      // Optimistically update comment
      updateAnnotationInCache((ann) => ({
        ...ann,
        comments: ann.comments?.map((c) =>
          c.id === commentId ? { ...c, message } : c
        ),
      }));

      return { previousAnnotations };
    },
    onSuccess: () => {
      toast.success('Comment updated');
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
      }
      toast.error('Failed to update comment');
      onError?.(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // ============================================================================
  // MUTATIONS - Delete Comment
  // ============================================================================

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiDeleteComment(issueId, attachmentId, annotationId, commentId);
      return commentId;
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousAnnotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);

      // Optimistically remove comment
      updateAnnotationInCache((ann) => ({
        ...ann,
        comments: ann.comments?.filter((c) => c.id !== commentId),
      }));

      return { previousAnnotations };
    },
    onSuccess: () => {
      toast.success('Comment deleted');
    },
    onError: (error: Error, _commentId, context) => {
      if (context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
      }
      toast.error('Failed to delete comment');
      onError?.(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // ============================================================================
  // MUTATIONS - Mark as Read
  // ============================================================================

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiMarkAsRead(issueId, attachmentId, annotationId);
      return response.lastReadAt;
    },
    onSuccess: (lastReadAt) => {
      setLocalLastReadAt(lastReadAt);
    },
    onError: (error: Error) => {
      // Silent failure for read status
      console.error('Failed to mark as read:', error);
    },
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const annotation = getAnnotationFromCache();
  const comments = annotation?.comments ?? [];

  // Calculate unread count
  const { hasUnreadComments, unreadCount } = useMemo(() => {
    if (!localLastReadAt) {
      // If never read, all comments from others are unread
      const unread = comments.filter((c) => c.author.id !== currentUser?.id);
      return {
        hasUnreadComments: unread.length > 0,
        unreadCount: unread.length,
      };
    }

    const lastRead = new Date(localLastReadAt).getTime();
    const unread = comments.filter((c) => {
      const commentTime = new Date(c.createdAt).getTime();
      return commentTime > lastRead && c.author.id !== currentUser?.id;
    });

    return {
      hasUnreadComments: unread.length > 0,
      unreadCount: unread.length,
    };
  }, [comments, localLastReadAt, currentUser?.id]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const addComment = useCallback(
    async (message: string) => {
      await addCommentMutation.mutateAsync(message);
    },
    [addCommentMutation]
  );

  const updateComment = useCallback(
    async (commentId: string, message: string) => {
      await updateCommentMutation.mutateAsync({ commentId, message });
    },
    [updateCommentMutation]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      await deleteCommentMutation.mutateAsync(commentId);
    },
    [deleteCommentMutation]
  );

  const markAsRead = useCallback(async () => {
    await markAsReadMutation.mutateAsync();
  }, [markAsReadMutation]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    isAddingComment: addCommentMutation.isPending,
    isUpdatingComment: updateCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,
    hasUnreadComments,

    // Actions
    addComment,
    updateComment,
    deleteComment,
    markAsRead,

    // Derived state
    unreadCount,
  };
}
