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
// DEBOUNCE HELPER WITH FLUSH/CANCEL
// ============================================================================

interface DebouncedCallback<T extends (...args: any[]) => void> {
  /** Call the debounced function */
  (...args: Parameters<T>): void;
  /** Immediately execute with the last pending args (if any) */
  flush: () => void;
  /** Cancel any pending execution */
  cancel: () => void;
  /** Check if there's a pending execution */
  isPending: () => boolean;
}

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): DebouncedCallback<T> {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  
  // Keep callback ref updated
  callbackRef.current = callback;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && pendingArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const args = pendingArgsRef.current;
      pendingArgsRef.current = null;
      callbackRef.current(...args);
    }
  }, []);

  const isPending = useCallback(() => {
    return timeoutRef.current !== null;
  }, []);

  const debouncedFn = useCallback(
    ((...args: Parameters<T>) => {
      // Store args for potential flush
      pendingArgsRef.current = args;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        pendingArgsRef.current = null;
        callbackRef.current(...args);
      }, delay);
    }),
    [delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Create stable result object with methods attached using Object.assign
  // This creates a new function object rather than mutating the original
  return useMemo(
    () => Object.assign(
      (...args: Parameters<T>) => debouncedFn(...args),
      { flush, cancel, isPending }
    ) as DebouncedCallback<T>,
    [debouncedFn, flush, cancel, isPending]
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
  // LOCAL-FIRST AUTOSAVE STATE - Unified State Machine (Phase 1)
  // ============================================================================

  /**
   * Unified annotation save state machine.
   * Each annotation can be in one of these states:
   * - 'idle': No local changes, synced with server
   * - 'dragging': User is actively dragging
   * - 'debouncing': Drag ended, waiting for debounce timer
   * - 'saving': API call in flight
   */
  type AnnotationSaveState = 'idle' | 'dragging' | 'debouncing' | 'saving';

  interface AnnotationStateEntry {
    state: AnnotationSaveState;
    clientRevision: number;
    /** Timestamp when debounce grace period ends (only used in 'debouncing' state) */
    graceEndTime?: number;
  }

  // Unified state tracking per annotation
  const annotationStateRef = useRef(new Map<string, AnnotationStateEntry>());
  
  // Track client revision per annotation (monotonically increasing on each commit)
  const clientRevisionByIdRef = useRef(new Map<string, number>());

  // Track pending saves per annotation (id -> latest pending clientRevision)
  // Kept separate for revision matching in onSettled
  const pendingRevisionByIdRef = useRef(new Map<string, number>());

  // Track unsaved annotations for UI indication
  const unsavedAnnotationsRef = useRef(new Map<string, UnsavedAnnotationState>());

  // Grace period duration after drag ends
  const GRACE_PERIOD_MS = 600; // Slightly longer than debounce (500ms)

  // ============================================================================
  // STATE MACHINE HELPERS
  // ============================================================================

  /** Get annotation state (defaults to 'idle') */
  const getAnnotationState = useCallback((annotationId: string): AnnotationSaveState => {
    return annotationStateRef.current.get(annotationId)?.state ?? 'idle';
  }, []);

  /** Set annotation to dragging state */
  const setStateDragging = useCallback((annotationId: string) => {
    const current = annotationStateRef.current.get(annotationId);
    annotationStateRef.current.set(annotationId, {
      state: 'dragging',
      clientRevision: current?.clientRevision ?? 0,
    });
  }, []);

  /** Set annotation to debouncing state with grace period */
  const setStateDebouncing = useCallback((annotationId: string) => {
    const current = annotationStateRef.current.get(annotationId);
    annotationStateRef.current.set(annotationId, {
      state: 'debouncing',
      clientRevision: current?.clientRevision ?? 0,
      graceEndTime: Date.now() + GRACE_PERIOD_MS,
    });
  }, []);

  /** Set annotation to saving state */
  const setStateSaving = useCallback((annotationId: string, clientRevision: number) => {
    annotationStateRef.current.set(annotationId, {
      state: 'saving',
      clientRevision,
    });
    pendingRevisionByIdRef.current.set(annotationId, clientRevision);
  }, []);

  /** Set annotation to idle state (clear all tracking) */
  const setStateIdle = useCallback((annotationId: string) => {
    annotationStateRef.current.delete(annotationId);
    pendingRevisionByIdRef.current.delete(annotationId);
  }, []);

  // ============================================================================
  // SYNC BLOCKING HELPERS (Pure functions - no mutations)
  // ============================================================================

  /** Check if sync should be blocked globally */
  const isSyncBlocked = useCallback(() => {
    const now = Date.now();
    for (const [, entry] of annotationStateRef.current) {
      if (entry.state === 'dragging') return true;
      if (entry.state === 'saving') return true;
      if (entry.state === 'debouncing') {
        // Only block if still within grace period
        if (entry.graceEndTime && now < entry.graceEndTime) return true;
      }
    }
    // Also check pending revisions (for stale saves)
    if (pendingRevisionByIdRef.current.size > 0) return true;
    return false;
  }, []);

  /** Check if sync should be blocked for a specific annotation */
  const isSyncBlockedForAnnotation = useCallback((annotationId: string) => {
    const entry = annotationStateRef.current.get(annotationId);
    if (!entry) return false;
    
    if (entry.state === 'dragging') return true;
    if (entry.state === 'saving') return true;
    if (entry.state === 'debouncing') {
      // Only block if still within grace period
      if (entry.graceEndTime && Date.now() < entry.graceEndTime) return true;
    }
    
    // Also check pending revision
    if (pendingRevisionByIdRef.current.has(annotationId)) return true;
    
    return false;
  }, []);

  // ============================================================================
  // GRACE PERIOD CLEANUP (Phase 5 - Separate effect, no mutation in callbacks)
  // ============================================================================

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of annotationStateRef.current) {
        // Clean up expired debouncing states that haven't transitioned to saving
        if (entry.state === 'debouncing' && entry.graceEndTime && now >= entry.graceEndTime) {
          // If there's no pending save, the debounce was probably cancelled - go to idle
          if (!pendingRevisionByIdRef.current.has(id)) {
            annotationStateRef.current.delete(id);
          }
        }
      }
    }, 200); // Run every 200ms
    
    return () => clearInterval(cleanupInterval);
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

  // Ref to hold debouncedUpdate callback - allows undo/redo to trigger saves and flush on unload
  const debouncedUpdateRef = useRef<DebouncedCallback<(annotationId: string, shape: AnnotationShape, clientRevision: number) => void> | null>(null);

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

  // Create lookup map for O(1) server annotation access (Phase 4 optimization)
  const serverAnnotationsMap = useMemo(() => {
    if (!query.data) return new Map<string, AttachmentAnnotation>();
    return new Map(query.data.map(ann => [ann.id, ann]));
  }, [query.data]);

  // Sync local state when query data changes (blocked during drag or pending saves)
  // Uses per-annotation filtering to allow unblocked annotations to sync
  // NOTE: Using useEffect (not useMemo) for side effects - React 19 compatible
  useEffect(() => {
    if (!query.data || query.isFetching) return;
    
    // If nothing is blocked, sync everything
    if (!isSyncBlocked()) {
      setAnnotations(query.data);
      return;
    }
    
    // Otherwise, selectively sync only unblocked annotations
    // This preserves local state for annotations being modified while
    // still syncing updates for other annotations
    const mergedAnnotations = localAnnotations.map((localAnn) => {
      // If this annotation is blocked, keep local state
      if (isSyncBlockedForAnnotation(localAnn.id)) {
        return localAnn;
      }
      
      // O(1) lookup using Map instead of O(n) find
      const serverAnn = serverAnnotationsMap.get(localAnn.id);
      return serverAnn ?? localAnn;
    });
    
    // Only update if there are actual changes to unblocked annotations
    const hasChanges = mergedAnnotations.some((merged, idx) => {
      const local = localAnnotations[idx];
      return merged.id !== local?.id || merged.x !== local?.x || merged.y !== local?.y;
    });
    
    if (hasChanges) {
      setAnnotations(mergedAnnotations);
    }
  }, [query.data, query.isFetching, setAnnotations, isSyncBlocked, isSyncBlockedForAnnotation, localAnnotations, serverAnnotationsMap]);

  // ============================================================================
  // BEFOREUNLOAD HANDLER - Flush pending saves on tab close
  // ============================================================================

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Flush any pending debounced saves immediately
      if (debouncedUpdateRef.current?.isPending()) {
        debouncedUpdateRef.current.flush();
      }
      
      // Show warning if there are still pending saves (after flush)
      if (pendingRevisionByIdRef.current.size > 0 || annotationStateRef.current.size > 0) {
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
    
    // Update React Query cache and sync to server based on action type
    if (entry.action === 'create') {
      // Undo create: remove from cache and delete from server
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => 
        old?.filter(ann => ann.id !== entry.annotationId) ?? []
      );
      // Delete from server (fire and forget - no toast needed as this is undo)
      void apiDeleteAnnotation(issueId, attachmentId, entry.annotationId).catch(() => {
        // Silently ignore errors - annotation might already be gone
      });
    } else if (entry.action === 'delete' && entry.fullAnnotation) {
      // Undo delete: add back to cache and re-create on server
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => 
        [...(old || []), entry.fullAnnotation!]
      );
      // Re-create on server with stored data
      if (entry.fullAnnotation.shape) {
        void apiCreateAnnotation(issueId, attachmentId, {
          shape: entry.fullAnnotation.shape,
          description: entry.fullAnnotation.description,
        }).catch((err) => {
          console.error('Failed to restore annotation on undo delete:', err);
        });
      }
    } else if (entry.previousSnapshot && (entry.action === 'move' || entry.action === 'resize')) {
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
  }, [applyUndo, queryClient, queryKey, issueId, attachmentId]);

  // Enhanced applyRedo that updates both local state AND React Query cache AND saves to server
  const enhancedApplyRedo = useCallback((entry: AnnotationHistoryEntry) => {
    // Apply to local state
    applyRedo(entry);
    
    // Update React Query cache and sync to server based on action type
    if (entry.action === 'create' && entry.fullAnnotation) {
      // Redo create: add back to cache and re-create on server
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => 
        [...(old || []), entry.fullAnnotation!]
      );
      // Re-create on server
      if (entry.fullAnnotation.shape) {
        void apiCreateAnnotation(issueId, attachmentId, {
          shape: entry.fullAnnotation.shape,
          description: entry.fullAnnotation.description,
        }).catch((err) => {
          console.error('Failed to re-create annotation on redo:', err);
        });
      }
    } else if (entry.action === 'delete') {
      // Redo delete: remove from cache and delete from server
      queryClient.setQueryData<AttachmentAnnotation[]>(queryKey, (old) => 
        old?.filter(ann => ann.id !== entry.annotationId) ?? []
      );
      // Delete from server
      void apiDeleteAnnotation(issueId, attachmentId, entry.annotationId).catch(() => {
        // Silently ignore errors - annotation might already be gone
      });
    } else if (entry.snapshot && (entry.action === 'move' || entry.action === 'resize')) {
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
  }, [applyRedo, queryClient, queryKey, issueId, attachmentId]);

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
  // MUTATIONS - Update (with auto-retry for transient errors)
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
    // Auto-retry configuration (Phase 6)
    retry: (failureCount, error) => {
      // Don't retry hard errors (permission, not found, validation, quota)
      if (isHardSaveError(error)) return false;
      // Retry up to 3 times for transient errors (network issues, 5xx)
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s (capped at 8s)
      return Math.min(1000 * Math.pow(2, attemptIndex), 8000);
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
      // For transient errors (network/5xx), keep local state - retries are handled automatically
      if (isHardSaveError(error) && context?.previousAnnotations) {
        queryClient.setQueryData(queryKey, context.previousAnnotations);
        setAnnotations(context.previousAnnotations);
        toast.error('Save failed - changes reverted');
      } else {
        // This will only show after all retries exhausted
        toast.error('Failed to save annotation - please check your connection');
      }
      onError?.(error);
    },
    onSettled: (_data, _error, variables) => {
      // Clear pending only if this response matches the latest pending revision
      const pending = pendingRevisionByIdRef.current.get(variables.annotationId);
      if (pending === variables.clientRevision) {
        pendingRevisionByIdRef.current.delete(variables.annotationId);
        clearAnnotationUnsaved(variables.annotationId);
        // Clear annotation state since save completed
        setStateIdle(variables.annotationId);
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
      // Mark as having local changes and set debouncing state (prevents race condition)
      setStateDebouncing(annotationId);
      
      // Update local state immediately
      localHandleMove(annotationId, position);

      // Increment client revision and mark as saving
      const nextClientRevision = (clientRevisionByIdRef.current.get(annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(annotationId, nextClientRevision);
      setStateSaving(annotationId, nextClientRevision);

      // Debounced API update with clientRevision
      const newShape: AnnotationShape = { type: 'pin', position };
      debouncedUpdate(annotationId, newShape, nextClientRevision);
    },
    [localHandleMove, debouncedUpdate, setStateDebouncing, setStateSaving]
  );

  // Handle box annotation move/resize with debounced API sync and clientRevision tracking
  const handleBoxAnnotationMove = useCallback(
    (annotationId: string, start: { x: number; y: number }, end: { x: number; y: number }) => {
      // Mark as having local changes and set debouncing state (prevents race condition)
      setStateDebouncing(annotationId);
      
      // Update local state immediately
      localHandleBoxMove(annotationId, start, end);

      // Increment client revision and mark as saving
      const nextClientRevision = (clientRevisionByIdRef.current.get(annotationId) ?? 0) + 1;
      clientRevisionByIdRef.current.set(annotationId, nextClientRevision);
      setStateSaving(annotationId, nextClientRevision);

      // Debounced API update with clientRevision
      const newShape: AnnotationShape = { type: 'box', start, end };
      debouncedUpdate(annotationId, newShape, nextClientRevision);
    },
    [localHandleBoxMove, debouncedUpdate, setStateDebouncing, setStateSaving]
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

    // Drag state - per-annotation tracking via state machine
    setDragging: (annotationId: string, isDragging: boolean) => {
      if (isDragging) {
        setStateDragging(annotationId);
      } else {
        // Transition to debouncing state with grace period
        // This prevents sync from overwriting local state before save mutation starts
        setStateDebouncing(annotationId);
      }
    },

    // Unsaved changes tracking
    hasUnsavedChanges,

    // Refresh
    refetch,
  };
}
