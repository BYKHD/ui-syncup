import { useCallback, useRef, useState } from 'react';

export interface UseLongPressOptions {
  /**
   * Callback fired when long press is detected
   */
  onLongPress: (event: PointerEvent) => void;

  /**
   * Optional callback fired on normal press (short press)
   */
  onPress?: (event: PointerEvent) => void;

  /**
   * Duration in milliseconds to trigger long press
   * @default 500
   */
  threshold?: number;

  /**
   * Movement tolerance in pixels before canceling long press
   * Prevents false triggers during scrolling
   * @default 10
   */
  moveThreshold?: number;

  /**
   * Whether the hook is enabled
   * @default true
   */
  enabled?: boolean;
}

export interface UseLongPressReturn {
  /**
   * Handler for pointer down event
   */
  onPointerDown: (event: React.PointerEvent) => void;

  /**
   * Handler for pointer up event
   */
  onPointerUp: (event: React.PointerEvent) => void;

  /**
   * Handler for pointer move event
   */
  onPointerMove: (event: React.PointerEvent) => void;

  /**
   * Handler for pointer cancel event
   */
  onPointerCancel: (event: React.PointerEvent) => void;

  /**
   * Whether a long press is currently in progress
   * Useful for visual feedback (e.g., show hint after 300ms)
   */
  isLongPressing: boolean;
}

/**
 * Hook for detecting long press gestures on touch and pointer devices.
 *
 * Uses the Pointer Events API for universal compatibility with both
 * touch and mouse interactions. Includes movement threshold to prevent
 * false triggers during scrolling.
 *
 * @example
 * ```tsx
 * const longPress = useLongPress({
 *   onLongPress: () => showContextMenu(),
 *   threshold: 500,
 *   moveThreshold: 10,
 * });
 *
 * return <div {...longPress}>Long press me</div>;
 * ```
 */
export function useLongPress(options: UseLongPressOptions): UseLongPressReturn {
  const {
    onLongPress,
    onPress,
    threshold = 500,
    moveThreshold = 10,
    enabled = true,
  } = options;

  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setIsLongPressing(false);
    startPositionRef.current = null;
    isLongPressTriggeredRef.current = false;
  }, [clearTimer]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return;

      // Store native event for callback
      const nativeEvent = event.nativeEvent;

      // Record start position for movement threshold
      startPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      isLongPressTriggeredRef.current = false;

      // Start long press timer
      timerRef.current = setTimeout(() => {
        setIsLongPressing(true);
        isLongPressTriggeredRef.current = true;
        onLongPress(nativeEvent);
      }, threshold);
    },
    [enabled, threshold, onLongPress]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || !startPositionRef.current) return;

      // Calculate distance moved
      const deltaX = Math.abs(event.clientX - startPositionRef.current.x);
      const deltaY = Math.abs(event.clientY - startPositionRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel long press if moved beyond threshold
      if (distance > moveThreshold) {
        reset();
      }
    },
    [enabled, moveThreshold, reset]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return;

      const nativeEvent = event.nativeEvent;

      // If long press was triggered, don't fire onPress
      if (isLongPressTriggeredRef.current) {
        reset();
        return;
      }

      // Clear timer and fire normal press if provided
      clearTimer();

      if (onPress && startPositionRef.current) {
        // Only fire onPress if we didn't move beyond threshold
        const deltaX = Math.abs(event.clientX - startPositionRef.current.x);
        const deltaY = Math.abs(event.clientY - startPositionRef.current.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance <= moveThreshold) {
          onPress(nativeEvent);
        }
      }

      reset();
    },
    [enabled, onPress, moveThreshold, clearTimer, reset]
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return;
      reset();
    },
    [enabled, reset]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerMove: handlePointerMove,
    onPointerCancel: handlePointerCancel,
    isLongPressing,
  };
}
