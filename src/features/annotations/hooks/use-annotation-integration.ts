/**
 * useAnnotationIntegration Hook
 *
 * Core integration hook that connects frontend annotation state management
 * with the real API endpoints. Provides optimistic updates with rollback,
 * React Query caching, and integration with useAnnotationsWithHistory.
 *
 * Requirements: 1.4, 1.5, 4.5, 5.1
 *
 * @module features/annotations/hooks/use-annotation-integration
 */

'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AnnotationShape, AttachmentAnnotation, AnnotationToolId } from '../types';
import { useAnnotationsWithHistory } from './use-annotations-with-history';
import { useAnnotationTools } from './use-annotation-tools';
import {
  getAnnotations,
  createAnnotation as apiCreateAnnotation,
  updateAnnotation as apiUpdateAnnotation,
  deleteAnnotation as apiDeleteAnnotation,
  transformToAttachmentAnnotation,
  type AnnotationWithAuthor,
} from '../api/annotations-api';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const annotationKeys = {
  all: ['annotations'] as const,
  lists: () => [...annotationKeys.all, 'list'] as const,
  list: (issueId: string, attachmentId: string) =>
    [...annotationKeys.lists(), { issueId, attachmentId }] as const,
  detail: (annotationId: string) =>
    [...annotationKeys.all, 'detail', annotationId] as const,
  comments: (annotationId: string) =>
    [...annotationKeys.detail(annotationId), 'comments'] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface UseAnnotationIntegrationOptions {
  issueId: string;
  attachmentId: string;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export interface UseAnnotationIntegrationResult {
  // State
  annotations: AttachmentAnnotation[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSaving: boolean;

  // Tool state (from useAnnotationTools)
  activeTool: AnnotationToolId;
  editModeEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  handToolActive: boolean;

  // Actions
  createAnnotation: (shape: AnnotationShape, description?: string) => Promise<void>;
  updateAnnotation: (annotationId: string, shape: AnnotationShape, description?: string) => Promise<void>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  handleAnnotationMove: (annotationId: string, position: { x: number; y: number }) => void;
  handleBoxAnnotationMove: (annotationId: string, start: { x: number; y: number }, end: { x: number; y: number }) => void;

  // Tool controls
  selectTool: (tool: AnnotationToolId) => void;
  toggleEditMode: (next?: boolean) => void;
  undo: () => void;
  redo: () => void;

  // Refresh
  refetch: () => void;
}

// ============================================================================
// DEBOUNCE HELPER
// ============================================================================

function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Core integration hook for annotation management.
 *
 * Combines:
 * - React Query for data fetching and caching
 * - useAnnotationsWithHistory for local state with undo/redo
 * - useAnnotationTools for tool state and keyboard shortcuts
 * - Optimistic updates with rollback on failure
 * - Debounced position updates
 *
 * @example
 * ```tsx
 * const {
 *   annotations,
 *   isLoading,
 *   activeTool,
 *   editModeEnabled,
 *   createAnnotation,
 *   selectTool,
 *   undo,
 *   redo,
 * } = useAnnotationIntegration({
 *   issueId: 'issue_1',
 *   attachmentId: 'attach_1',
 * });
 * ```
 */
export function useAnnotationIntegration(
  options: UseAnnotationIntegrationOptions
): UseAnnotationIntegrationResult {
  const { issueId, attachmentId, enabled = true, onError } = options;
  const queryClient = useQueryClient();

  // Track current selected annotation for keyboard shortcuts
  const selectedAnnotationRef = useRef<string | null>(null);

  // ============================================================================
  // QUERY - Fetch annotations
  // ============================================================================

  const queryKey = annotationKeys.list(issueId, attachmentId);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getAnnotations(issueId, attachmentId);
      return response.annotations.map(transformToAttachmentAnnotation);
    },
    enabled: enabled && !!issueId && !!attachmentId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  // ============================================================================
  // LOCAL STATE - History-enabled annotation management
  // ============================================================================

  const {
    annotations: localAnnotations,
    setAnnotations,
    handleAnnotationMove: localHandleMove,
    handleBoxAnnotationMove: localHandleBoxMove,
    handleAnnotationCreate: localHandleCreate,
    handleAnnotationDelete: localHandleDelete,
    applyUndo,
    applyRedo,
  } = useAnnotationsWithHistory({
    initialAnnotations: query.data ?? [],
    onPushHistory: undefined, // History managed by useAnnotationTools
  });

  // Sync local state when query data changes
  useMemo(() => {
    if (query.data && !query.isFetching) {
      setAnnotations(query.data);
    }
  }, [query.data, query.isFetching, setAnnotations]);

  // ============================================================================
  // TOOL STATE
  // ============================================================================

  const tools = useAnnotationTools({
    initialEditMode: false,
    enableKeyboardShortcuts: true,
    activeAnnotationId: selectedAnnotationRef.current,
    onUndo: applyUndo,
    onRedo: applyRedo,
    onDelete: (annotationId: string) => {
      void deleteMutation.mutateAsync(annotationId);
    },
  });

  // ============================================================================
  // MUTATIONS - Create
  // ============================================================================

  const createMutation = useMutation({
    mutationFn: async ({ shape, description }: { shape: AnnotationShape; description?: string }) => {
      const response = await apiCreateAnnotation(issueId, attachmentId, { shape, description });
      return transformToAttachmentAnnotation(response.annotation);
    },
    onSuccess: (newAnnotation) => {
      // Update cache with new annotation
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => 
        old ? [...old, newAnnotation] : [newAnnotation]
      );
      localHandleCreate(newAnnotation);
      toast.success('Annotation created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create annotation');
      onError?.(error);
    },
  });

  // ============================================================================
  // MUTATIONS - Update
  // ============================================================================

  const updateMutation = useMutation({
    mutationFn: async ({
      annotationId,
      shape,
      description,
    }: {
      annotationId: string;
      shape?: AnnotationShape;
      description?: string;
    }) => {
      const response = await apiUpdateAnnotation(issueId, attachmentId, annotationId, {
        shape,
        description,
      });
      return transformToAttachmentAnnotation(response.annotation);
    },
    onMutate: async ({ annotationId, shape }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousAnnotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);

      // Optimistically update
      if (shape) {
        queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) =>
          old?.map((ann) =>
            ann.id === annotationId
              ? {
                  ...ann,
                  shape,
                  x: shape.type === 'pin' ? shape.position.x : (shape.start.x + shape.end.x) / 2,
                  y: shape.type === 'pin' ? shape.position.y : (shape.start.y + shape.end.y) / 2,
                }
              : ann
          )
        );
      }

      return { previousAnnotations };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
        setAnnotations(context.previousAnnotations);
      }
      toast.error('Failed to update annotation');
      onError?.(error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // Debounced update for position changes during drag
  const debouncedUpdate = useDebouncedCallback(
    (annotationId: string, shape: AnnotationShape) => {
      void updateMutation.mutateAsync({ annotationId, shape });
    },
    500 // 500ms debounce
  );

  // ============================================================================
  // MUTATIONS - Delete
  // ============================================================================

  const deleteMutation = useMutation({
    mutationFn: async (annotationId: string) => {
      await apiDeleteAnnotation(issueId, attachmentId, annotationId);
      return annotationId;
    },
    onMutate: async (annotationId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousAnnotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);

      // Optimistically remove
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) =>
        old?.filter((ann) => ann.id !== annotationId)
      );
      localHandleDelete(annotationId);

      return { previousAnnotations };
    },
    onSuccess: () => {
      toast.success('Annotation deleted');
    },
    onError: (error: Error, _annotationId, context) => {
      // Rollback on error
      if (context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
        setAnnotations(context.previousAnnotations);
      }
      toast.error('Failed to delete annotation');
      onError?.(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const createAnnotation = useCallback(
    async (shape: AnnotationShape, description?: string) => {
      await createMutation.mutateAsync({ shape, description });
    },
    [createMutation]
  );

  const updateAnnotation = useCallback(
    async (annotationId: string, shape: AnnotationShape, description?: string) => {
      await updateMutation.mutateAsync({ annotationId, shape, description });
    },
    [updateMutation]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      await deleteMutation.mutateAsync(annotationId);
    },
    [deleteMutation]
  );

  // Handle pin annotation move with debounced API sync
  const handleAnnotationMove = useCallback(
    (annotationId: string, position: { x: number; y: number }) => {
      // Update local state immediately
      localHandleMove(annotationId, position);

      // Debounced API update
      const newShape: AnnotationShape = { type: 'pin', position };
      debouncedUpdate(annotationId, newShape);
    },
    [localHandleMove, debouncedUpdate]
  );

  // Handle box annotation move/resize with debounced API sync
  const handleBoxAnnotationMove = useCallback(
    (annotationId: string, start: { x: number; y: number }, end: { x: number; y: number }) => {
      // Update local state immediately
      localHandleBoxMove(annotationId, start, end);

      // Debounced API update
      const newShape: AnnotationShape = { type: 'box', start, end };
      debouncedUpdate(annotationId, newShape);
    },
    [localHandleBoxMove, debouncedUpdate]
  );

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  // ============================================================================
  // RETURN
  // ============================================================================

  const isSaving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return {
    // State
    annotations: localAnnotations,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSaving,

    // Tool state
    activeTool: tools.activeTool,
    editModeEnabled: tools.editModeEnabled,
    canUndo: tools.canUndo,
    canRedo: tools.canRedo,
    handToolActive: tools.handToolActive,

    // Actions
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    handleAnnotationMove,
    handleBoxAnnotationMove,

    // Tool controls
    selectTool: tools.selectTool,
    toggleEditMode: tools.toggleEditMode,
    undo: tools.undo,
    redo: tools.redo,

    // Refresh
    refetch,
  };
}
