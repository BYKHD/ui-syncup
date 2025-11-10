"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { CanvasViewState } from "@/types/issue";

interface ImageCanvasProps {
  src: string;
  alt: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  fitMode: CanvasViewState['fitMode'];
  onZoomChange: (zoomLevel: number) => void;
  onPanChange: (panOffset: { x: number; y: number }) => void;
  onImageLoad?: (dimensions: { width: number; height: number }) => void;
}

export function ImageCanvas({
  src,
  alt,
  zoomLevel,
  panOffset,
  fitMode,
  onZoomChange,
  onPanChange,
  onImageLoad
}: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
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

  // Mouse wheel zoom
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * delta));
    
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);

  // Mouse drag pan
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    
    setIsDragging(true);
    setDragStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    event.preventDefault();
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    const newPanOffset = {
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    };
    
    onPanChange(newPanOffset);
  }, [isDragging, dragStart, onPanChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for mobile
  const handleTouchStart = (event: React.TouchEvent) => {
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
    const newPanOffset = {
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    };
    
    onPanChange(newPanOffset);
    event.preventDefault();
  }, [isDragging, dragStart, onPanChange]);

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
      className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className="h-full w-full flex items-center justify-center"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
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
      </div>
    </div>
  );
}