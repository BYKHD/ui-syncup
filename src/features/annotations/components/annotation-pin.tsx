'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import { useRef } from 'react';
import type { AttachmentAnnotation, AnnotationPosition } from '../types';
import { cn } from '@/lib/utils';

const PIN_DRAG_THRESHOLD_PX = 4;

export interface AnnotationPinProps<A extends AttachmentAnnotation = AttachmentAnnotation> {
  annotation: A;
  overlayRef: RefObject<HTMLDivElement | null>;
  isActive?: boolean;
  interactive?: boolean;
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
  onMoveComplete?: (annotationId: string, position: AnnotationPosition) => void;
}

export function AnnotationPin<A extends AttachmentAnnotation>({
  annotation,
  overlayRef,
  isActive = false,
  interactive = true,
  onSelect,
  onMove,
  onMoveComplete,
}: AnnotationPinProps<A>) {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const lastPositionRef = useRef<AnnotationPosition | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    // Always allow selection, even in non-interactive (view) mode
    onSelect?.(annotation.id);

    // Only enable dragging in interactive (edit) mode
    if (!interactive) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    isDraggingRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const startPoint = dragStartRef.current;
    if (!startPoint) return;
    const deltaX = event.clientX - startPoint.x;
    const deltaY = event.clientY - startPoint.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (!isDraggingRef.current) {
      if (distanceSquared < PIN_DRAG_THRESHOLD_PX * PIN_DRAG_THRESHOLD_PX) {
        return;
      }
      isDraggingRef.current = true;
    }

    event.preventDefault();
    const overlay = overlayRef.current;
    if (!overlay || !onMove) return;
    const rect = overlay.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.min(Math.max(x, 0), 1);
    const clampedY = Math.min(Math.max(y, 0), 1);
    const position = { x: clampedX, y: clampedY };

    // Store last position for drag completion callback
    lastPositionRef.current = position;
    onMove(annotation.id, position);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Notify parent when drag completes (only if actually dragged)
    if (isDraggingRef.current && lastPositionRef.current && onMoveComplete) {
      onMoveComplete(annotation.id, lastPositionRef.current);
    }

    dragStartRef.current = null;
    isDraggingRef.current = false;
    lastPositionRef.current = null;
  };

  return (
    <motion.button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        'group absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background/90 text-foreground',
        interactive ? 'cursor-move' : 'cursor-pointer',
        !interactive && 'hover:border-primary/50',
      )}
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
      aria-label={`Annotation ${annotation.label}`}
      data-annotation-pin="true"
    >
      {annotation.label}
    </motion.button>
  );
}
