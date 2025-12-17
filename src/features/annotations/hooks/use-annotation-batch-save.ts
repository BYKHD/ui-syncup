'use client';

/**
 * useAnnotationBatchSave Hook
 *
 * Queues multiple annotation updates and saves them as a batch.
 * Provides debounced batch saves to reduce API calls during rapid edits.
 *
 * @module features/annotations/hooks/use-annotation-batch-save
 */

import { useCallback, useRef, useState } from 'react';
import type { AnnotationShape } from '../types';

export interface BatchSaveItem {
  annotationId: string;
  shape: AnnotationShape;
}

export interface UseAnnotationBatchSaveOptions {
  /** Debounce delay in ms before flushing the batch */
  debounceMs?: number;
  /** Called when batch save is triggered */
  onSave?: (items: BatchSaveItem[]) => Promise<void>;
  /** Called on batch save success */
  onSuccess?: () => void;
  /** Called on batch save error */
  onError?: (error: Error) => void;
}

export interface UseAnnotationBatchSaveResult {
  /** Queue an annotation update */
  queueUpdate: (annotationId: string, shape: AnnotationShape) => void;
  /** Number of pending items in queue */
  pendingCount: number;
  /** Whether a batch save is in progress */
  isSaving: boolean;
  /** Immediately flush all queued updates */
  flush: () => Promise<void>;
  /** Clear the queue without saving */
  clear: () => void;
}

export function useAnnotationBatchSave(
  options: UseAnnotationBatchSaveOptions = {}
): UseAnnotationBatchSaveResult {
  const { debounceMs = 500, onSave, onSuccess, onError } = options;

  const [isSaving, setIsSaving] = useState(false);
  const queueRef = useRef<Map<string, AnnotationShape>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const items = Array.from(queueRef.current.entries()).map(
      ([annotationId, shape]) => ({ annotationId, shape })
    );

    if (items.length === 0) return;

    queueRef.current.clear();
    setIsSaving(true);

    try {
      await onSave?.(items);
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Batch save failed'));
    } finally {
      setIsSaving(false);
    }
  }, [onSave, onSuccess, onError]);

  const queueUpdate = useCallback(
    (annotationId: string, shape: AnnotationShape) => {
      // Replace existing update for same annotation (latest wins)
      queueRef.current.set(annotationId, shape);

      // Reset debounce timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        void flush();
      }, debounceMs);
    },
    [flush, debounceMs]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    queueRef.current.clear();
  }, []);

  return {
    queueUpdate,
    pendingCount: queueRef.current.size,
    isSaving,
    flush,
    clear,
  };
}
