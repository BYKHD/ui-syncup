'use client';

import type { RefObject } from 'react';
import type { AttachmentAnnotation, AnnotationPosition } from '../types';
import { AnnotationPin } from './annotation-pin';

export interface AnnotationLayerProps<A extends AttachmentAnnotation = AttachmentAnnotation> {
  annotations: A[];
  overlayRef: RefObject<HTMLDivElement | null>;
  activeAnnotationId?: string | null;
  interactive?: boolean;
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
}

export function AnnotationLayer<A extends AttachmentAnnotation>({
  annotations,
  overlayRef,
  activeAnnotationId = null,
  interactive = true,
  onSelect,
  onMove,
}: AnnotationLayerProps<A>) {
  if (!annotations.length) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      {annotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
          overlayRef={overlayRef}
          isActive={annotation.id === activeAnnotationId}
          interactive={interactive}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
