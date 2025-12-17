"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { CanvasViewState } from "@/features/issues/types";
import { cn } from "@/lib/utils";

interface ImageCanvasProps {
  src: string;
  alt: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  fitMode: CanvasViewState['fitMode'];
  onZoomChange: (zoomLevel: number) => void;
  onPanChange: (panOffset: { x: number; y: number }) => void;
  onImageLoad?: (dimensions: { width: number; height: number }) => void;
  overlayRef?: React.RefObject<HTMLDivElement | null>;
  overlayContent?: React.ReactNode;
  pointerPanEnabled?: boolean;
  scrollPanEnabled?: boolean;
}

export function ImageCanvas({
  src,
  alt,
  zoomLevel,
  panOffset,
  fitMode,
  onZoomChange,
  onPanChange,
  onImageLoad,
  overlayRef,
  overlayContent,
  pointerPanEnabled = true,
  scrollPanEnabled = true,
}: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fallbackOverlayRef = useRef<HTMLDivElement | null>(null);
  const resolvedOverlayRef = overlayRef ?? fallbackOverlayRef;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Calculate the display size based on fit mode and zoom
  const calculateDisplaySize = useCallback(() => {
    if (!containerRef.current || !imageLoaded || imageDimensions.width === 0) {
      return { width: 0, height: 0, scale: 1 };
    }

    const container = containerRef.current.getBoundingClientRect();
    const containerWidth = container.width;
    const containerHeight = container.height;
    
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let scale = 1;
    let displayWidth = imageDimensions.width;
    let displayHeight = imageDimensions.height;

    if (fitMode === 'fit') {
      // Fit image to container while maintaining aspect ratio
      if (imageAspectRatio > containerAspectRatio) {
        // Image is wider than container
        scale = containerWidth / imageDimensions.width;
      } else {
        // Image is taller than container
        scale = containerHeight / imageDimensions.height;
      }
      scale *= zoomLevel;
    } else if (fitMode === 'fill') {
      // Fill container, may crop image
      if (imageAspectRatio > containerAspectRatio) {
        scale = containerHeight / imageDimensions.height;
      } else {
        scale = containerWidth / imageDimensions.width;
      }
      scale *= zoomLevel;
    } else {
      // Actual size
      scale = zoomLevel;
    }

    displayWidth = imageDimensions.width * scale;
    displayHeight = imageDimensions.height * scale;

    return { width: displayWidth, height: displayHeight, scale };
  }, [imageDimensions, fitMode, zoomLevel, imageLoaded]);

  const displaySize = calculateDisplaySize();

  // Calculate pan boundaries to keep content at least partially visible
  const calculatePanBounds = useCallback(() => {
    if (!containerRef.current || !imageLoaded || displaySize.width === 0) {
      return null;
    }

    const container = containerRef.current.getBoundingClientRect();
    const minVisible = Math.min(100, displaySize.width * 0.2, displaySize.height * 0.2);

    return {
      minX: -(displaySize.width - minVisible),
      maxX: container.width - minVisible,
      minY: -(displaySize.height - minVisible),
      maxY: container.height - minVisible,
    };
  }, [displaySize, imageLoaded]);

  // Clamp pan offset to stay within boundaries
  const clampPan = useCallback(
    (offset: { x: number; y: number }) => {
      const bounds = calculatePanBounds();
      if (!bounds) return offset;

      return {
        x: Math.max(bounds.minX, Math.min(bounds.maxX, offset.x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, offset.y)),
      };
    },
    [calculatePanBounds]
  );

  // Handle image load
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
    setImageDimensions(dimensions);
    setImageLoaded(true);
    setImageError(false);
    onImageLoad?.(dimensions);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Mouse wheel zoom with zoom-to-cursor support
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        
        // Get cursor position relative to container
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        
        // Calculate new zoom level
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
        const scaleDiff = newZoom / zoomLevel;
        
        // Calculate the point on the image that's under the cursor
        // and adjust pan to keep that point stationary
        const imagePointX = cursorX - panOffset.x - rect.width / 2;
        const imagePointY = cursorY - panOffset.y - rect.height / 2;
        
        const newPanX = panOffset.x - imagePointX * (scaleDiff - 1);
        const newPanY = panOffset.y - imagePointY * (scaleDiff - 1);
        
        onZoomChange(newZoom);
        onPanChange(clampPan({ x: newPanX, y: newPanY }));
        return;
      }

      if (!scrollPanEnabled) {
        return;
      }

      event.preventDefault();
      const deltaModeFactor = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      const deltaX = event.shiftKey ? event.deltaY : event.deltaX;
      const deltaY = event.shiftKey ? 0 : event.deltaY;
      onPanChange(
        clampPan({
          x: panOffset.x - deltaX * deltaModeFactor,
          y: panOffset.y - deltaY * deltaModeFactor,
        })
      );
    },
    [onZoomChange, onPanChange, panOffset.x, panOffset.y, scrollPanEnabled, zoomLevel, clampPan],
  );

  // Mouse drag pan
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!pointerPanEnabled) return;
    if (event.button !== 0) return; // Only left mouse button
    
    setIsDragging(true);
    setDragStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    event.preventDefault();
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    const newPanOffset = clampPan({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    });
    
    onPanChange(newPanOffset);
  }, [isDragging, dragStart, onPanChange, clampPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for mobile
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!pointerPanEnabled) return;
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      event.preventDefault();
    }
  };

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isDragging || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const newPanOffset = clampPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
    
    onPanChange(newPanOffset);
    event.preventDefault();
  }, [isDragging, dragStart, onPanChange, clampPan]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

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
    if (fitMode === 'fit' || fitMode === 'fill') {
      onPanChange({ x: 0, y: 0 });
    }
  }, [fitMode]); // Remove onPanChange from dependencies to prevent potential infinite loops

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground max-w-md">
          <p className="text-lg font-medium">Failed to load image</p>
          <p className="text-sm mb-2">{alt}</p>
          <div className="text-xs bg-muted p-3 rounded-md text-left">
            <p><strong>URL:</strong> {src}</p>
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full overflow-hidden",
        pointerPanEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair",
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className="h-full w-full flex items-center justify-center"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
        }}
      >
        <div
          className="relative"
          style={{
            width: displaySize.width,
            height: displaySize.height,
          }}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-muted-foreground">Loading image...</div>
            </div>
          )}

          <img
            ref={imageRef}
            src={src}
            alt={alt}
            className={`max-w-none transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: displaySize.width,
              height: displaySize.height,
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
          />

          {overlayContent && (
            <div ref={resolvedOverlayRef} className="absolute inset-0">
              {overlayContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
