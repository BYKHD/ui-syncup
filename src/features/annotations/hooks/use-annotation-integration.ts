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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AnnotationShape, AttachmentAnnotation, AnnotationToolId, AnnotationHistoryEntry, UnsavedAnnotationState } from '../types';
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
  showShortcutsHelp: boolean;

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
  setShowShortcutsHelp: (show: boolean) => void;

  // Drag state (prevents sync during drag) - per-annotation tracking
  setDragging: (annotationId: string, isDragging: boolean) => void;

  // Unsaved changes tracking
  hasUnsavedChanges: () => boolean;

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
  // LOCAL-FIRST AUTOSAVE STATE (per-annotation tracking)
  // ============================================================================

  // Track which annotations are currently being dragged (prevents sync during drag)
  const draggingIdsRef = useRef(new Set<string>());

  // Track client revision per annotation (monotonically increasing on each commit)
  const clientRevisionByIdRef = useRef(new Map<string, number>());

  // Track pending saves per annotation (id -> latest pending clientRevision)
  const pendingRevisionByIdRef = useRef(new Map<string, number>());

  // Track unsaved annotations for UI indication
  const unsavedAnnotationsRef = useRef(new Map<string, UnsavedAnnotationState>());

  // Helper: Check if sync should be blocked
  const isSyncBlocked = useCallback(() => {
    return draggingIdsRef.current.size > 0 || pendingRevisionByIdRef.current.size > 0;
  }, []);

  // Helper: Hard error codes that should trigger rollback
  const HARD_ERROR_CODES = [403, 404, 402, 422];

  const isHardSaveError = useCallback((error: unknown): boolean => {
    if (error instanceof Error && 'status' in error) {
      return HARD_ERROR_CODES.includes((error as { status: number }).status);
    }
    return false;
  }, []);

  // Helper: Mark annotation as unsaved
  const markAnnotationUnsaved = useCallback((annotationId: string, opts?: { error?: Error }) => {
    const current = unsavedAnnotationsRef.current.get(annotationId);
    unsavedAnnotationsRef.current.set(annotationId, {
      error: opts?.error,
      retryCount: (current?.retryCount ?? 0) + 1,
    });
  }, []);

  // Helper: Clear unsaved state for annotation
  const clearAnnotationUnsaved = useCallback((annotationId: string) => {
    unsavedAnnotationsRef.current.delete(annotationId);
  }, []);

  // Helper: Check if any annotations have unsaved changes
  const hasUnsavedChanges = useCallback((): boolean => {
    return unsavedAnnotationsRef.current.size > 0 || pendingRevisionByIdRef.current.size > 0;
  }, []);

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

  // Ref to hold pushHistory callback - allows connecting hooks without circular dependency
  const pushHistoryRef = useRef<((entry: AnnotationHistoryEntry) => void) | null>(null);

  // Ref to hold debouncedUpdate callback - allows undo/redo to trigger saves
  const debouncedUpdateRef = useRef<((annotationId: string, shape: AnnotationShape, clientRevision: number) => void) | null>(null);

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
    onPushHistory: (entry) => pushHistoryRef.current?.(entry),
  });

  // Sync local state when query data changes (blocked during drag or pending saves)
  useMemo(() => {
    if (isSyncBlocked()) return;
    if (query.data && !query.isFetching) {
      setAnnotations(query.data);
    }
  }, [query.data, query.isFetching, setAnnotations, isSyncBlocked]);

  // ============================================================================
  // BEFOREUNLOAD HANDLER - Flush pending saves on tab close
  // ============================================================================

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRevisionByIdRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved annotation changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ============================================================================
  // TOOL STATE
  // ============================================================================

  // Enhanced applyUndo that updates both local state AND React Query cache AND saves to server
  const enhancedApplyUndo = useCallback((entry: AnnotationHistoryEntry) => {
    // Apply to local state
    applyUndo(entry);
    
    // Also update React Query cache to prevent overwrite from refetch
    if (entry.previousSnapshot && (entry.action === 'move' || entry.action === 'resize')) {
      const prevShape = entry.previousSnapshot.shape;
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(ann => {
          if (ann.id !== entry.annotationId) return ann;
          const updatedAnn = { ...ann, shape: prevShape };
          if (prevShape.type === 'pin') {
            updatedAnn.x = prevShape.position.x;
            updatedAnn.y = prevShape.position.y;
          } else if (prevShape.type === 'box') {
            updatedAnn.x = (prevShape.start.x + prevShape.end.x) / 2;
            updatedAnn.y = (prevShape.start.y + prevShape.end.y) / 2;
          }
          return updatedAnn;
        });
      });

      // Queue a save for the undone position
      const nextClientRevision = (clientRevisionByIdRef.current.get(entry.annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(entry.annotationId, nextClientRevision);
      pendingRevisionByIdRef.current.set(entry.annotationId, nextClientRevision);
      debouncedUpdateRef.current?.(entry.annotationId, prevShape, nextClientRevision);
    }
  }, [applyUndo, queryClient, queryKey]);

  // Enhanced applyRedo that updates both local state AND React Query cache AND saves to server
  const enhancedApplyRedo = useCallback((entry: AnnotationHistoryEntry) => {
    // Apply to local state
    applyRedo(entry);
    
    // Also update React Query cache
    if (entry.snapshot && (entry.action === 'move' || entry.action === 'resize')) {
      const newShape = entry.snapshot.shape;
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(ann => {
          if (ann.id !== entry.annotationId) return ann;
          const updatedAnn = { ...ann, shape: newShape };
          if (newShape.type === 'pin') {
            updatedAnn.x = newShape.position.x;
            updatedAnn.y = newShape.position.y;
          } else if (newShape.type === 'box') {
            updatedAnn.x = (newShape.start.x + newShape.end.x) / 2;
            updatedAnn.y = (newShape.start.y + newShape.end.y) / 2;
          }
          return updatedAnn;
        });
      });

      // Queue a save for the redone position
      const nextClientRevision = (clientRevisionByIdRef.current.get(entry.annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(entry.annotationId, nextClientRevision);
      pendingRevisionByIdRef.current.set(entry.annotationId, nextClientRevision);
      debouncedUpdateRef.current?.(entry.annotationId, newShape, nextClientRevision);
    }
  }, [applyRedo, queryClient, queryKey]);

  const tools = useAnnotationTools({
    initialEditMode: false,
    enableKeyboardShortcuts: true,
    activeAnnotationId: selectedAnnotationRef.current,
    onUndo: enhancedApplyUndo,
    onRedo: enhancedApplyRedo,
    onDelete: (annotationId: string) => {
      void deleteMutation.mutateAsync(annotationId);
    },
  });

  // Connect pushHistory to ref after tools is initialized
  pushHistoryRef.current = tools.pushHistory;

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
      clientRevision,
    }: {
      annotationId: string;
      shape?: AnnotationShape;
      description?: string;
      clientRevision: number;
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

      // Snapshot previous value for hard-error rollback
      const previousAnnotations = queryClient.getQueryData<AttachmentAnnotation[]>(queryKey);

      // Optimistically update cache
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
    onError: (error: Error, variables, context) => {
      // Mark annotation as unsaved for UI indication
      markAnnotationUnsaved(variables.annotationId, { error });

      // Only rollback for hard errors (403/404/402/422)
      // For transient errors (network/5xx), keep local state and let user retry
      if (isHardSaveError(error) && context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
        setAnnotations(context.previousAnnotations);
        toast.error('Save failed - changes reverted');
      } else {
        toast.error('Failed to save annotation');
      }
      onError?.(error);
    },
    onSettled: (_data, _error, variables) => {
      // Clear pending only if this response matches the latest pending revision
      const pending = pendingRevisionByIdRef.current.get(variables.annotationId);
      if (pending === variables.clientRevision) {
        pendingRevisionByIdRef.current.delete(variables.annotationId);
        clearAnnotationUnsaved(variables.annotationId);
      }
      // DON'T invalidate queries after position updates!
      // The optimistic update (onMutate) already set the correct position in the cache.
      // Refetching risks getting stale server data before the PATCH has propagated,
      // which causes the position to flicker back to the old location.
    },
  });

  // Debounced update for position changes during drag - includes clientRevision
  const debouncedUpdate = useDebouncedCallback(
    (annotationId: string, shape: AnnotationShape, clientRevision: number) => {
      void updateMutation.mutateAsync({ annotationId, shape, clientRevision });
    },
    500 // 500ms debounce
  );

  // Connect ref after debouncedUpdate is defined (allows undo/redo to trigger saves)
  debouncedUpdateRef.current = debouncedUpdate;

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
        toast.error('Delete failed - annotation restored');
      } else {
        toast.error('Failed to delete annotation');
      }
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
      // Use client revision tracking for manual updates as well
      const nextClientRevision = (clientRevisionByIdRef.current.get(annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(annotationId, nextClientRevision);
      pendingRevisionByIdRef.current.set(annotationId, nextClientRevision);
      await updateMutation.mutateAsync({ annotationId, shape, description, clientRevision: nextClientRevision });
    },
    [updateMutation]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      await deleteMutation.mutateAsync(annotationId);
    },
    [deleteMutation]
  );

  // Handle pin annotation move with debounced API sync and clientRevision tracking
  const handleAnnotationMove = useCallback(
    (annotationId: string, position: { x: number; y: number }) => {
      // Update local state immediately
      localHandleMove(annotationId, position);

      // Increment client revision and mark as pending
      const nextClientRevision = (clientRevisionByIdRef.current.get(annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(annotationId, nextClientRevision);
      pendingRevisionByIdRef.current.set(annotationId, nextClientRevision);

      // Debounced API update with clientRevision
      const newShape: AnnotationShape = { type: 'pin', position };
      debouncedUpdate(annotationId, newShape, nextClientRevision);
    },
    [localHandleMove, debouncedUpdate]
  );

  // Handle box annotation move/resize with debounced API sync and clientRevision tracking
  const handleBoxAnnotationMove = useCallback(
    (annotationId: string, start: { x: number; y: number }, end: { x: number; y: number }) => {
      // Update local state immediately
      localHandleBoxMove(annotationId, start, end);

      // Increment client revision and mark as pending
      const nextClientRevision = (clientRevisionByIdRef.current.get(annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(annotationId, nextClientRevision);
      pendingRevisionByIdRef.current.set(annotationId, nextClientRevision);

      // Debounced API update with clientRevision
      const newShape: AnnotationShape = { type: 'box', start, end };
      debouncedUpdate(annotationId, newShape, nextClientRevision);
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
    showShortcutsHelp: tools.showShortcutsHelp,

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
    setShowShortcutsHelp: tools.setShowShortcutsHelp,

    // Drag state - per-annotation tracking
    setDragging: (annotationId: string, isDragging: boolean) => {
      if (isDragging) draggingIdsRef.current.add(annotationId);
      else draggingIdsRef.current.delete(annotationId);
    },

    // Unsaved changes tracking
    hasUnsavedChanges,

    // Refresh
    refetch,
  };
}
