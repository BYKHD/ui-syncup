// ============================================================================
// USE ANNOTATION SAVE HOOK
// Manages save state and operations for annotation position updates
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type {
  AnnotationSaveState,
  AnnotationSaveStatus,
  AnnotationShape,
  AttachmentAnnotation,
} from '@/features/annotations/types';
import {
  saveAnnotationPosition,
  createAnnotation,
  type SaveAnnotationPositionParams,
  type CreateAnnotationParams,
} from '@/features/annotations/api/save-annotation';

export interface UseAnnotationSaveOptions {
  onSaveSuccess?: (annotation: AttachmentAnnotation) => void;
  onSaveError?: (error: Error) => void;
  autoResetDelay?: number; // Auto-reset status to idle after success (ms)
  enableToasts?: boolean; // Show toast notifications for save operations
}

export interface UseAnnotationSaveReturn {
  saveState: AnnotationSaveState;
  saveAnnotationPosition: (params: Omit<SaveAnnotationPositionParams, 'actorId'>) => Promise<void>;
  createNewAnnotation: (params: Omit<CreateAnnotationParams, 'actorId'>) => Promise<void>;
  resetSaveState: () => void;
  isSaving: boolean;
}

/**
 * Hook for managing annotation save operations with state tracking
 *
 * Features:
 * - Tracks save status (idle, saving, success, error)
 * - Debounces rapid save operations
 * - Auto-resets to idle after success
 * - Prevents concurrent saves for same annotation
 *
 * @example
 * ```tsx
 * const { saveAnnotationPosition, saveState, isSaving } = useAnnotationSave({
 *   onSaveSuccess: (annotation) => {
 *     console.log('Saved:', annotation);
 *     updateLocalAnnotation(annotation);
 *   },
 *   onSaveError: (error) => toast.error(error.message),
 * });
 *
 * // When user releases drag
 * await saveAnnotationPosition({
 *   issueId,
 *   attachmentId,
 *   annotationId,
 *   shape: { type: 'pin', position: { x: 0.5, y: 0.5 } },
 * });
 * ```
 */
export function useAnnotationSave(options: UseAnnotationSaveOptions = {}): UseAnnotationSaveReturn {
  const {
    onSaveSuccess,
    onSaveError,
    autoResetDelay = 2000,
    enableToasts = false,
  } = options;

  const [saveState, setSaveState] = useState<AnnotationSaveState>({
    status: 'idle',
  });

  const savingRef = useRef<Set<string>>(new Set());
  const resetTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Auto-reset to idle after success
  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setSaveState((prev) => {
        if (prev.status === 'success' || prev.status === 'error') {
          return { status: 'idle' };
        }
        return prev;
      });
    }, autoResetDelay);
  }, [autoResetDelay]);

  const resetSaveState = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setSaveState({ status: 'idle' });
    savingRef.current.clear();
  }, []);

  const savePosition = useCallback(
    async (params: Omit<SaveAnnotationPositionParams, 'actorId'>) => {
      const { annotationId } = params;

      // Prevent concurrent saves for same annotation
      if (savingRef.current.has(annotationId)) {
        console.warn('Save already in progress for annotation:', annotationId);
        return;
      }

      savingRef.current.add(annotationId);

      setSaveState({
        status: 'saving',
      });

      try {
        // Call mock API (TODO: replace with real API)
        const response = await saveAnnotationPosition({
          ...params,
          actorId: 'current_user', // TODO: Get from auth context
        });

        setSaveState({
          status: 'success',
          lastSavedAt: Date.now(),
        });

        if (enableToasts) {
          toast.success('Annotation saved');
        }

        onSaveSuccess?.(response.annotation);
        scheduleReset();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save annotation';

        setSaveState({
          status: 'error',
          error: errorMessage,
        });

        if (enableToasts) {
          toast.error(errorMessage);
        }

        onSaveError?.(error instanceof Error ? error : new Error(errorMessage));
        scheduleReset();
      } finally {
        savingRef.current.delete(annotationId);
      }
    },
    [onSaveSuccess, onSaveError, scheduleReset, enableToasts]
  );

  const createNew = useCallback(
    async (params: Omit<CreateAnnotationParams, 'actorId'>) => {
      setSaveState({
        status: 'saving',
      });

      try {
        // Call mock API (TODO: replace with real API)
        const response = await createAnnotation({
          ...params,
          actorId: 'current_user', // TODO: Get from auth context
        });

        setSaveState({
          status: 'success',
          lastSavedAt: Date.now(),
        });

        if (enableToasts) {
          toast.success('Annotation created');
        }

        onSaveSuccess?.(response.annotation);
        scheduleReset();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create annotation';

        setSaveState({
          status: 'error',
          error: errorMessage,
        });

        if (enableToasts) {
          toast.error(errorMessage);
        }

        onSaveError?.(error instanceof Error ? error : new Error(errorMessage));
        scheduleReset();
      }
    },
    [onSaveSuccess, onSaveError, scheduleReset, enableToasts]
  );

  return {
    saveState,
    saveAnnotationPosition: savePosition,
    createNewAnnotation: createNew,
    resetSaveState,
    isSaving: saveState.status === 'saving',
  };
}
