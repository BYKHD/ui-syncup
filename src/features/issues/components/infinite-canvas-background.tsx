'use client';

import { memo } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { cn } from '@/lib/utils';

interface InfiniteCanvasBackgroundProps {
  /**
   * Pan X offset - can be a number or a MotionValue for animated updates
   */
  panX: number | MotionValue<number>;
  /**
   * Pan Y offset - can be a number or a MotionValue for animated updates
   */
  panY: number | MotionValue<number>;
  /**
   * Zoom level (1 = 100%)
   */
  zoom: number;
  /**
   * Base grid spacing in pixels (before zoom)
   * @default 16
   */
  gridSize?: number;
  /**
   * Dot size in pixels
   * @default 1
   */
  dotSize?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Infinite tiling dotted grid background for canvas.
 * 
 * Uses CSS background-position and background-size to create
 * the illusion of an infinite canvas that moves with pan/zoom.
 * 
 * Now supports both static values and MotionValues for real-time
 * animation during drag operations.
 * 
 * Pattern: FigJam, Miro, Excalidraw all use this technique.
 * 
 * @example
 * ```tsx
 * // With static values
 * <InfiniteCanvasBackground panX={100} panY={50} zoom={1} />
 * 
 * // With motion values (for smooth animation during drag)
 * const visualPanX = useMotionValue(0);
 * <InfiniteCanvasBackground panX={visualPanX} panY={visualPanY} zoom={1} />
 * ```
 */
function InfiniteCanvasBackgroundComponent({
  panX,
  panY,
  zoom,
  gridSize = 16,
  dotSize = 1,
  className,
}: InfiniteCanvasBackgroundProps) {
  // Calculate scaled grid size
  const scaledGridSize = gridSize * zoom;
  
  // Scale dot size with zoom, but keep it visible at low zoom levels
  // Minimum dot size of 0.5px for visibility
  const scaledDotSize = Math.max(dotSize * Math.min(zoom, 1), 0.5);

  // Check if we're using motion values (for animated panning)
  const isMotionX = typeof panX !== 'number';
  const isMotionY = typeof panY !== 'number';

  // Create the background position transform
  // If using motion values, transform them to CSS string
  const backgroundPositionX = isMotionX
    ? useTransform(panX as MotionValue<number>, (x) => `${x}px`)
    : `${panX}px`;
  
  const backgroundPositionY = isMotionY
    ? useTransform(panY as MotionValue<number>, (y) => `${y}px`)
    : `${panY}px`;

  // If either pan value is a motion value, we need to use motion.div
  if (isMotionX || isMotionY) {
    // Create combined background-position motion value
    const bgPosition = isMotionX && isMotionY
      ? useTransform(
          [panX as MotionValue<number>, panY as MotionValue<number>],
          ([x, y]) => `${x}px ${y}px`
        )
      : isMotionX
        ? useTransform(panX as MotionValue<number>, (x) => `${x}px ${panY}px`)
        : useTransform(panY as MotionValue<number>, (y) => `${panX}px ${y}px`);

    return (
      <motion.div
        className={cn(
          'absolute inset-0 z-0 pointer-events-none',
          className
        )}
        style={{
          backgroundImage: `radial-gradient(circle at ${scaledDotSize}px ${scaledDotSize}px, var(--color-canvas-dotted) ${scaledDotSize}px, transparent 0)`,
          backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
          backgroundPosition: bgPosition,
          opacity: 0.7,
          willChange: 'background-position',
        }}
        aria-hidden="true"
      />
    );
  }

  // Static values - use regular div (more performant)
  return (
    <div
      className={cn(
        'absolute inset-0 z-0 pointer-events-none',
        className
      )}
      style={{
        backgroundImage: `radial-gradient(circle at ${scaledDotSize}px ${scaledDotSize}px, var(--color-canvas-dotted) ${scaledDotSize}px, transparent 0)`,
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
        backgroundPosition: `${panX}px ${panY}px`,
        opacity: 0.7,
        willChange: 'background-position, background-size',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Memoized version to prevent re-renders when parent state changes
 * but pan/zoom values haven't actually changed.
 * Note: When using MotionValues, memoization is less important
 * as Framer Motion handles updates efficiently.
 */
export const InfiniteCanvasBackground = memo(
  InfiniteCanvasBackgroundComponent,
  (prevProps, nextProps) => {
    // If using motion values, always allow updates (Framer handles it)
    if (typeof prevProps.panX !== 'number' || typeof nextProps.panX !== 'number') {
      return prevProps.panX === nextProps.panX && 
             prevProps.panY === nextProps.panY &&
             prevProps.zoom === nextProps.zoom;
    }
    
    // Only re-render if pan/zoom/config actually changed
    return (
      prevProps.panX === nextProps.panX &&
      prevProps.panY === nextProps.panY &&
      prevProps.zoom === nextProps.zoom &&
      prevProps.gridSize === nextProps.gridSize &&
      prevProps.dotSize === nextProps.dotSize &&
      prevProps.className === nextProps.className
    );
  }
);

InfiniteCanvasBackground.displayName = 'InfiniteCanvasBackground';
