"use client";

import {
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Image from "next/image";
import { motion, useMotionValue, animate, type MotionValue } from "motion/react";
import type { IssueAttachment, CanvasViewState } from "@/features/issues/types";
import type { AnnotationSaveStatus } from "@/features/annotations/types";
import { CanvasScaleProvider } from "@/features/annotations/components/annotation-scale-context";
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
  /** Hide the built-in zoom controls (for external placement) */
  hideZoomControls?: boolean;
  /** Hide the save status indicator */
  hideStateIndicator?: boolean;
}

interface CenteredCanvasViewInnerProps {
  attachment: IssueAttachment;
  canvasState: CanvasViewState;
  onCanvasStateChange: (updates: Partial<CanvasViewState>) => void;
  overlayContent?: ReactNode;
  resolvedOverlayRef: RefObject<HTMLDivElement | null>;
  interactionLayerRef?: RefObject<HTMLDivElement | null>;
  pointerPanEnabled: boolean;
  scrollPanEnabled: boolean;
  saveStatus?: AnnotationSaveStatus;
  saveError?: string;
  elasticScrollEnabled: boolean;
  hideZoomControls: boolean;
  hideStateIndicator: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  imageRef: RefObject<HTMLImageElement | null>;
  isDragging: boolean;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  dragStart: { x: number; y: number };
  setDragStart: Dispatch<SetStateAction<{ x: number; y: number }>>;
  imageLoaded: boolean;
  setImageLoaded: Dispatch<SetStateAction<boolean>>;
  imageError: boolean;
  setImageError: Dispatch<SetStateAction<boolean>>;
  imageDimensions: { width: number; height: number };
  setImageDimensions: Dispatch<SetStateAction<{ width: number; height: number }>>;
  displayUrl: string;
  containerSize: { width: number; height: number };
  visualPanX: MotionValue<number>;
  visualPanY: MotionValue<number>;
  transientScale: MotionValue<number>;
  liveZoomRef: MutableRefObject<number>;
  rawPanRef: MutableRefObject<{ x: number; y: number }>;
}

// Minimum zoom levels
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// Smart fit constraints
const MIN_FIT_ZOOM = 0.9;  // Don't fit below 90% (keeps content readable)
const MAX_FIT_ZOOM = 1.0;  // Don't upscale beyond 100% (prevents blur)

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
  hideZoomControls = false,
  hideStateIndicator = false,
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

  // Reset image state when the URL changes (e.g. React Query refetches a fresh
  // presigned URL after a stale one caused a load failure).
  const displayUrl = attachment?.downloadUrl ?? attachment?.url;
  const prevDisplayUrlRef = useRef(displayUrl);
  if (prevDisplayUrlRef.current !== displayUrl) {
    prevDisplayUrlRef.current = displayUrl;
    if (imageError) {
      setImageError(false);
      setImageLoaded(false);
    }
  }
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Motion values for smooth animation (separate from React state to avoid re-renders)
  const visualPanX = useMotionValue(canvasState.panX);
  const visualPanY = useMotionValue(canvasState.panY);

  // Transient zoom multiplier applied to the transform layer during a single-pane
  // wheel gesture. transientScale = liveZoom / committedZoom. 1 at rest. Pins/boxes
  // counter-scale by 1/transientScale via CanvasScaleProvider so they stay constant size.
  const transientScale = useMotionValue(1);

  // Live (uncommitted) zoom during a wheel gesture; committed to canvasState on end.
  const liveZoomRef = useRef(canvasState.zoom);

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

  const resolvedDisplayUrl = displayUrl ?? attachment.url;

  return (
    <CenteredCanvasViewInner
      attachment={attachment}
      canvasState={canvasState}
      onCanvasStateChange={onCanvasStateChange}
      overlayContent={overlayContent}
      resolvedOverlayRef={resolvedOverlayRef}
      interactionLayerRef={interactionLayerRef}
      pointerPanEnabled={pointerPanEnabled}
      scrollPanEnabled={scrollPanEnabled}
      saveStatus={saveStatus}
      saveError={saveError}
      elasticScrollEnabled={elasticScrollEnabled}
      hideZoomControls={hideZoomControls}
      hideStateIndicator={hideStateIndicator}
      containerRef={containerRef}
      imageRef={imageRef}
      isDragging={isDragging}
      setIsDragging={setIsDragging}
      dragStart={dragStart}
      setDragStart={setDragStart}
      imageLoaded={imageLoaded}
      setImageLoaded={setImageLoaded}
      imageError={imageError}
      setImageError={setImageError}
      imageDimensions={imageDimensions}
      setImageDimensions={setImageDimensions}
      displayUrl={resolvedDisplayUrl}
      containerSize={containerSize}
      visualPanX={visualPanX}
      visualPanY={visualPanY}
      transientScale={transientScale}
      liveZoomRef={liveZoomRef}
      rawPanRef={rawPanRef}
    />
  );
}

function CenteredCanvasViewInner({
  attachment,
  canvasState,
  onCanvasStateChange,
  overlayContent,
  resolvedOverlayRef,
  interactionLayerRef,
  pointerPanEnabled,
  scrollPanEnabled,
  saveStatus,
  saveError,
  elasticScrollEnabled,
  hideZoomControls,
  hideStateIndicator,
  containerRef,
  imageRef,
  isDragging,
  setIsDragging,
  dragStart,
  setDragStart,
  imageLoaded,
  setImageLoaded,
  imageError,
  setImageError,
  imageDimensions,
  setImageDimensions,
  displayUrl,
  containerSize,
  visualPanX,
  visualPanY,
  transientScale,
  liveZoomRef,
  rawPanRef,
}: CenteredCanvasViewInnerProps) {
  // Video playback - delegate to VideoPlayer (no pan/zoom for video)
  const isVideo = attachment.fileType.startsWith('video/');

  // Calculate display size based on zoom.
  //
  // The `!containerRef.current` guard that used to be here was redundant — the result is
  // computed purely from imageDimensions and zoom, and the container is guaranteed
  // mounted whenever imageLoaded is true (the image lives inside it). Dropping it makes
  // this pure, so it can be a useMemo consumed during render instead of a ref read.
  const displaySize = useMemo(() => {
    if (!imageLoaded || imageDimensions.width === 0) {
      return { width: 0, height: 0, scale: 1 };
    }

    // Always use the explicit zoom level
    const scale = canvasState.zoom;

    return {
      width: imageDimensions.width * scale,
      height: imageDimensions.height * scale,
      scale,
    };
  }, [imageDimensions, canvasState.zoom, imageLoaded]);

  // Calculate the zoom level that would fit the image to the container
  const calculateFitZoom = useCallback((ignoreConstraints = false) => {
    if (!containerRef.current || !imageLoaded || imageDimensions.width === 0) {
      return 1;
    }

    const containerWidth = containerSize.width || containerRef.current.getBoundingClientRect().width;
    const containerHeight = containerSize.height || containerRef.current.getBoundingClientRect().height;
    
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;

    // Calculate natural fit zoom
    let naturalFit: number;
    if (imageAspectRatio > containerAspectRatio) {
      naturalFit = containerWidth / imageDimensions.width;
    } else {
      naturalFit = containerHeight / imageDimensions.height;
    }
    
    if (ignoreConstraints) {
      return naturalFit;
    }

    // Smart fit: clamp to readable range
    return Math.max(MIN_FIT_ZOOM, Math.min(MAX_FIT_ZOOM, naturalFit));
  }, [containerRef, imageDimensions, imageLoaded, containerSize]);

  // Compute button disabled states
  const isActualSize = canvasState.fitMode === 'actual' && Math.abs(canvasState.zoom - 1) < 0.001;
  const isFitted = canvasState.fitMode === 'fit';

  // Elastic scroll hook
  const { applyRubberBand, isOverscrolled, getClampedPosition } = useElasticScroll({
    containerSize,
    contentSize: { width: displaySize.width, height: displaySize.height },
    enabled: elasticScrollEnabled && pointerPanEnabled && displaySize.width > 0,
  });

  // Sync motion values with canvas state when not dragging
  // Uses instant set() for smooth zoom-to-cursor feel
  // (Spring animation is used separately for edge bounce-back recovery)
  useEffect(() => {
    if (!isDragging) {
      visualPanX.set(canvasState.panX);
      visualPanY.set(canvasState.panY);
      rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
    }
  }, [canvasState.panX, canvasState.panY, isDragging, visualPanX, visualPanY, rawPanRef]);

  // Mirror the interaction container onto the caller's ref.
  //
  // This used to be a merging ref callback that wrote `.current` on both refs. Writing to
  // a ref that arrived as a prop is what react-hooks/immutability rejects, so React now
  // owns `containerRef` directly (`ref={containerRef}`) and the caller's ref is mirrored
  // here instead. An effect is the sanctioned place for that write.
  //
  // Timing is safe: the only consumer (annotated-attachment-view's click-outside effect)
  // reads it inside its own useEffect, and React runs child effects before parent ones.
  useEffect(() => {
    if (!interactionLayerRef) return;
    const ref = interactionLayerRef as MutableRefObject<HTMLDivElement | null>;
    ref.current = containerRef.current;
    return () => {
      ref.current = null;
    };
  }, [interactionLayerRef, containerRef]);

  // Handle image load.
  // These MUST stay referentially stable. next/image's internal ref callback lists
  // `onError` in its useCallback deps and does `img.src = img.src` when it re-attaches
  // (a hydration workaround). An inline handler here gave it a new identity on every
  // render, forcing the browser to re-fetch the image on every keystroke in the form.
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
    setImageError(false);
  }, [setImageDimensions, setImageLoaded, setImageError]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, [setImageError, setImageLoaded]);

  // ============================================================================
  // EVENT HANDLERS - Unified pan/zoom at container level
  // ============================================================================

  // Track pinch state
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    startPan: { x: number; y: number };
    midpoint: { x: number; y: number };
  } | null>(null);

  // A pinch is tracked through state (not just the ref above) so the listener
  // effect re-runs and keeps the document touch listeners attached while two
  // fingers are down. The bug this fixes: those listeners were gated on isDragging
  // only, but a pinch sets isDragging=false, so touchmove never fired the pinch
  // branch and pinch-to-zoom silently did nothing on touchscreens.
  const [isPinching, setIsPinching] = useState(false);

  // Wheel has no native gesture-end. We debounce: ~120ms after the last ctrl/cmd
  // wheel event we COMMIT liveZoom into canvasState.zoom and reset transientScale→1.
  const wheelCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep liveZoomRef in lockstep with committed zoom whenever no wheel gesture is
  // mid-flight, so the next gesture starts from the correct base (e.g. after a
  // zoom-control button changes canvasState.zoom).
  useEffect(() => {
    if (wheelCommitTimerRef.current === null) {
      liveZoomRef.current = canvasState.zoom;
    }
  }, [canvasState.zoom, liveZoomRef]);

  // Clear any pending wheel-commit on unmount.
  useEffect(() => {
    return () => {
      if (wheelCommitTimerRef.current !== null) {
        clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
    };
  }, []);

  // Mouse wheel zoom with zoom-to-cursor
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!containerRef.current) return;

      // Ctrl/Cmd + scroll = zoom (standard for trackpad pinch or mouse+key)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const rect = containerRef.current.getBoundingClientRect();

        // Calculate cursor position relative to container
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;

        // Use continuous zoom formula: new = old * (1 - delta * sensitivity)
        const ZOOM_SENSITIVITY = 0.006;
        const delta = event.deltaY; // Positive = scroll down = zoom out

        // Clamp delta impact to max 20% change per event to prevent disorientation
        const rawFactor = Math.exp(-delta * ZOOM_SENSITIVITY);
        const clampedFactor = Math.max(0.8, Math.min(1.2, rawFactor));

        // Compare mode (linked panes share canvasState; signalled by hideZoomControls)
        // keeps the ORIGINAL per-event commit so both panes zoom in lockstep. Single-pane
        // uses the smooth GPU path: integrate against the live (uncommitted) zoom/pan and
        // commit on gesture end. The pan/zoom math is identical in both; only the source
        // of prev-state and the destination (state vs motion values) differ.
        const smoothZoom = !hideZoomControls;
        const prevZoom = smoothZoom ? liveZoomRef.current : canvasState.zoom;
        const prevPanX = smoothZoom ? visualPanX.get() : canvasState.panX;
        const prevPanY = smoothZoom ? visualPanY.get() : canvasState.panY;

        const newZoom = clampZoom(prevZoom * clampedFactor);
        const scaleDiff = newZoom / prevZoom;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Vector from center of screen to cursor
        const vectorX = cursorX - centerX;
        const vectorY = cursorY - centerY;

        // pan correction = (cursor relative to content) * (1 - scaleDiff)
        const contentX = vectorX - prevPanX;
        const contentY = vectorY - prevPanY;

        const newPanX = prevPanX + contentX * (1 - scaleDiff);
        const newPanY = prevPanY + contentY * (1 - scaleDiff);

        if (!smoothZoom) {
          // Compare/embedded: original behavior — commit every event (keeps panes in sync).
          onCanvasStateChange({ zoom: newZoom, panX: newPanX, panY: newPanY, fitMode: 'free' });
          return;
        }

        // GPU PATH: move the transient multiplier + pan on the compositor (no re-render).
        // transientScale = liveZoom / committedZoom; committed zoom stays frozen until commit.
        liveZoomRef.current = newZoom;
        transientScale.set(newZoom / canvasState.zoom);
        visualPanX.set(newPanX);
        visualPanY.set(newPanY);

        // Debounced commit: fold liveZoom into canvasState and reset transient→1. The
        // committed values equal exactly what the per-event math would have produced, so
        // the net on-screen transform is unchanged across the commit (image re-rasterizes
        // crisp at the new committed zoom).
        if (wheelCommitTimerRef.current !== null) {
          clearTimeout(wheelCommitTimerRef.current);
        }
        wheelCommitTimerRef.current = setTimeout(() => {
          wheelCommitTimerRef.current = null;
          const committedZoom = liveZoomRef.current;
          const committedPanX = visualPanX.get();
          const committedPanY = visualPanY.get();
          transientScale.set(1);
          onCanvasStateChange({
            zoom: committedZoom,
            panX: committedPanX,
            panY: committedPanY,
            fitMode: 'free',
          });
        }, 120);
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
        onCanvasStateChange({ panX: clamped.x, panY: clamped.y, fitMode: 'free' });
      } else {
        onCanvasStateChange({ panX: newPanX, panY: newPanY, fitMode: 'free' });
      }
    },
    [containerRef, canvasState, scrollPanEnabled, elasticScrollEnabled, onCanvasStateChange, getClampedPosition, hideZoomControls, transientScale, liveZoomRef, visualPanX, visualPanY]
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
    [pointerPanEnabled, canvasState.panX, canvasState.panY, setIsDragging, rawPanRef, setDragStart]
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
        onCanvasStateChange({ panX: rawX, panY: rawY, fitMode: 'free' });
      }
    },
    [isDragging, dragStart, elasticScrollEnabled, applyRubberBand, visualPanX, visualPanY, onCanvasStateChange, rawPanRef]
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
        onCanvasStateChange({ panX: clamped.x, panY: clamped.y, fitMode: 'free' });
      } else {
        // Spring animation
        animate(visualPanX, clamped.x, {
          ...SPRING_CONFIG,
          onComplete: () => onCanvasStateChange({ panX: clamped.x, panY: clamped.y, fitMode: 'free' }),
        });
        animate(visualPanY, clamped.y, SPRING_CONFIG);
      }
    } else {
      // Within bounds - just update state
      onCanvasStateChange({ panX: rawPanRef.current.x, panY: rawPanRef.current.y, fitMode: 'free' });
    }
  }, [isDragging, elasticScrollEnabled, isOverscrolled, getClampedPosition, visualPanX, visualPanY, onCanvasStateChange, setIsDragging, rawPanRef]);

  // Touch events for mobile (Pinch + Pan)
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!pointerPanEnabled) return;

      // Single Touch - Pan
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        setIsDragging(true);
        rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
        setDragStart({
          x: touch.clientX - canvasState.panX,
          y: touch.clientY - canvasState.panY,
        });
        // Clear pinch state
        pinchRef.current = null;
      }
      // Multi Touch - Pinch
      else if (event.touches.length === 2) {
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        
        // Calculate initial pinch distance
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        
        // Calculate midpoint (this is our zoom pivot)
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        pinchRef.current = {
          startDist: dist,
          startZoom: canvasState.zoom,
          startPan: { x: canvasState.panX, y: canvasState.panY },
          midpoint: { x: midX, y: midY },
        };
        // Seed live zoom from committed (they're in lockstep at rest) so the touchend
        // commit reads the right base even if no touchmove fires.
        liveZoomRef.current = canvasState.zoom;
        
        // A pinch is not a drag. Flip modes: isPinching keeps the document touch
        // listeners attached (see the listener effect) so the pinch branch of
        // handleTouchMove actually runs.
        setIsDragging(false);
        setIsPinching(true);
      }
    },
    [pointerPanEnabled, canvasState.panX, canvasState.panY, canvasState.zoom, setIsDragging, setIsPinching, rawPanRef, setDragStart, liveZoomRef]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault(); // Prevent browser scroll/zoom

      // Handle Pinch
      if (event.touches.length === 2 && pinchRef.current) {
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        
        // Calculate ratio
        // Avoid division by zero
        if (pinchRef.current.startDist < 0.1) return;
        
        const scale = dist / pinchRef.current.startDist;
        const newZoom = clampZoom(pinchRef.current.startZoom * scale);
        
        // Calculate scale difference relative to currently displayed zoom
        // Note: We use startZoom as base to avoid drift
        const scaleDiff = newZoom / pinchRef.current.startZoom;
        
        // Pivot logic: Keep the midpoint stationary relative to the image
        // midpoint relative to container
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Vector from center of screen to touch midpoint
        const vectorX = pinchRef.current.midpoint.x - rect.left - centerX;
        const vectorY = pinchRef.current.midpoint.y - rect.top - centerY;
        
        // Original content position under midpoint at start
        const contentX = vectorX - pinchRef.current.startPan.x;
        const contentY = vectorY - pinchRef.current.startPan.y;
        
        // New Pan = Vector - PointScaled
        // newPan = vectorX - (contentX * scaleDiff)
        // Wait, scaleDiff here is relative to START zoom.
        // newPos = startPos * scale
        
        const newPanX = vectorX - contentX * scaleDiff;
        const newPanY = vectorY - contentY * scaleDiff;
        
        // Compare mode (linked panes, signalled by hideZoomControls) keeps the
        // ORIGINAL per-event commit so both panes pinch in lockstep. Single-pane uses
        // the smooth GPU path that mirrors handleWheel: drive the transient scale + pan
        // on the compositor (no re-render) and commit on touchend. transientScale is
        // liveZoom / committedZoom; committed zoom is frozen at startZoom during the
        // gesture, so it equals scaleDiff (newZoom / startZoom) computed above.
        if (hideZoomControls) {
          visualPanX.set(newPanX);
          visualPanY.set(newPanY);
          onCanvasStateChange({ zoom: newZoom, panX: newPanX, panY: newPanY, fitMode: 'free' });
        } else {
          liveZoomRef.current = newZoom;
          transientScale.set(scaleDiff);
          visualPanX.set(newPanX);
          visualPanY.set(newPanY);
        }
        return;
      }

      // Handle Pan
      if (isDragging && event.touches.length === 1) {
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
          onCanvasStateChange({ panX: rawX, panY: rawY, fitMode: 'free' });
        }
      }
    },
    [containerRef, isDragging, dragStart, elasticScrollEnabled, applyRubberBand, visualPanX, visualPanY, onCanvasStateChange, rawPanRef, hideZoomControls, transientScale, liveZoomRef]
  );

  const handleTouchEnd = useCallback(() => {
    // End of a pinch gesture.
    if (pinchRef.current) {
      const { startZoom } = pinchRef.current;
      pinchRef.current = null;
      setIsPinching(false);
      // Single-pane: commit the transient zoom now (compare mode already committed
      // per-event). Skip a no-op 2-finger tap that never changed zoom. Folding liveZoom
      // into canvasState.zoom and resetting transientScale to 1 is net-zero on screen —
      // the image just re-rasterizes crisp at the new zoom.
      if (!hideZoomControls && liveZoomRef.current !== startZoom) {
        transientScale.set(1);
        onCanvasStateChange({
          zoom: liveZoomRef.current,
          panX: visualPanX.get(),
          panY: visualPanY.get(),
          fitMode: 'free',
        });
      }
      return;
    }

    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (elasticScrollEnabled && isOverscrolled(rawPanRef.current.x, rawPanRef.current.y)) {
      const clamped = getClampedPosition(rawPanRef.current.x, rawPanRef.current.y);
      
      if (prefersReducedMotion) {
        visualPanX.set(clamped.x);
        visualPanY.set(clamped.y);
        onCanvasStateChange({ panX: clamped.x, panY: clamped.y, fitMode: 'free' });
      } else {
        animate(visualPanX, clamped.x, {
          ...SPRING_CONFIG,
          onComplete: () => onCanvasStateChange({ panX: clamped.x, panY: clamped.y, fitMode: 'free' }),
        });
        animate(visualPanY, clamped.y, SPRING_CONFIG);
      }
    } else {
      onCanvasStateChange({ panX: rawPanRef.current.x, panY: rawPanRef.current.y, fitMode: 'free' });
    }
  }, [isDragging, elasticScrollEnabled, isOverscrolled, getClampedPosition, visualPanX, visualPanY, onCanvasStateChange, setIsDragging, setIsPinching, rawPanRef, hideZoomControls, transientScale, liveZoomRef]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    // Mouse drag needs document listeners only while dragging. Touch needs them while
    // dragging (1-finger pan) OR pinching (2-finger zoom); gating touch on isDragging
    // alone was the pinch-to-zoom bug — a pinch sets isDragging=false, so touchmove was
    // never attached. touchcancel commits/cleans up if the OS interrupts the gesture.
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    if (isDragging || isPinching) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, handleWheel, isDragging, isPinching, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Reset pan when fit mode changes
  useEffect(() => {
    if (canvasState.fitMode === 'fit' || canvasState.fitMode === 'fill') {
      onCanvasStateChange({ panX: 0, panY: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasState.fitMode]);

  // Handle responsive resizing when in fit mode.
  // Skipped when hideZoomControls=true (compare mode) because two panes sharing
  // canvasState would compute different fitZooms and fight each other indefinitely.
  useEffect(() => {
    if (hideZoomControls) return;
    if (canvasState.fitMode === 'fit' && containerSize.width > 0) {
      const newFitZoom = calculateFitZoom(true);
      // Only update if significantly different to avoid loops
      if (Math.abs(canvasState.zoom - newFitZoom) > 0.001) {
        onCanvasStateChange({ zoom: newFitZoom });
      }
    }
  }, [containerSize, canvasState.fitMode, calculateFitZoom, onCanvasStateChange, canvasState.zoom, hideZoomControls]);

  // ============================================================================
  // ZOOM CONTROL HANDLERS
  // ============================================================================

  const handleZoomChange = (zoom: number) => {
    onCanvasStateChange({ zoom, fitMode: 'free' });
  };

  const handlePanChange = (panOffset: { x: number; y: number }) => {
    onCanvasStateChange({ panX: panOffset.x, panY: panOffset.y, fitMode: 'free' });
  };

  const handleFitModeChange = (fitMode: CanvasViewState['fitMode']) => {
    onCanvasStateChange({ fitMode });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // displayUrl is computed above (near state declarations) so URL changes reset image state.

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground max-w-md">
          <p className="text-lg font-medium">Failed to load image</p>
          <p className="text-sm mb-2">{attachment.fileName}</p>
          <div className="text-xs bg-muted p-3 rounded-md text-left">
            <p><strong>URL:</strong> {displayUrl}</p>
            <p className="mt-1"><strong>Possible causes:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>File doesn&apos;t exist on disk</li>
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
            src={displayUrl}
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
          ref={containerRef}
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
            {/* SCALE LAYER - transient zoom multiplier (1 at rest). Scales about its own
                center, which coincides with the viewport center because the parent
                flex-centers it. Pins/boxes inside counter-scale via CanvasScaleProvider. */}
            <motion.div
              className="relative will-change-transform"
              style={{
                width: displaySize.width,
                height: displaySize.height,
                scale: transientScale,
              }}
            >
              {/* Loading state */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-muted-foreground">Loading image...</div>
                </div>
              )}

              {/* Image */}
              <Image
                ref={imageRef}
                src={displayUrl!}
                alt={attachment.fileName}
                className={cn(
                  "max-w-none transition-opacity duration-200",
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                width={displaySize.width}
                height={displaySize.height}
                style={{
                  width: displaySize.width,
                  height: displaySize.height,
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                draggable={false}
                unoptimized
              />

              {/* Overlay (Annotations) */}
              {overlayContent && (
                <div ref={resolvedOverlayRef} className="absolute inset-0">
                  <CanvasScaleProvider transientScale={transientScale}>
                    {overlayContent}
                  </CanvasScaleProvider>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Zoom controls overlay */}
        {!hideZoomControls && attachment.fileType.startsWith('image/') && (
          <div className="absolute top-4 right-4 z-20">
            <ZoomControls
              zoomLevel={canvasState.zoom}
              isFitted={isFitted}
              isActualSize={isActualSize}
              onRecenterView={() => handlePanChange({ x: 0, y: 0 })}
              onZoomIn={() => handleZoomChange(clampZoom(canvasState.zoom * 1.5))}
              onZoomOut={() => handleZoomChange(clampZoom(canvasState.zoom / 1.5))}
              onFitToCanvas={() => {
                // Fit to view: Contain the image strictly within the viewport
                handleZoomChange(calculateFitZoom(true));
                handlePanChange({ x: 0, y: 0 });
                handleFitModeChange('fit');
              }}
              onActualSize={() => {
                // Actual size: 100% zoom, pivoting around the viewport center
                const targetZoom = 1;
                const newPanX = canvasState.panX * (targetZoom / canvasState.zoom);
                const newPanY = canvasState.panY * (targetZoom / canvasState.zoom);
                
                handleFitModeChange('actual');
                handleZoomChange(targetZoom);
                handlePanChange({ x: newPanX, y: newPanY });
              }}
            />
          </div>
        )}
      </div>

      {/* State indicator */}
      {!hideStateIndicator && attachment.fileType.startsWith('image/') && overlayContent && (
        <CanvasStateIndicator
          pointerPanEnabled={pointerPanEnabled}
          saveStatus={saveStatus}
          saveError={saveError}
        />
      )}
    </div>
  );
}
