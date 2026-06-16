'use client';

import { memo } from 'react';
import { motion, motionValue, MotionValue, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

interface InfiniteCanvasBackgroundBaseProps {
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

interface InfiniteCanvasBackgroundProps extends InfiniteCanvasBackgroundBaseProps {
  /**
   * Pan X offset - can be a number or a MotionValue for animated updates
   */
  panX: number | MotionValue<number>;
  /**
   * Pan Y offset - can be a number or a MotionValue for animated updates
   */
  panY: number | MotionValue<number>;
}

interface AnimatedInfiniteCanvasBackgroundProps extends InfiniteCanvasBackgroundBaseProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
}

interface StaticInfiniteCanvasBackgroundProps extends InfiniteCanvasBackgroundBaseProps {
  panX: number;
  panY: number;
}

const getGridBackgroundStyles = (zoom: number, gridSize: number, dotSize: number) => {
  const scaledGridSize = gridSize * zoom;
  const scaledDotSize = Math.max(dotSize * Math.min(zoom, 1), 0.5);

  return {
    backgroundImage: `radial-gradient(circle at ${scaledDotSize}px ${scaledDotSize}px, var(--color-canvas-dotted) ${scaledDotSize}px, transparent 0)`,
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
  };
};

const isMotionValue = (value: number | MotionValue<number>): value is MotionValue<number> => (
  value instanceof MotionValue
);

function AnimatedInfiniteCanvasBackground({
  panX,
  panY,
  zoom,
  gridSize = 16,
  dotSize = 1,
  className,
}: AnimatedInfiniteCanvasBackgroundProps) {
  const backgroundPosition = useTransform(
    [panX, panY],
    ([x, y]) => `${x}px ${y}px`
  );

  return (
    <motion.div
      className={cn(
        'absolute inset-0 z-0 pointer-events-none',
        className
      )}
      style={{
        ...getGridBackgroundStyles(zoom, gridSize, dotSize),
        backgroundPosition,
        opacity: 0.7,
        willChange: 'background-position',
      }}
      aria-hidden="true"
    />
  );
}

function StaticInfiniteCanvasBackground({
  panX,
  panY,
  zoom,
  gridSize = 16,
  dotSize = 1,
  className,
}: StaticInfiniteCanvasBackgroundProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-0 pointer-events-none',
        className
      )}
      style={{
        ...getGridBackgroundStyles(zoom, gridSize, dotSize),
        backgroundPosition: `${panX}px ${panY}px`,
        opacity: 0.7,
        willChange: 'background-position, background-size',
      }}
      aria-hidden="true"
    />
  );
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
  if (isMotionValue(panX) || isMotionValue(panY)) {
    return (
      <AnimatedInfiniteCanvasBackground
        panX={isMotionValue(panX) ? panX : motionValue(panX)}
        panY={isMotionValue(panY) ? panY : motionValue(panY)}
        zoom={zoom}
        gridSize={gridSize}
        dotSize={dotSize}
        className={className}
      />
    );
  }

  return (
    <StaticInfiniteCanvasBackground
      panX={panX}
      panY={panY}
      zoom={zoom}
      gridSize={gridSize}
      dotSize={dotSize}
      className={className}
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
    if (
      isMotionValue(prevProps.panX) ||
      isMotionValue(prevProps.panY) ||
      isMotionValue(nextProps.panX) ||
      isMotionValue(nextProps.panY)
    ) {
      return prevProps.panX === nextProps.panX && 
             prevProps.panY === nextProps.panY &&
             prevProps.zoom === nextProps.zoom &&
             prevProps.gridSize === nextProps.gridSize &&
             prevProps.dotSize === nextProps.dotSize &&
             prevProps.className === nextProps.className;
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
