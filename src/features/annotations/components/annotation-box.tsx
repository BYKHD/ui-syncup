'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import { useState, useCallback, useRef } from 'react';
import type { AnnotationPosition } from '../types';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/use-long-press';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnnotationContextMenu } from './annotation-context-menu';
import { AnnotationActionSheet } from './annotation-action-sheet';

const BOX_DRAG_THRESHOLD_PX = 4;

const getAnnotationBoxBorderClassName = ({
  isActive,
  interactive,
}: {
  isActive: boolean;
  interactive: boolean;
}) =>
  cn(
    'absolute inset-0  transition-colors',
    isActive ? 'border-annotation border-2' : 'border-annotation/50 border-2',
    interactive ? 'cursor-move' : 'cursor-pointer',
  );

const getAnnotationBoxLabelClassName = (isActive: boolean,interactive: boolean) =>
  cn(
    'absolute -top-4 left-2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold shadow-sm backdrop-blur',
    isActive
      ? 'border-2 border-annotation-bold bg-annotation-bold text-annotation-foreground'
      : 'border-2 border-white bg-annotation text-annotation-foreground',
    interactive ? 'cursor-move' : 'cursor-pointer',
      
  );

const getAnnotationBoxHandleClassName = (positionClasses: string, cursorClasses: string) =>
  cn(
    'absolute h-3 w-3 rounded-full border-2 border-annotation bg-background shadow-sm transition-all',
    positionClasses,
    cursorClasses,
  );

export interface BoxAnnotation {
  id: string;
  label: string;
  start: AnnotationPosition;
  end: AnnotationPosition;
}

export interface AnnotationBoxProps {
  annotation: BoxAnnotation;
  overlayRef: RefObject<HTMLDivElement | null>;
  isActive?: boolean;
  interactive?: boolean;
  handToolActive?: boolean; // Disable context menu when hand tool is active
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onMoveComplete?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onEdit?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
}

type DragHandle = 'box' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function AnnotationBox({
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
}: AnnotationBoxProps) {
  const isMobile = useIsMobile();
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const lastPositionRef = useRef<{ start: AnnotationPosition; end: AnnotationPosition } | null>(null);

  // Context menu state (desktop)
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Action sheet state (mobile)
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const x1 = Math.min(annotation.start.x, annotation.end.x);
  const y1 = Math.min(annotation.start.y, annotation.end.y);
  const x2 = Math.max(annotation.start.x, annotation.end.x);
  const y2 = Math.max(annotation.start.y, annotation.end.y);

  const width = Math.abs((x2 - x1) * 100);
  const height = Math.abs((y2 - y1) * 100);

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
      event.stopPropagation();
      event.preventDefault();

      // Always allow selection, even in non-interactive (view) mode
      onSelect?.(annotation.id);

      // Only enable dragging/resizing in interactive (edit) mode
      // Ignore right-clicks (button !== 0) to allow context menu
      if (!interactive || event.button !== 0) return;

      setActiveHandle(handle);
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      isDraggingRef.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [interactive, onSelect, annotation.id],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!interactive || !activeHandle) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      event.preventDefault();
      const startPoint = dragStartRef.current;
      if (!startPoint) return;
      const deltaX = event.clientX - startPoint.x;
      const deltaY = event.clientY - startPoint.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (!isDraggingRef.current) {
        if (distanceSquared < BOX_DRAG_THRESHOLD_PX * BOX_DRAG_THRESHOLD_PX) {
          return;
        }
        isDraggingRef.current = true;
      }

      const newPosition = calculateNewPosition(event, activeHandle);
      if (newPosition && onMove) {
        // Store last position for drag completion callback
        lastPositionRef.current = newPosition;
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

      // Notify parent when drag completes (only if actually dragged)
      if (isDraggingRef.current && lastPositionRef.current && onMoveComplete) {
        onMoveComplete(annotation.id, lastPositionRef.current.start, lastPositionRef.current.end);
      }

      setActiveHandle(null);
      dragStartRef.current = null;
      isDraggingRef.current = false;
      lastPositionRef.current = null;
    },
    [interactive, onMoveComplete, annotation.id],
  );

  // Context menu handler (desktop right-click)
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // Only show context menu in interactive mode, not during resize, and when not using hand tool
      if (!interactive || activeHandle || handToolActive || !onEdit || !onDelete) return;

      event.preventDefault();
      event.stopPropagation();

      // Select annotation
      onSelect?.(annotation.id);

      // Show context menu at cursor position
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuOpen(true);
    },
    [interactive, activeHandle, handToolActive, onEdit, onDelete, onSelect, annotation.id],
  );

  // Long press handler (mobile)
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      // Only trigger on mobile in interactive mode, not during resize, and when not using hand tool
      if (!isMobile || !interactive || activeHandle || handToolActive || !onEdit || !onDelete) return;

      // Select annotation
      onSelect?.(annotation.id);

      // Show action sheet
      setActionSheetOpen(true);
    },
    threshold: 500,
    moveThreshold: 10,
    enabled: isMobile && interactive && !activeHandle && !handToolActive && !!onEdit && !!onDelete,
  });

  // Edit handler
  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(annotation.id);
    }
  }, [onEdit, annotation.id]);

  // Delete handler
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(annotation.id);
    }
  }, [onDelete, annotation.id]);

  return (
    <>
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
          className={getAnnotationBoxBorderClassName({ isActive, interactive })}
          onPointerDown={(e) => handlePointerDown(e, 'box')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
          {...(isMobile ? longPressHandlers : {})}
        />

        {/* Label Badge */}
        <motion.div
          className={getAnnotationBoxLabelClassName(isActive, interactive)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onPointerDown={(e) => handlePointerDown(e, 'box')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
          {...(isMobile ? longPressHandlers : {})}
        >
          {annotation.label}
        </motion.div>

      {/* Resize Handles - Only shown when active and interactive */}
      {isActive && interactive && (
        <>
          {/* Top-Left */}
          <div
            className={getAnnotationBoxHandleClassName('-left-1.5 -top-1.5', 'cursor-nwse-resize hover:scale-125')}
            onPointerDown={(e) => handlePointerDown(e, 'top-left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Top-Right */}
          <div
            className={getAnnotationBoxHandleClassName('-right-1.5 -top-1.5', 'cursor-nesw-resize hover:scale-125')}
            onPointerDown={(e) => handlePointerDown(e, 'top-right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Bottom-Left */}
          <div
            className={getAnnotationBoxHandleClassName('-bottom-1.5 -left-1.5', 'cursor-nesw-resize hover:scale-125')}
            onPointerDown={(e) => handlePointerDown(e, 'bottom-left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Bottom-Right */}
          <div
            className={getAnnotationBoxHandleClassName('-bottom-1.5 -right-1.5', 'cursor-nwse-resize hover:scale-125')}
            onPointerDown={(e) => handlePointerDown(e, 'bottom-right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </>
      )}
      </motion.div>

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
