'use client';

import { useState, useRef, useCallback } from 'react';

export type PopoverMode = 'preview' | 'expanded';

export interface PopoverState {
  annotationId: string;
  mode: PopoverMode;
}

interface UseAnnotationPopoverOptions {
  /** Delay in ms before showing preview on hover (default: 200) */
  hoverDelay?: number;
  /** Delay in ms before closing preview when mouse leaves (default: 100) */
  closeDelay?: number;
  /** Whether dragging is currently active (prevents popover from showing) */
  isDragging?: boolean;
}

/**
 * Hook for managing annotation popover state.
 * Ensures only one popover is open at a time with hover preview → click expand behavior.
 */
export function useAnnotationPopover(options: UseAnnotationPopoverOptions = {}) {
  const { hoverDelay = 200, closeDelay = 150, isDragging = false } = options;
  
  const [state, setState] = useState<PopoverState | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const isOverPopoverRef = useRef(false);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  /**
   * Called when mouse enters an annotation.
   * Starts hover delay timer to show preview.
   */
  const handleHoverStart = useCallback((annotationId: string) => {
    // Don't show popover during drag operations
    if (isDragging) return;
    
    hoveredIdRef.current = annotationId;
    clearHoverTimer();
    clearCloseTimer(); // Cancel any pending close

    // If already showing this annotation in any mode, just keep it open
    if (state?.annotationId === annotationId) {
      return;
    }

    hoverTimerRef.current = setTimeout(() => {
      // Double-check we're still hovering the same annotation
      if (hoveredIdRef.current === annotationId && !isDragging) {
        setState({ annotationId, mode: 'preview' });
      }
    }, hoverDelay);
  }, [isDragging, hoverDelay, clearHoverTimer, clearCloseTimer, state]);

  /**
   * Called when mouse leaves an annotation.
   * Starts close timer with delay to allow mouse to travel to popover.
   */
  const handleHoverEnd = useCallback(() => {
    hoveredIdRef.current = null;
    clearHoverTimer();

    // Only close if in preview mode, not expanded
    if (state?.mode === 'preview') {
      // Delay closing to allow mouse to travel to popover
      closeTimerRef.current = setTimeout(() => {
        // Check if mouse is now over the popover
        if (!isOverPopoverRef.current) {
          setState(null);
        }
      }, closeDelay);
    }
  }, [clearHoverTimer, closeDelay, state?.mode]);

  /**
   * Called when mouse enters the popover element.
   */
  const handlePopoverMouseEnter = useCallback(() => {
    isOverPopoverRef.current = true;
    clearCloseTimer(); // Cancel any pending close
  }, [clearCloseTimer]);

  /**
   * Called when mouse leaves the popover element.
   */
  const handlePopoverMouseLeave = useCallback(() => {
    isOverPopoverRef.current = false;
    
    // If in preview mode and not over annotation, close after delay
    if (state?.mode === 'preview' && hoveredIdRef.current !== state.annotationId) {
      closeTimerRef.current = setTimeout(() => {
        if (!isOverPopoverRef.current && hoveredIdRef.current !== state.annotationId) {
          setState(null);
        }
      }, closeDelay);
    }
  }, [closeDelay, state]);

  /**
   * Called when annotation is clicked.
   * Expands to full thread view.
   */
  const handleClick = useCallback((annotationId: string) => {
    // Don't open popover during drag operations
    if (isDragging) return;

    clearHoverTimer();
    clearCloseTimer();
    
    // If clicking the same annotation that's already expanded, close it
    if (state?.annotationId === annotationId && state.mode === 'expanded') {
      setState(null);
      return;
    }

    setState({ annotationId, mode: 'expanded' });
  }, [isDragging, clearHoverTimer, clearCloseTimer, state]);

  /**
   * Close the popover.
   */
  const close = useCallback(() => {
    clearHoverTimer();
    clearCloseTimer();
    isOverPopoverRef.current = false;
    setState(null);
  }, [clearHoverTimer, clearCloseTimer]);

  /**
   * Check if a specific annotation has an open popover.
   */
  const isOpen = useCallback((annotationId: string) => {
    return state?.annotationId === annotationId;
  }, [state]);

  /**
   * Get the current popover mode for an annotation (or null if not open).
   */
  const getMode = useCallback((annotationId: string): PopoverMode | null => {
    if (state?.annotationId === annotationId) {
      return state.mode;
    }
    return null;
  }, [state]);

  return {
    state,
    handleHoverStart,
    handleHoverEnd,
    handlePopoverMouseEnter,
    handlePopoverMouseLeave,
    handleClick,
    close,
    isOpen,
    getMode,
  };
}
