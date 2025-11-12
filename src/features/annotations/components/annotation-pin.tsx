'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import type { AttachmentAnnotation, AnnotationPosition } from '../types';
import { cn } from '@/lib/utils';

export interface AnnotationPinProps<A extends AttachmentAnnotation = AttachmentAnnotation> {
  annotation: A;
  overlayRef: RefObject<HTMLDivElement | null>;
  isActive?: boolean;
  interactive?: boolean;
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
}

export function AnnotationPin<A extends AttachmentAnnotation>({
  annotation,
  overlayRef,
  isActive = false,
  interactive = true,
  onSelect,
  onMove,
}: AnnotationPinProps<A>) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect?.(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    event.preventDefault();
    const overlay = overlayRef.current;
    if (!overlay || !onMove) return;
    const rect = overlay.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.min(Math.max(x, 0), 1);
    const clampedY = Math.min(Math.max(y, 0), 1);
    onMove(annotation.id, { x: clampedX, y: clampedY });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
        !interactive && 'opacity-80',
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
