'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
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
  isSaving,
}: {
  isActive: boolean;
  interactive: boolean;
  isSaving: boolean;
}) =>
  cn(
    'absolute inset-0  transition-colors',
    isActive ? 'border-annotation border-2' : 'border-annotation/50 border-2',
    interactive ? 'cursor-move' : 'cursor-pointer',
    isSaving && 'animate-pulse ring-2 ring-blue-400 ring-opacity-75',
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
  isSaving?: boolean; // Show saving indicator when true
  isPopoverOpen?: boolean; // Whether popover is currently shown for this annotation
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onMoveComplete?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onDragStart?: (annotationId: string) => void;
  onDragEnd?: (annotationId: string) => void;
  onEdit?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
  onHoverStart?: (annotationId: string) => void;
  onHoverEnd?: () => void;
  labelRef?: RefObject<HTMLDivElement | null>;
}

type DragHandle = 'box' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function AnnotationBox({
  annotation,
  overlayRef,
  isActive = false,
  interactive = true,
  handToolActive = false,
  isSaving = false,
  isPopoverOpen = false,
  onSelect,
  onMove,
  onMoveComplete,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onHoverStart,
  onHoverEnd,
  labelRef,
}: AnnotationBoxProps) {
  const isMobile = useIsMobile();
  const [activeHandle, setActiveHandle] = useState<DragHandle | null>(null);
  
  // Single consolidated drag state ref - stores everything needed for the drag operation
  const dragStateRef = useRef<{
    // Original annotation positions at drag start
    originalStart: AnnotationPosition;
    originalEnd: AnnotationPosition;
    // Cursor position at drag start (normalized 0-1)
    grabPoint: { x: number; y: number };
    // Client position for threshold detection
    clientStart: { x: number; y: number };
    // Has drag surpassed threshold?
    hasMoved: boolean;
  } | null>(null);
  
  // Last calculated position for final onMove call
  const lastPositionRef = useRef<{ start: AnnotationPosition; end: AnnotationPosition } | null>(null);
  
  // Track the effective base position for drag calculations
  // This is annotation position + any uncommitted delta from previous drag
  const effectiveBaseRef = useRef<{ start: AnnotationPosition; end: AnnotationPosition }>({
    start: { ...annotation.start },
    end: { ...annotation.end },
  });
  
  // Local visual offset for smooth rendering (supports both move and resize)
  const [visualDelta, setVisualDelta] = useState<{ 
    startDx: number; startDy: number; 
    endDx: number; endDy: number 
  } | null>(null);
  
  // Update effective base when props change (i.e., when save completes)
  // BUT only if not currently dragging - otherwise we'd jump mid-drag
  useEffect(() => {
    if (!dragStateRef.current) {
      // When props update (save completed), sync effective base to new props
      effectiveBaseRef.current = {
        start: { ...annotation.start },
        end: { ...annotation.end },
      };
      // Clear any lingering delta since props now reflect the committed position
      if (visualDelta !== null) {
        setVisualDelta(null);
      }
    }
  }, [annotation.start.x, annotation.start.y, annotation.end.x, annotation.end.y]);

  // Context menu state (desktop)
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Action sheet state (mobile)
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  // Calculate effective positions with visual delta for smooth updates during drag
  // Use effectiveBaseRef (not stale props) to prevent snap-back
  const base = effectiveBaseRef.current;
  const effectiveStart = visualDelta 
    ? { x: base.start.x + visualDelta.startDx, y: base.start.y + visualDelta.startDy }
    : annotation.start;
  const effectiveEnd = visualDelta 
    ? { x: base.end.x + visualDelta.endDx, y: base.end.y + visualDelta.endDy }
    : annotation.end;

  const x1 = Math.min(effectiveStart.x, effectiveEnd.x);
  const y1 = Math.min(effectiveStart.y, effectiveEnd.y);
  const x2 = Math.max(effectiveStart.x, effectiveEnd.x);
  const y2 = Math.max(effectiveStart.y, effectiveEnd.y);

  const width = Math.abs((x2 - x1) * 100);
  const height = Math.abs((y2 - y1) * 100);

  // Long press handler (mobile) - declared early to be used in pointer handlers
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

  const calculateNewPosition = useCallback(
    (event: PointerEvent, handle: DragHandle): { start: AnnotationPosition; end: AnnotationPosition } | null => {
      const overlay = overlayRef.current;
      const dragState = dragStateRef.current;
      if (!overlay || !dragState) return null;

      const rect = overlay.getBoundingClientRect();
      const currentX = (event.clientX - rect.left) / rect.width;
      const currentY = (event.clientY - rect.top) / rect.height;

      let newStart = { ...dragState.originalStart };
      let newEnd = { ...dragState.originalEnd };

      switch (handle) {
        case 'box':
          // Move entire box - delta from grab point to current cursor
          const dx = currentX - dragState.grabPoint.x;
          const dy = currentY - dragState.grabPoint.y;
          newStart = { x: dragState.originalStart.x + dx, y: dragState.originalStart.y + dy };
          newEnd = { x: dragState.originalEnd.x + dx, y: dragState.originalEnd.y + dy };
          break;
        case 'top-left':
          newStart = { x: currentX, y: currentY };
          break;
        case 'top-right':
          newStart = { x: dragState.originalStart.x, y: currentY };
          newEnd = { x: currentX, y: dragState.originalEnd.y };
          break;
        case 'bottom-left':
          newStart = { x: currentX, y: dragState.originalStart.y };
          newEnd = { x: dragState.originalEnd.x, y: currentY };
          break;
        case 'bottom-right':
          newEnd = { x: currentX, y: currentY };
          break;
      }

      // Center-must-be-inside constraint: corners can extend outside canvas,
      // but the center point must stay within 0-1 range
      const centerX = (newStart.x + newEnd.x) / 2;
      const centerY = (newStart.y + newEnd.y) / 2;
      
      // Calculate how much to adjust if center is outside bounds
      let adjustX = 0;
      let adjustY = 0;
      
      if (centerX < 0) {
        adjustX = -centerX;
      } else if (centerX > 1) {
        adjustX = 1 - centerX;
      }
      
      if (centerY < 0) {
        adjustY = -centerY;
      } else if (centerY > 1) {
        adjustY = 1 - centerY;
      }
      
      // Apply adjustment if needed
      if (adjustX !== 0 || adjustY !== 0) {
        newStart = { x: newStart.x + adjustX, y: newStart.y + adjustY };
        newEnd = { x: newEnd.x + adjustX, y: newEnd.y + adjustY };
      }
      
      return { start: newStart, end: newEnd };
    },
    [overlayRef],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>, handle: DragHandle) => {
      event.stopPropagation();
      event.preventDefault();

      // Call long-press handler on mobile
      if (isMobile && longPressHandlers.onPointerDown) {
        longPressHandlers.onPointerDown(event as any);
      }

      // Only enable dragging/resizing in interactive (edit) mode
      if (!interactive || event.button !== 0) return;

      // IMPORTANT: If there's an existing visual delta (from a previous drag that's still saving),
      // "bake" it into the effective base. This prevents snap-back when starting a new drag
      // before the previous save completes and props have updated.
      if (visualDelta !== null) {
        effectiveBaseRef.current = {
          start: {
            x: effectiveBaseRef.current.start.x + visualDelta.startDx,
            y: effectiveBaseRef.current.start.y + visualDelta.startDy,
          },
          end: {
            x: effectiveBaseRef.current.end.x + visualDelta.endDx,
            y: effectiveBaseRef.current.end.y + visualDelta.endDy,
          },
        };
        // Clear the delta since we've incorporated it into the base
        setVisualDelta(null);
      }

      // Initialize drag state with all needed info - use EFFECTIVE BASE not stale props
      const overlay = overlayRef.current;
      if (overlay) {
        const rect = overlay.getBoundingClientRect();
        const effectiveBase = effectiveBaseRef.current;
        dragStateRef.current = {
          originalStart: { ...effectiveBase.start },
          originalEnd: { ...effectiveBase.end },
          grabPoint: {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          },
          clientStart: { x: event.clientX, y: event.clientY },
          hasMoved: false,
        };
      }

      setActiveHandle(handle);
      event.currentTarget.setPointerCapture(event.pointerId);
      
      // Notify parent immediately that drag might start (prevents sync during potential drag)
      onDragStart?.(annotation.id);
    },
    [interactive, isMobile, longPressHandlers, overlayRef, visualDelta, onDragStart, annotation.id],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // Call long-press handler on mobile
      if (isMobile && longPressHandlers.onPointerMove) {
        longPressHandlers.onPointerMove(event as any);
      }

      if (!interactive || !activeHandle) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      const dragState = dragStateRef.current;
      if (!dragState) return;

      event.preventDefault();
      
      // Check threshold
      if (!dragState.hasMoved) {
        const deltaX = event.clientX - dragState.clientStart.x;
        const deltaY = event.clientY - dragState.clientStart.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared < BOX_DRAG_THRESHOLD_PX * BOX_DRAG_THRESHOLD_PX) {
          return;
        }
        dragState.hasMoved = true;
      }

      const newPosition = calculateNewPosition(event, activeHandle);
      if (newPosition) {
        lastPositionRef.current = newPosition;
        
        // Calculate visual delta for smooth rendering (works for both move and resize)
        setVisualDelta({
          startDx: newPosition.start.x - annotation.start.x,
          startDy: newPosition.start.y - annotation.start.y,
          endDx: newPosition.end.x - annotation.end.x,
          endDy: newPosition.end.y - annotation.end.y,
        });
      }
    },
    [interactive, activeHandle, calculateNewPosition, annotation.start, annotation.end, isMobile, longPressHandlers],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // Call long-press handler on mobile
      if (isMobile && longPressHandlers.onPointerUp) {
        longPressHandlers.onPointerUp(event as any);
      }

      const dragState = dragStateRef.current;
      
      // If no drag occurred, treat as a click and select
      if (!dragState?.hasMoved) {
        onSelect?.(annotation.id);
      }

      if (!interactive) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      // Notify parent when drag completes (only if actually dragged)
      if (dragState?.hasMoved && lastPositionRef.current) {
        // Call onMoveComplete for final state update and history (onMove is for live updates during drag)
        onMoveComplete?.(annotation.id, lastPositionRef.current.start, lastPositionRef.current.end);
      }

      // Clear state - visualDelta will be cleared by useEffect when annotation updates
      setActiveHandle(null);
      dragStateRef.current = null;
      lastPositionRef.current = null;

      // Always notify parent that drag ended (matches onDragStart in pointerDown)
      onDragEnd?.(annotation.id);
    },
    [interactive, onSelect, onMoveComplete, onDragEnd, annotation.id, isMobile, longPressHandlers],
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

  // Hover handlers - only trigger when not dragging
  const handleMouseEnter = useCallback(() => {
    if (!dragStateRef.current && !activeHandle && !handToolActive && onHoverStart) {
      onHoverStart(annotation.id);
    }
  }, [activeHandle, handToolActive, onHoverStart, annotation.id]);

  const handleMouseLeave = useCallback(() => {
    if (!dragStateRef.current && !activeHandle && onHoverEnd) {
      onHoverEnd();
    }
  }, [activeHandle, onHoverEnd]);

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Box Border */}
        <div
          className={getAnnotationBoxBorderClassName({ isActive, interactive, isSaving })}
          onPointerDown={(e) => handlePointerDown(e, 'box')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
        />

        {/* Label Badge - anchor for popover */}
        <motion.div
          ref={labelRef}
          className={getAnnotationBoxLabelClassName(isActive || isPopoverOpen, interactive)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onPointerDown={(e) => handlePointerDown(e, 'box')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
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
