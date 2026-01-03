'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface InfiniteCanvasBackgroundProps {
  /**
   * Pan X offset in pixels
   */
  panX: number;
  /**
   * Pan Y offset in pixels
   */
  panY: number;
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
 * Pattern: FigJam, Miro, Excalidraw all use this technique.
 * 
 * @example
 * ```tsx
 * <InfiniteCanvasBackground 
 *   panX={transform.panX}
 *   panY={transform.panY}
 *   zoom={transform.zoom}
 * />
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

  return (
    <div
      className={cn(
        'absolute inset-0 z-0 pointer-events-none',
        className
      )}
      style={{
        // Create dot pattern using radial gradient
        backgroundImage: `radial-gradient(circle at ${scaledDotSize}px ${scaledDotSize}px, var(--color-canvas-dotted) ${scaledDotSize}px, transparent 0)`,
        // Scale grid with zoom
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
        // Move background with pan (creates infinite tiling effect)
        backgroundPosition: `${panX}px ${panY}px`,
        // Slight opacity for subtlety
        opacity: 0.7,
        // GPU acceleration hint
        willChange: 'background-position, background-size',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Memoized version to prevent re-renders when parent state changes
 * but pan/zoom values haven't actually changed.
 */
export const InfiniteCanvasBackground = memo(
  InfiniteCanvasBackgroundComponent,
  (prevProps, nextProps) => {
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
