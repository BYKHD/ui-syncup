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
  handToolActive?: boolean;
  savingAnnotationIds?: Set<string>; // IDs of annotations currently being saved
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
  onBoxMove?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onMoveComplete?: (annotationId: string, position: AnnotationPosition) => void;
  onBoxMoveComplete?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onDragStart?: (annotationId: string) => void;
  onDragEnd?: (annotationId: string) => void;
  onEdit?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
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
  handToolActive = false,
  savingAnnotationIds,
  onSelect,
  onMove,
  onBoxMove,
  onMoveComplete,
  onBoxMoveComplete,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
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
                  handToolActive={handToolActive}
                  isSaving={savingAnnotationIds?.has(annotation.id)}
                  onSelect={onSelect}
                  onMove={onBoxMove}
                  onMoveComplete={onBoxMoveComplete}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onEdit={onEdit}
                  onDelete={onDelete}
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
                  handToolActive={handToolActive}
                  isSaving={savingAnnotationIds?.has(annotation.id)}
                  onSelect={onSelect}
                  onMove={onMove}
                  onMoveComplete={onMoveComplete}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onEdit={onEdit}
                  onDelete={onDelete}
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
              handToolActive={handToolActive}
              isSaving={savingAnnotationIds?.has(annotation.id)}
              onSelect={onSelect}
              onMove={onMove}
              onMoveComplete={onMoveComplete}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
