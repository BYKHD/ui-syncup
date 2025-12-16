'use client';

/**
 * useAutoSave Hook
 *
 * Periodically triggers save operations during long editing sessions.
 * Provides auto-save functionality to prevent data loss.
 *
 * @module features/annotations/hooks/use-auto-save
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseAutoSaveOptions {
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Interval in ms between auto-saves */
  interval?: number;
  /** Called when auto-save triggers */
  onSave: () => Promise<void>;
  /** Called on auto-save success */
  onSuccess?: () => void;
  /** Called on auto-save error */
  onError?: (error: Error) => void;
}

export interface UseAutoSaveResult {
  /** Whether an auto-save is in progress */
  isSaving: boolean;
  /** Timestamp of last successful auto-save */
  lastSavedAt: number | null;
  /** Manually trigger an auto-save */
  triggerSave: () => Promise<void>;
}

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveResult {
  const {
    enabled = true,
    hasUnsavedChanges,
    interval = 30000, // 30 seconds default
    onSave,
    onSuccess,
    onError,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave();
      setLastSavedAt(Date.now());
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Auto-save failed'));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave, onSuccess, onError]);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval only if there are unsaved changes
    intervalRef.current = setInterval(() => {
      void triggerSave();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, hasUnsavedChanges, interval, triggerSave]);

  return {
    isSaving,
    lastSavedAt,
    triggerSave,
  };
}
