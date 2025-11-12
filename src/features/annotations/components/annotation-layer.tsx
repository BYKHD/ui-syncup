'use client';

import type { RefObject } from 'react';
import type { AttachmentAnnotation, AnnotationPosition, AnnotationShape } from '../types';
import { AnnotationPin } from './annotation-pin';
import { AnnotationBox, type BoxAnnotation } from './annotation-box';

export interface AnnotationLayerProps<A extends AttachmentAnnotation = AttachmentAnnotation> {
  annotations: A[];
  overlayRef: RefObject<HTMLDivElement | null>;
  activeAnnotationId?: string | null;
  interactive?: boolean;
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
  onBoxMove?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
}

// Extended annotation type that includes shape data
export interface ShapedAnnotation extends AttachmentAnnotation {
  shape?: AnnotationShape;
}

export function AnnotationLayer<A extends AttachmentAnnotation>({
  annotations,
  overlayRef,
  activeAnnotationId = null,
  interactive = true,
  onSelect,
  onMove,
  onBoxMove,
}: AnnotationLayerProps<A>) {
  if (!annotations.length) {
    return null;
  }

  return (
    <div className="relative h-full w-full pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto">
        {annotations.map((annotation) => {
          const shapedAnnotation = annotation as ShapedAnnotation;

          // If annotation has shape metadata, render based on shape type
          if (shapedAnnotation.shape) {
            const { shape } = shapedAnnotation;

            if (shape.type === 'box') {
              const boxAnnotation: BoxAnnotation = {
                id: annotation.id,
                label: annotation.label,
                start: shape.start,
                end: shape.end,
              };

              return (
                <AnnotationBox
                  key={annotation.id}
                  annotation={boxAnnotation}
                  overlayRef={overlayRef}
                  isActive={annotation.id === activeAnnotationId}
                  interactive={interactive}
                  onSelect={onSelect}
                  onMove={onBoxMove}
                />
              );
            }

            if (shape.type === 'pin') {
              return (
                <AnnotationPin
                  key={annotation.id}
                  annotation={annotation}
                  overlayRef={overlayRef}
                  isActive={annotation.id === activeAnnotationId}
                  interactive={interactive}
                  onSelect={onSelect}
                  onMove={onMove}
                />
              );
            }

            // TODO: Add arrow rendering when needed
            return null;
          }

          // Default: render as pin using x, y coordinates
          return (
            <AnnotationPin
              key={annotation.id}
              annotation={annotation}
              overlayRef={overlayRef}
              isActive={annotation.id === activeAnnotationId}
              interactive={interactive}
              onSelect={onSelect}
              onMove={onMove}
            />
          );
        })}
      </div>
    </div>
  );
}
