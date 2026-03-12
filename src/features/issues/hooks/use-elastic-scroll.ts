'use client';

import { useCallback, useMemo } from 'react';

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface UseElasticScrollOptions {
  /** Container (viewport) dimensions */
  containerSize: { width: number; height: number };
  /** Content (image) dimensions after scaling */
  contentSize: { width: number; height: number };
  /** Minimum pixels of content that must remain visible */
  minVisibilityPx?: number;
  /** Minimum ratio of content that must remain visible (0-1) */
  minVisibilityRatio?: number;
  /** Rubber band elasticity (0 = no stretch, 1 = linear with no resistance) */
  elasticity?: number;
  /** Whether elastic scroll is enabled */
  enabled?: boolean;
}

export interface UseElasticScrollReturn {
  /** Calculated bounds for pan limits */
  bounds: Bounds;
  /** Apply rubber band effect during drag (returns visual position) */
  applyRubberBand: (panX: number, panY: number) => { x: number; y: number };
  /** Check if position is beyond bounds */
  isOverscrolled: (panX: number, panY: number) => boolean;
  /** Get clamped position within valid bounds */
  getClampedPosition: (panX: number, panY: number) => { x: number; y: number };
  /** Get overscroll amount for each direction */
  getOverscrollAmount: (panX: number, panY: number) => { x: number; y: number };
}

/**
 * Apple's rubber band formula using logarithmic resistance.
 * Creates diminishing returns as you pull further past the boundary.
 * 
 * @param offset - Distance from boundary (positive = overscrolled)
 * @param dimension - Container dimension for resistance calculation
 * @param elasticity - Elasticity factor (0.55 mimics iOS)
 */
function rubberBandClamp(
  offset: number,
  dimension: number,
  elasticity: number
): number {
  // Logarithmic damping formula (Apple's approach)
  // Returns dampened offset that increases slowly the further you pull
  const resistance = (1 - (1 / ((offset * elasticity / dimension) + 1)));
  return dimension * resistance;
}

/**
 * Apply rubber band effect to a single axis.
 * Returns the visual position after applying elastic resistance.
 */
function applyRubberBandToAxis(
  pan: number,
  min: number,
  max: number,
  dimension: number,
  elasticity: number
): number {
  if (pan < min) {
    // Overscrolled past left/top boundary
    const overscroll = min - pan;
    const dampened = rubberBandClamp(overscroll, dimension, elasticity);
    return min - dampened;
  } else if (pan > max) {
    // Overscrolled past right/bottom boundary
    const overscroll = pan - max;
    const dampened = rubberBandClamp(overscroll, dimension, elasticity);
    return max + dampened;
  }
  // Within bounds - no damping
  return pan;
}

/**
 * Hook for iOS-style elastic overscroll behavior.
 * 
 * Features:
 * - Calculates valid pan bounds based on content/container sizes
 * - Applies rubber-band damping when panning beyond bounds
 * - Provides clamped positions for spring-back animation
 * 
 * @example
 * ```tsx
 * const { bounds, applyRubberBand, getClampedPosition } = useElasticScroll({
 *   containerSize: { width: 800, height: 600 },
 *   contentSize: { width: 1200, height: 900 },
 * });
 * 
 * // During drag:
 * const visual = applyRubberBand(rawPanX, rawPanY);
 * 
 * // On release:
 * const target = getClampedPosition(rawPanX, rawPanY);
 * animate(panX, target.x, springConfig);
 * ```
 */
export function useElasticScroll({
  containerSize,
  contentSize,
  minVisibilityPx = 100,
  minVisibilityRatio = 0.2,
  elasticity = 0.55,
  enabled = true,
}: UseElasticScrollOptions): UseElasticScrollReturn {
  
  /**
   * Calculate the bounds (pan limits) based on content and container sizes.
   * 
   * The bounds define how far the content can be panned before rubber-band kicks in.
   * 
   * Behavior:
   * - Content LARGER than container: Can pan until minVisibility of VIEWPORT is still covered by image
   * - Content SMALLER than container: Can pan until minVisibility of CONTENT remains visible
   * - This ensures consistent 20% visibility constraint in both scenarios
   */
  const bounds = useMemo<Bounds>(() => {
    if (!enabled || contentSize.width === 0 || contentSize.height === 0) {
      // No bounds when disabled or no content
      return {
        left: -Infinity,
        right: Infinity,
        top: -Infinity,
        bottom: Infinity,
      };
    }

    // Half dimensions for centering calculations
    const halfContainerWidth = containerSize.width / 2;
    const halfContainerHeight = containerSize.height / 2;
    const halfContentWidth = contentSize.width / 2;
    const halfContentHeight = contentSize.height / 2;

    let maxPanX: number;
    let maxPanY: number;

    if (contentSize.width > containerSize.width) {
      // Content is WIDER than container
      // Allow pan until minVisibility of VIEWPORT remains covered by image
      // The image edge can go (containerWidth * minVisibilityRatio) past the viewport edge
      const minVisibleViewportWidth = Math.max(
        minVisibilityPx,
        containerSize.width * minVisibilityRatio
      );
      // At center (pan=0), image spans past both edges
      // Max pan = how far we can go before only minVisibility of viewport is covered
      maxPanX = halfContentWidth - minVisibleViewportWidth;
    } else {
      // Content is SMALLER than or equal to container
      // Allow pan until minVisibility of CONTENT remains visible in viewport
      const minVisibleContentWidth = Math.max(
        minVisibilityPx,
        contentSize.width * minVisibilityRatio
      );
      maxPanX = halfContentWidth - minVisibleContentWidth + halfContainerWidth;
    }

    if (contentSize.height > containerSize.height) {
      // Content is TALLER than container
      // Allow pan until minVisibility of VIEWPORT remains covered by image
      const minVisibleViewportHeight = Math.max(
        minVisibilityPx,
        containerSize.height * minVisibilityRatio
      );
      maxPanY = halfContentHeight - minVisibleViewportHeight;
    } else {
      // Content is SMALLER than or equal to container
      // Allow pan until minVisibility of CONTENT remains visible in viewport
      const minVisibleContentHeight = Math.max(
        minVisibilityPx,
        contentSize.height * minVisibilityRatio
      );
      maxPanY = halfContentHeight - minVisibleContentHeight + halfContainerHeight;
    }

    return {
      left: -maxPanX,
      right: maxPanX,
      top: -maxPanY,
      bottom: maxPanY,
    };
  }, [containerSize, contentSize, minVisibilityPx, minVisibilityRatio, enabled]);

  /**
   * Apply rubber band effect to pan position.
   * Returns the visual position with elastic damping applied.
   */
  const applyRubberBand = useCallback(
    (panX: number, panY: number): { x: number; y: number } => {
      if (!enabled) {
        return { x: panX, y: panY };
      }

      return {
        x: applyRubberBandToAxis(
          panX,
          bounds.left,
          bounds.right,
          containerSize.width,
          elasticity
        ),
        y: applyRubberBandToAxis(
          panY,
          bounds.top,
          bounds.bottom,
          containerSize.height,
          elasticity
        ),
      };
    },
    [bounds, containerSize, elasticity, enabled]
  );

  /**
   * Check if position is beyond bounds.
   */
  const isOverscrolled = useCallback(
    (panX: number, panY: number): boolean => {
      if (!enabled) return false;
      
      return (
        panX < bounds.left ||
        panX > bounds.right ||
        panY < bounds.top ||
        panY > bounds.bottom
      );
    },
    [bounds, enabled]
  );

  /**
   * Get clamped position within valid bounds.
   * Use this as the target for spring-back animation.
   */
  const getClampedPosition = useCallback(
    (panX: number, panY: number): { x: number; y: number } => {
      if (!enabled) {
        return { x: panX, y: panY };
      }

      return {
        x: Math.max(bounds.left, Math.min(bounds.right, panX)),
        y: Math.max(bounds.top, Math.min(bounds.bottom, panY)),
      };
    },
    [bounds, enabled]
  );

  /**
   * Get the overscroll amount for each axis.
   * Positive = overscrolled past right/bottom, negative = past left/top.
   */
  const getOverscrollAmount = useCallback(
    (panX: number, panY: number): { x: number; y: number } => {
      if (!enabled) {
        return { x: 0, y: 0 };
      }

      let overscrollX = 0;
      let overscrollY = 0;

      if (panX < bounds.left) {
        overscrollX = panX - bounds.left;
      } else if (panX > bounds.right) {
        overscrollX = panX - bounds.right;
      }

      if (panY < bounds.top) {
        overscrollY = panY - bounds.top;
      } else if (panY > bounds.bottom) {
        overscrollY = panY - bounds.bottom;
      }

      return { x: overscrollX, y: overscrollY };
    },
    [bounds, enabled]
  );

  return {
    bounds,
    applyRubberBand,
    isOverscrolled,
    getClampedPosition,
    getOverscrollAmount,
  };
}
