"use client";

import { useState, type ReactNode, type RefObject, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, animate } from "motion/react";
import type { IssueAttachment, CanvasViewState } from "@/features/issues/types";
import type { AnnotationSaveStatus } from "@/features/annotations/types";
import { CanvasStateIndicator } from "./canvas-state-indicator";
import { InfiniteCanvasBackground } from "./infinite-canvas-background";
import { ZoomControls } from "./zoom-controls";
import { useElasticScroll } from "../hooks/use-elastic-scroll";
import { cn } from "@/lib/utils";

interface CenteredCanvasViewProps {
  attachment?: IssueAttachment;
  canvasState: CanvasViewState;
  onCanvasStateChange: (updates: Partial<CanvasViewState>) => void;
  overlayContent?: ReactNode;
  overlayRef?: RefObject<HTMLDivElement | null>;
  interactionLayerRef?: RefObject<HTMLDivElement | null>;
  pointerPanEnabled?: boolean;
  scrollPanEnabled?: boolean;
  saveStatus?: AnnotationSaveStatus;
  saveError?: string;
  /** Enable iOS-style elastic overscroll */
  elasticScrollEnabled?: boolean;
}

// Minimum zoom levels
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// Spring animation config for bounce-back
const SPRING_CONFIG = {
  stiffness: 300,
  damping: 30,
  mass: 1,
};

// Helper to clamp zoom
const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches 
  : false;

export function CenteredCanvasView({
  attachment,
  canvasState,
  onCanvasStateChange,
  overlayContent,
  overlayRef,
  interactionLayerRef,
  pointerPanEnabled = true,
  scrollPanEnabled = true,
  saveStatus,
  saveError,
  elasticScrollEnabled = true,
}: CenteredCanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fallbackOverlayRef = useRef<HTMLDivElement | null>(null);
  const resolvedOverlayRef = overlayRef ?? fallbackOverlayRef;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Motion values for smooth animation (separate from React state to avoid re-renders)
  const visualPanX = useMotionValue(canvasState.panX);
  const visualPanY = useMotionValue(canvasState.panY);

  // Track raw pan during drag (before rubber band is applied)
  const rawPanRef = useRef({ x: canvasState.panX, y: canvasState.panY });

  // Update container size on mount and resize
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  if (!attachment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No attachment selected</p>
          <p className="text-sm">Select an attachment to view</p>
        </div>
      </div>
    );
  }

  // Video playback - delegate to VideoPlayer (no pan/zoom for video)
  const isVideo = attachment.fileType.startsWith('video/');

  // Calculate display size based on fit mode and zoom
  const calculateDisplaySize = useCallback(() => {
    if (!containerRef.current || !imageLoaded || imageDimensions.width === 0) {
      return { width: 0, height: 0, scale: 1 };
    }

    const containerWidth = containerSize.width || containerRef.current.getBoundingClientRect().width;
    const containerHeight = containerSize.height || containerRef.current.getBoundingClientRect().height;
    
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let scale = 1;

    if (canvasState.fitMode === 'fit') {
      if (imageAspectRatio > containerAspectRatio) {
        scale = containerWidth / imageDimensions.width;
      } else {
        scale = containerHeight / imageDimensions.height;
      }
      scale *= canvasState.zoom;
    } else if (canvasState.fitMode === 'fill') {
      if (imageAspectRatio > containerAspectRatio) {
        scale = containerHeight / imageDimensions.height;
      } else {
        scale = containerWidth / imageDimensions.width;
      }
      scale *= canvasState.zoom;
    } else {
      // Actual size
      scale = canvasState.zoom;
    }

    return {
      width: imageDimensions.width * scale,
      height: imageDimensions.height * scale,
      scale,
    };
  }, [imageDimensions, canvasState.fitMode, canvasState.zoom, imageLoaded, containerSize]);

  const displaySize = calculateDisplaySize();

  // Calculate the zoom level that would fit the image to the container
  const calculateFitZoom = useCallback(() => {
    if (!containerRef.current || !imageLoaded || imageDimensions.width === 0) {
      return 1;
    }

    const containerWidth = containerSize.width || containerRef.current.getBoundingClientRect().width;
    const containerHeight = containerSize.height || containerRef.current.getBoundingClientRect().height;
    
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;

    // Fit mode: scale to fit within container
    if (imageAspectRatio > containerAspectRatio) {
      return containerWidth / imageDimensions.width;
    } else {
      return containerHeight / imageDimensions.height;
    }
  }, [imageDimensions, imageLoaded, containerSize]);

  const fitZoom = calculateFitZoom();

  // Compute button disabled states
  const isActualSize = Math.abs(canvasState.zoom - 1) < 0.001;
  const isFitted = canvasState.panX === 0 && 
                   canvasState.panY === 0 && 
                   Math.abs(canvasState.zoom - fitZoom) < 0.001;

  // Elastic scroll hook
  const { applyRubberBand, isOverscrolled, getClampedPosition } = useElasticScroll({
    containerSize,
    contentSize: { width: displaySize.width, height: displaySize.height },
    enabled: elasticScrollEnabled && pointerPanEnabled && displaySize.width > 0,
  });

  // Sync motion values with canvas state when not dragging
  useEffect(() => {
    if (!isDragging) {
      visualPanX.set(canvasState.panX);
      visualPanY.set(canvasState.panY);
      rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
    }
  }, [canvasState.panX, canvasState.panY, isDragging, visualPanX, visualPanY]);

  // Handle image load
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // ============================================================================
  // EVENT HANDLERS - Unified pan/zoom at container level
  // ============================================================================

  // Mouse wheel zoom with zoom-to-cursor
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!containerRef.current) return;

      // Ctrl/Cmd + scroll = zoom
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        
        const rect = containerRef.current.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = clampZoom(canvasState.zoom * zoomFactor);
        const scaleDiff = newZoom / canvasState.zoom;

        // Calculate the point on the canvas that's under the cursor
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const pointX = cursorX - centerX - canvasState.panX;
        const pointY = cursorY - centerY - canvasState.panY;
        
        // Adjust pan to keep that point stationary
        const newPanX = canvasState.panX - pointX * (scaleDiff - 1);
        const newPanY = canvasState.panY - pointY * (scaleDiff - 1);

        onCanvasStateChange({
          zoom: newZoom,
          panX: newPanX,
          panY: newPanY,
        });
        return;
      }

      // Normal scroll = pan
      if (!scrollPanEnabled) return;

      event.preventDefault();
      const deltaModeFactor = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      const deltaX = event.shiftKey ? event.deltaY : event.deltaX;
      const deltaY = event.shiftKey ? 0 : event.deltaY;
      
      const newPanX = canvasState.panX - deltaX * deltaModeFactor;
      const newPanY = canvasState.panY - deltaY * deltaModeFactor;

      // For scroll panning, clamp immediately (no rubber band)
      if (elasticScrollEnabled) {
        const clamped = getClampedPosition(newPanX, newPanY);
        onCanvasStateChange({ panX: clamped.x, panY: clamped.y });
      } else {
        onCanvasStateChange({ panX: newPanX, panY: newPanY });
      }
    },
    [canvasState, scrollPanEnabled, elasticScrollEnabled, onCanvasStateChange, getClampedPosition]
  );

  // Mouse drag pan
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!pointerPanEnabled) return;
      if (event.button !== 0) return;
      
      setIsDragging(true);
      rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
      setDragStart({
        x: event.clientX - canvasState.panX,
        y: event.clientY - canvasState.panY,
      });
      event.preventDefault();
    },
    [pointerPanEnabled, canvasState.panX, canvasState.panY]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging) return;
      
      const rawX = event.clientX - dragStart.x;
      const rawY = event.clientY - dragStart.y;
      
      // Store raw position for spring-back calculation
      rawPanRef.current = { x: rawX, y: rawY };

      if (elasticScrollEnabled) {
        // Apply rubber band effect for visual position
        const visual = applyRubberBand(rawX, rawY);
        visualPanX.set(visual.x);
        visualPanY.set(visual.y);
      } else {
        // No elastic scroll - direct pan
        visualPanX.set(rawX);
        visualPanY.set(rawY);
        onCanvasStateChange({ panX: rawX, panY: rawY });
      }
    },
    [isDragging, dragStart, elasticScrollEnabled, applyRubberBand, visualPanX, visualPanY, onCanvasStateChange]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (elasticScrollEnabled && isOverscrolled(rawPanRef.current.x, rawPanRef.current.y)) {
      // Spring back to valid bounds
      const clamped = getClampedPosition(rawPanRef.current.x, rawPanRef.current.y);
      
      if (prefersReducedMotion) {
        // Instant snap for reduced motion preference
        visualPanX.set(clamped.x);
        visualPanY.set(clamped.y);
        onCanvasStateChange({ panX: clamped.x, panY: clamped.y });
      } else {
        // Spring animation
        animate(visualPanX, clamped.x, {
          ...SPRING_CONFIG,
          onComplete: () => onCanvasStateChange({ panX: clamped.x, panY: clamped.y }),
        });
        animate(visualPanY, clamped.y, SPRING_CONFIG);
      }
    } else {
      // Within bounds - just update state
      onCanvasStateChange({ panX: rawPanRef.current.x, panY: rawPanRef.current.y });
    }
  }, [isDragging, elasticScrollEnabled, isOverscrolled, getClampedPosition, visualPanX, visualPanY, onCanvasStateChange]);

  // Touch events for mobile
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!pointerPanEnabled) return;
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        setIsDragging(true);
        rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
        setDragStart({
          x: touch.clientX - canvasState.panX,
          y: touch.clientY - canvasState.panY,
        });
        event.preventDefault();
      }
    },
    [pointerPanEnabled, canvasState.panX, canvasState.panY]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!isDragging || event.touches.length !== 1) return;
      
      const touch = event.touches[0];
      const rawX = touch.clientX - dragStart.x;
      const rawY = touch.clientY - dragStart.y;
      
      rawPanRef.current = { x: rawX, y: rawY };

      if (elasticScrollEnabled) {
        const visual = applyRubberBand(rawX, rawY);
        visualPanX.set(visual.x);
        visualPanY.set(visual.y);
      } else {
        visualPanX.set(rawX);
        visualPanY.set(rawY);
        onCanvasStateChange({ panX: rawX, panY: rawY });
      }
      
      event.preventDefault();
    },
    [isDragging, dragStart, elasticScrollEnabled, applyRubberBand, visualPanX, visualPanY, onCanvasStateChange]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (elasticScrollEnabled && isOverscrolled(rawPanRef.current.x, rawPanRef.current.y)) {
      const clamped = getClampedPosition(rawPanRef.current.x, rawPanRef.current.y);
      
      if (prefersReducedMotion) {
        visualPanX.set(clamped.x);
        visualPanY.set(clamped.y);
        onCanvasStateChange({ panX: clamped.x, panY: clamped.y });
      } else {
        animate(visualPanX, clamped.x, {
          ...SPRING_CONFIG,
          onComplete: () => onCanvasStateChange({ panX: clamped.x, panY: clamped.y }),
        });
        animate(visualPanY, clamped.y, SPRING_CONFIG);
      }
    } else {
      onCanvasStateChange({ panX: rawPanRef.current.x, panY: rawPanRef.current.y });
    }
  }, [isDragging, elasticScrollEnabled, isOverscrolled, getClampedPosition, visualPanX, visualPanY, onCanvasStateChange]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Reset pan when fit mode changes
  useEffect(() => {
    if (canvasState.fitMode === 'fit' || canvasState.fitMode === 'fill') {
      onCanvasStateChange({ panX: 0, panY: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasState.fitMode]);

  // ============================================================================
  // ZOOM CONTROL HANDLERS
  // ============================================================================

  const handleZoomChange = (zoom: number) => {
    onCanvasStateChange({ zoom });
  };

  const handlePanChange = (panOffset: { x: number; y: number }) => {
    onCanvasStateChange({ panX: panOffset.x, panY: panOffset.y });
  };

  const handleFitModeChange = (fitMode: CanvasViewState['fitMode']) => {
    onCanvasStateChange({ fitMode });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground max-w-md">
          <p className="text-lg font-medium">Failed to load image</p>
          <p className="text-sm mb-2">{attachment.fileName}</p>
          <div className="text-xs bg-muted p-3 rounded-md text-left">
            <p><strong>URL:</strong> {attachment.url}</p>
            <p className="mt-1"><strong>Possible causes:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>File doesn't exist on disk</li>
              <li>Incorrect file path</li>
              <li>Permission issues</li>
              <li>Network error</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // For video, render without pan/zoom
  if (isVideo) {
    return (
      <div className="relative h-full w-full flex flex-col select-none">
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          <video
            src={attachment.url}
            controls
            className="max-h-full max-w-full"
          >
            <track kind="captions" srcLang="en" label="English" />
          </video>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col select-none">
      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Interaction layer container */}
        <div
          ref={(el) => {
            // Merge refs
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (interactionLayerRef) {
              (interactionLayerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }
          }}
          className={cn(
            "absolute inset-0",
            pointerPanEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* INFINITE CANVAS BACKGROUND - Uses motion values for real-time animation */}
          <InfiniteCanvasBackground
            panX={visualPanX}
            panY={visualPanY}
            zoom={canvasState.zoom}
          />

          {/* TRANSFORM LAYER - Uses motion values for smooth animation */}
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center will-change-transform"
            style={{
              x: visualPanX,
              y: visualPanY,
            }}
          >
            {/* Image + Overlay Container */}
            <div
              className="relative"
              style={{
                width: displaySize.width,
                height: displaySize.height,
              }}
            >
              {/* Loading state */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-muted-foreground">Loading image...</div>
                </div>
              )}

              {/* Image */}
              <img
                ref={imageRef}
                src={attachment.url}
                alt={attachment.fileName}
                className={cn(
                  "max-w-none transition-opacity duration-200",
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                style={{
                  width: displaySize.width,
                  height: displaySize.height,
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                draggable={false}
              />

              {/* Overlay (Annotations) */}
              {overlayContent && (
                <div ref={resolvedOverlayRef} className="absolute inset-0">
                  {overlayContent}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Zoom controls overlay */}
        {attachment.fileType.startsWith('image/') && (
          <div className="absolute top-4 right-4 z-20">
            <ZoomControls
              zoomLevel={canvasState.zoom}
              isFitted={isFitted}
              isActualSize={isActualSize}
              onRecenterView={() => handlePanChange({ x: 0, y: 0 })}
              onZoomIn={() => handleZoomChange(clampZoom(canvasState.zoom * 1.5))}
              onZoomOut={() => handleZoomChange(clampZoom(canvasState.zoom / 1.5))}
              onFitToCanvas={() => {
                handleZoomChange(fitZoom);
                handlePanChange({ x: 0, y: 0 });
              }}
              onActualSize={() => {
                handleZoomChange(1);
              }}
            />
          </div>
        )}
      </div>

      {/* State indicator */}
      {attachment.fileType.startsWith('image/') && overlayContent && (
        <CanvasStateIndicator
          pointerPanEnabled={pointerPanEnabled}
          saveStatus={saveStatus}
          saveError={saveError}
        />
      )}
    </div>
  );
}
