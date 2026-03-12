'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { AttachmentAnnotation, AnnotationPosition, AnnotationShape, AnnotationThread, AnnotationAuthor } from '../types';
import { AnnotationPin } from './annotation-pin';
import { AnnotationBox, type BoxAnnotation } from './annotation-box';
import { AnnotationPopover } from './annotation-popover';
import { AnnotationThreadPanel } from './annotation-thread-panel';
import { useAnnotationPopover } from '../hooks/use-annotation-popover';
import { useIsMobile } from '@/hooks/use-mobile';

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
  /** Issue ID for popover comment API calls */
  issueId?: string;
  /** Attachment ID for popover comment API calls */
  attachmentId?: string;
  /** Whether to enable popover feature (disabled during edit mode) */
  enablePopover?: boolean;
}

// Extended annotation type that includes shape data
export interface ShapedAnnotation extends AttachmentAnnotation {
  shape?: AnnotationShape;
}

// Helper to get anchor position for an annotation
function getAnchorPosition(annotation: AttachmentAnnotation): { x: number; y: number } {
  const shaped = annotation as ShapedAnnotation;
  if (shaped.shape?.type === 'box') {
    // Anchor to center-top of the box label badge area
    return {
      x: shaped.shape.start.x,
      y: shaped.shape.start.y,
    };
  }
  // Default: pin position
  return { x: annotation.x, y: annotation.y };
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
  issueId,
  attachmentId,
  enablePopover = true,
}: AnnotationLayerProps<A>) {
  const isMobile = useIsMobile();
  const isDraggingRef = useRef(false);
  
  // Mobile sheet state - track which annotation's thread panel is open
  const [mobileSheetAnnotationId, setMobileSheetAnnotationId] = useState<string | null>(null);
  
  // Popover state management (desktop only)
  const popover = useAnnotationPopover({
    isDragging: isDraggingRef.current,
    hoverDelay: 200,
  });

  // Handle drag start - close popover and set dragging flag
  const handleDragStart = useCallback((annotationId: string) => {
    isDraggingRef.current = true;
    popover.close();
    setMobileSheetAnnotationId(null);
    onDragStart?.(annotationId);
  }, [popover, onDragStart]);

  // Handle drag end - reset dragging flag
  const handleDragEnd = useCallback((annotationId: string) => {
    isDraggingRef.current = false;
    onDragEnd?.(annotationId);
  }, [onDragEnd]);

  // Handle annotation selection
  const handleSelect = useCallback((annotationId: string) => {
    onSelect?.(annotationId);
    
    // On mobile, open the thread panel sheet
    if (isMobile && enablePopover && !!issueId && !!attachmentId && !isDraggingRef.current) {
      setMobileSheetAnnotationId(annotationId);
      return;
    }
    
    // On desktop, trigger popover click handler
    if (enablePopover && !isMobile && !handToolActive && !isDraggingRef.current) {
      popover.handleClick(annotationId);
    }
  }, [onSelect, enablePopover, isMobile, handToolActive, popover, issueId, attachmentId]);

  // Close mobile sheet
  const handleCloseMobileSheet = useCallback(() => {
    setMobileSheetAnnotationId(null);
  }, []);

  // Find currently open annotation (desktop popover)
  const openAnnotation = useMemo(() => {
    const currentState = popover.state;
    if (!currentState?.annotationId) return null;
    return annotations.find(a => a.id === currentState.annotationId) || null;
  }, [annotations, popover.state]);

  // Find annotation for mobile sheet
  const mobileSheetAnnotation = useMemo(() => {
    if (!mobileSheetAnnotationId) return null;
    return annotations.find(a => a.id === mobileSheetAnnotationId) || null;
  }, [annotations, mobileSheetAnnotationId]);

  if (!annotations.length) {
    return null;
  }

  // On mobile or when popover is disabled, don't use desktop popovers
  const shouldEnableDesktopPopover = enablePopover && !isMobile && !!issueId && !!attachmentId;

  return (
    <div className="relative h-full w-full pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto">
        {annotations.map((annotation) => {
          const shapedAnnotation = annotation as ShapedAnnotation;
          const isPopoverOpen = popover.isOpen(annotation.id);

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
                  isPopoverOpen={isPopoverOpen}
                  onSelect={handleSelect}
                  onMove={onBoxMove}
                  onMoveComplete={onBoxMoveComplete}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onHoverStart={popover.handleHoverStart}
                  onHoverEnd={popover.handleHoverEnd}
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
                  isPopoverOpen={isPopoverOpen}
                  onSelect={handleSelect}
                  onMove={onMove}
                  onMoveComplete={onMoveComplete}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onHoverStart={popover.handleHoverStart}
                  onHoverEnd={popover.handleHoverEnd}
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
              isPopoverOpen={isPopoverOpen}
              onSelect={handleSelect}
              onMove={onMove}
              onMoveComplete={onMoveComplete}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onEdit={onEdit}
              onDelete={onDelete}
              onHoverStart={popover.handleHoverStart}
              onHoverEnd={popover.handleHoverEnd}
            />
          );
        })}
      </div>
      
      {/* Desktop: Render popover separately, positioned absolutely */}
      {shouldEnableDesktopPopover && openAnnotation && (
        <AnnotationPopover
          annotation={openAnnotation as unknown as AnnotationThread<AnnotationAuthor>}
          issueId={issueId!}
          attachmentId={attachmentId!}
          mode={popover.state?.mode || 'preview'}
          open={true}
          anchorPosition={getAnchorPosition(openAnnotation)}
          overlayRef={overlayRef}
          onModeChange={(newMode) => {
            if (newMode === 'expanded' && openAnnotation) {
              popover.handleClick(openAnnotation.id);
            }
          }}
          onClose={popover.close}
          onMouseEnter={popover.handlePopoverMouseEnter}
          onMouseLeave={popover.handlePopoverMouseLeave}
        />
      )}

      {/* Mobile: Render thread panel sheet */}
      {isMobile && mobileSheetAnnotation && issueId && attachmentId && (
        <AnnotationThreadPanel
          annotation={mobileSheetAnnotation}
          issueId={issueId}
          attachmentId={attachmentId}
          open={true}
          onClose={handleCloseMobileSheet}
        />
      )}
    </div>
  );
}
