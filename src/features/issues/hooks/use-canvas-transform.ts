'use client';

import { useState, useCallback, useMemo } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type FitMode = 'fit' | 'fill' | 'actual';

export interface CanvasTransformState {
  panX: number;
  panY: number;
  zoom: number;
  fitMode: FitMode;
}

export interface CanvasTransform {
  // State
  panX: number;
  panY: number;
  zoom: number;
  fitMode: FitMode;

  // Derived CSS values
  cssTransform: string;
  backgroundPosition: string;
  backgroundSize: (baseGridSize: number) => string;

  // Actions
  pan: (deltaX: number, deltaY: number) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (level: number) => void;
  zoomAtPoint: (zoomDelta: number, focalPoint: Point, containerSize: Size) => void;
  setFitMode: (mode: FitMode) => void;
  reset: () => void;
  fitToContent: (contentSize: Size, containerSize: Size) => void;
}

interface UseCanvasTransformOptions {
  initialPanX?: number;
  initialPanY?: number;
  initialZoom?: number;
  initialFitMode?: FitMode;
  minZoom?: number;
  maxZoom?: number;
  onStateChange?: (state: CanvasTransformState) => void;
}

/**
 * Centralized hook for managing infinite canvas transform state.
 * 
 * Follows FigJam/Figma patterns:
 * - Unified pan/zoom state
 * - Zoom-to-cursor (focal point zoom)
 * - CSS transform generation for GPU acceleration
 * - Background position calculation for infinite grid tiling
 */
export function useCanvasTransform(options: UseCanvasTransformOptions = {}): CanvasTransform {
  const {
    initialPanX = 0,
    initialPanY = 0,
    initialZoom = 1,
    initialFitMode = 'fit',
    minZoom = 0.1,
    maxZoom = 5,
    onStateChange,
  } = options;

  const [panX, setPanXState] = useState(initialPanX);
  const [panY, setPanYState] = useState(initialPanY);
  const [zoom, setZoomState] = useState(initialZoom);
  const [fitMode, setFitModeState] = useState<FitMode>(initialFitMode);

  // Notify parent of state changes
  const notifyChange = useCallback(
    (state: Partial<CanvasTransformState>) => {
      onStateChange?.({
        panX,
        panY,
        zoom,
        fitMode,
        ...state,
      });
    },
    [panX, panY, zoom, fitMode, onStateChange]
  );

  // Clamp zoom to valid range
  const clampZoom = useCallback(
    (value: number) => Math.max(minZoom, Math.min(maxZoom, value)),
    [minZoom, maxZoom]
  );

  // Pan by delta
  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      const newX = panX + deltaX;
      const newY = panY + deltaY;
      setPanXState(newX);
      setPanYState(newY);
      notifyChange({ panX: newX, panY: newY });
    },
    [panX, panY, notifyChange]
  );

  // Set pan directly
  const setPan = useCallback(
    (x: number, y: number) => {
      setPanXState(x);
      setPanYState(y);
      notifyChange({ panX: x, panY: y });
    },
    [notifyChange]
  );

  // Set zoom directly
  const setZoom = useCallback(
    (level: number) => {
      const clamped = clampZoom(level);
      setZoomState(clamped);
      notifyChange({ zoom: clamped });
    },
    [clampZoom, notifyChange]
  );

  /**
   * Zoom at a specific point (zoom-to-cursor).
   * This keeps the point under the cursor stationary while zooming.
   * 
   * @param zoomDelta - Positive to zoom in, negative to zoom out
   * @param focalPoint - Point in container coordinates (pixels)
   * @param containerSize - Size of the container
   */
  const zoomAtPoint = useCallback(
    (zoomDelta: number, focalPoint: Point, containerSize: Size) => {
      const newZoom = clampZoom(zoom * (1 + zoomDelta));
      const scaleDiff = newZoom / zoom;

      // Calculate the point that's under the cursor relative to center
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;

      // Point on canvas under cursor (relative to current transform origin)
      const pointX = focalPoint.x - centerX - panX;
      const pointY = focalPoint.y - centerY - panY;

      // Adjust pan to keep this point stationary
      const newPanX = panX - pointX * (scaleDiff - 1);
      const newPanY = panY - pointY * (scaleDiff - 1);

      setPanXState(newPanX);
      setPanYState(newPanY);
      setZoomState(newZoom);
      notifyChange({ panX: newPanX, panY: newPanY, zoom: newZoom });
    },
    [zoom, panX, panY, clampZoom, notifyChange]
  );

  // Set fit mode
  const setFitMode = useCallback(
    (mode: FitMode) => {
      setFitModeState(mode);
      notifyChange({ fitMode: mode });
    },
    [notifyChange]
  );

  // Reset to initial state
  const reset = useCallback(() => {
    setPanXState(0);
    setPanYState(0);
    setZoomState(1);
    notifyChange({ panX: 0, panY: 0, zoom: 1 });
  }, [notifyChange]);

  /**
   * Fit content to container, optionally centering it.
   */
  const fitToContent = useCallback(
    (contentSize: Size, containerSize: Size) => {
      if (contentSize.width === 0 || contentSize.height === 0) return;

      const containerAspect = containerSize.width / containerSize.height;
      const contentAspect = contentSize.width / contentSize.height;

      let newZoom: number;
      if (contentAspect > containerAspect) {
        // Content is wider - fit by width
        newZoom = containerSize.width / contentSize.width;
      } else {
        // Content is taller - fit by height
        newZoom = containerSize.height / contentSize.height;
      }

      const clampedZoom = clampZoom(newZoom);
      setPanXState(0);
      setPanYState(0);
      setZoomState(clampedZoom);
      setFitModeState('fit');
      notifyChange({ panX: 0, panY: 0, zoom: clampedZoom, fitMode: 'fit' });
    },
    [clampZoom, notifyChange]
  );

  // Derived CSS values (memoized for performance)
  const cssTransform = useMemo(
    () => `translate(${panX}px, ${panY}px) scale(${zoom})`,
    [panX, panY, zoom]
  );

  // Background position for infinite grid effect
  // The background position moves opposite to content pan for proper tiling
  const backgroundPosition = useMemo(
    () => `${panX}px ${panY}px`,
    [panX, panY]
  );

  // Background size scales with zoom
  const backgroundSize = useCallback(
    (baseGridSize: number) => {
      const scaledSize = baseGridSize * zoom;
      return `${scaledSize}px ${scaledSize}px`;
    },
    [zoom]
  );

  return {
    // State
    panX,
    panY,
    zoom,
    fitMode,

    // Derived
    cssTransform,
    backgroundPosition,
    backgroundSize,

    // Actions
    pan,
    setPan,
    setZoom,
    zoomAtPoint,
    setFitMode,
    reset,
    fitToContent,
  };
}
