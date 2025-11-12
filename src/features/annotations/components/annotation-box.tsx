'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import { useState, useCallback } from 'react';
import type { AnnotationPosition } from '../types';
import { cn } from '@/lib/utils';

export interface BoxAnnotation {
  id: string;
  label: string;
  start: AnnotationPosition;
  end: AnnotationPosition;
  status?: 'open' | 'in_review' | 'resolved';
}

export interface AnnotationBoxProps {
  annotation: BoxAnnotation;
  overlayRef: RefObject<HTMLDivElement | null>;
  isActive?: boolean;
  interactive?: boolean;
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
}

type DragHandle = 'box' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function AnnotationBox({
  annotation,
  overlayRef,
  isActive = false,
  interactive = true,
  onSelect,
  onMove,
}: AnnotationBoxProps) {
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);

  const x1 = Math.min(annotation.start.x, annotation.end.x);
  const y1 = Math.min(annotation.start.y, annotation.end.y);
  const x2 = Math.max(annotation.start.x, annotation.end.x);
  const y2 = Math.max(annotation.start.y, annotation.end.y);

  const width = Math.abs((x2 - x1) * 100);
  const height = Math.abs((y2 - y1) * 100);

  const statusColors = {
    open: 'border-blue-500',
    in_review: 'border-amber-500',
    resolved: 'border-green-500',
  };

  const getColorClass = () => {
    if (!annotation.status) return 'border-primary';
    return statusColors[annotation.status];
  };

  const calculateNewPosition = useCallback(
    (event: PointerEvent, handle: DragHandle): { start: AnnotationPosition; end: AnnotationPosition } | null => {
      const overlay = overlayRef.current;
      if (!overlay) return null;

      const rect = overlay.getBoundingClientRect();
      const clientX = (event.clientX - rect.left) / rect.width;
      const clientY = (event.clientY - rect.top) / rect.height;

      // Allow coordinates outside the image bounds (no clamping)
      let newStart = { ...annotation.start };
      let newEnd = { ...annotation.end };

      switch (handle) {
        case 'box':
          // Move entire box
          const dx = clientX - (x1 + width / 200);
          const dy = clientY - (y1 + height / 200);
          newStart = { x: annotation.start.x + dx, y: annotation.start.y + dy };
          newEnd = { x: annotation.end.x + dx, y: annotation.end.y + dy };
          break;
        case 'top-left':
          newStart = { x: clientX, y: clientY };
          newEnd = annotation.end;
          break;
        case 'top-right':
          newStart = { x: annotation.start.x, y: clientY };
          newEnd = { x: clientX, y: annotation.end.y };
          break;
        case 'bottom-left':
          newStart = { x: clientX, y: annotation.start.y };
          newEnd = { x: annotation.end.x, y: clientY };
          break;
        case 'bottom-right':
          newStart = annotation.start;
          newEnd = { x: clientX, y: clientY };
          break;
      }

      return { start: newStart, end: newEnd };
    },
    [annotation, overlayRef, x1, y1, width, height],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>, handle: DragHandle) => {
      if (!interactive) return;
      event.stopPropagation();
      event.preventDefault();
      onSelect?.(annotation.id);
      setActiveHandle(handle);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [interactive, onSelect, annotation.id],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!interactive || !activeHandle) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      event.preventDefault();
      const newPosition = calculateNewPosition(event, activeHandle);
      if (newPosition && onMove) {
        onMove(annotation.id, newPosition.start, newPosition.end);
      }
    },
    [interactive, activeHandle, calculateNewPosition, onMove, annotation.id],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setActiveHandle(null);
    },
    [interactive],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="annotation-box-container absolute"
      style={{
        left: `${x1 * 100}%`,
        top: `${y1 * 100}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      data-annotation-box="true"
      data-annotation-id={annotation.id}
    >
      {/* Box Border */}
      <div
        className={cn(
          'absolute inset-0 border-2 transition-colors',
          isActive ? getColorClass() : 'border-muted-foreground/50',
          interactive && 'cursor-move hover:border-primary/80',
        )}
        onPointerDown={(e) => handlePointerDown(e, 'box')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          backgroundColor: isActive ? 'rgba(var(--primary-rgb, 0, 0, 0), 0.05)' : 'transparent',
        }}
      />

      {/* Label Badge */}
      <motion.div
        className={cn(
          'absolute -top-8 left-0 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur',
          isActive
            ? `${getColorClass()} bg-primary text-primary-foreground`
            : 'border-border bg-background/90 text-foreground',
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {annotation.label}
      </motion.div>

      {/* Resize Handles - Only shown when active and interactive */}
      {isActive && interactive && (
        <>
          {/* Top-Left */}
          <div
            className={cn(
              'absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 bg-background shadow-sm transition-all',
              getColorClass(),
              'cursor-nwse-resize hover:scale-125',
            )}
            onPointerDown={(e) => handlePointerDown(e, 'top-left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Top-Right */}
          <div
            className={cn(
              'absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 bg-background shadow-sm transition-all',
              getColorClass(),
              'cursor-nesw-resize hover:scale-125',
            )}
            onPointerDown={(e) => handlePointerDown(e, 'top-right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Bottom-Left */}
          <div
            className={cn(
              'absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 bg-background shadow-sm transition-all',
              getColorClass(),
              'cursor-nesw-resize hover:scale-125',
            )}
            onPointerDown={(e) => handlePointerDown(e, 'bottom-left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Bottom-Right */}
          <div
            className={cn(
              'absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 bg-background shadow-sm transition-all',
              getColorClass(),
              'cursor-nwse-resize hover:scale-125',
            )}
            onPointerDown={(e) => handlePointerDown(e, 'bottom-right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </>
      )}
    </motion.div>
  );
}
