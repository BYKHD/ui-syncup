'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import { useRef, useState } from 'react';
import type { AttachmentAnnotation, AnnotationPosition } from '../types';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/use-long-press';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnnotationContextMenu } from './annotation-context-menu';
import { AnnotationActionSheet } from './annotation-action-sheet';

const PIN_DRAG_THRESHOLD_PX = 4;

const getAnnotationPinClassName = ({
  isActive,
  interactive,
}: {
  isActive: boolean;
  interactive: boolean;
}) =>
  cn(
    'group absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    isActive ? 'border-annotation-bold bg-annotation-bold text-annotation-foreground' : 'border-2 border-white bg-annotation text-annotation-foreground',
    interactive ? 'cursor-move' : 'cursor-pointer',
  );

export interface AnnotationPinProps<A extends AttachmentAnnotation = AttachmentAnnotation> {
  annotation: A;
  overlayRef: RefObject<HTMLDivElement | null>;
  isActive?: boolean;
  interactive?: boolean;
  handToolActive?: boolean; // Disable context menu when hand tool is active
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
  onMoveComplete?: (annotationId: string, position: AnnotationPosition) => void;
  onEdit?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
}

export function AnnotationPin<A extends AttachmentAnnotation>({
  annotation,
  overlayRef,
  isActive = false,
  interactive = true,
  handToolActive = false,
  onSelect,
  onMove,
  onMoveComplete,
  onEdit,
  onDelete,
}: AnnotationPinProps<A>) {
  const isMobile = useIsMobile();
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const lastPositionRef = useRef<AnnotationPosition | null>(null);

  // Context menu state (desktop)
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Action sheet state (mobile)
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  // Long press handler (mobile) - declared early to be used in pointer handlers
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      // Only trigger on mobile in interactive mode and when not using hand tool
      if (!isMobile || !interactive || handToolActive || !onEdit || !onDelete) return;

      // Select annotation
      onSelect?.(annotation.id);

      // Show action sheet
      setActionSheetOpen(true);
    },
    threshold: 500,
    moveThreshold: 10,
    enabled: isMobile && interactive && !handToolActive && !!onEdit && !!onDelete,
  });

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    // Call long-press handler on mobile
    if (isMobile && longPressHandlers.onPointerDown) {
      longPressHandlers.onPointerDown(event as any);
    }

    // Always allow selection, even in non-interactive (view) mode
    onSelect?.(annotation.id);

    // Only enable dragging in interactive (edit) mode
    if (!interactive) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    isDraggingRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    // Call long-press handler on mobile
    if (isMobile && longPressHandlers.onPointerMove) {
      longPressHandlers.onPointerMove(event as any);
    }

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
    // Call long-press handler on mobile
    if (isMobile && longPressHandlers.onPointerUp) {
      longPressHandlers.onPointerUp(event as any);
    }

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

  // Context menu handler (desktop right-click)
  const handleContextMenu = (event: React.MouseEvent) => {
    // Only show context menu in interactive mode and when not using hand tool
    if (!interactive || handToolActive || !onEdit || !onDelete) return;

    event.preventDefault();
    event.stopPropagation();

    // Select annotation
    onSelect?.(annotation.id);

    // Show context menu at cursor position
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuOpen(true);
  };

  // Edit handler
  const handleEdit = () => {
    if (onEdit) {
      onEdit(annotation.id);
    }
  };

  // Delete handler
  const handleDelete = () => {
    if (onDelete) {
      onDelete(annotation.id);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        className={getAnnotationPinClassName({ isActive, interactive })}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          left: `${annotation.x * 100}%`,
          top: `${annotation.y * 100}%`,
        }}
        aria-label={`Annotation ${annotation.label}`}
        data-annotation-pin="true"
      >
        {annotation.label}
      </motion.button>

      {/* Desktop context menu */}
      {!isMobile && (
        <AnnotationContextMenu
          open={contextMenuOpen}
          onOpenChange={setContextMenuOpen}
          position={contextMenuPosition}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Mobile action sheet */}
      {isMobile && (
        <AnnotationActionSheet
          open={actionSheetOpen}
          onOpenChange={setActionSheetOpen}
          annotationLabel={annotation.label}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
