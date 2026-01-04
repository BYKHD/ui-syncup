'use client';

import { motion } from 'motion/react';
import type { PointerEvent, RefObject } from 'react';
import { useRef, useState, useEffect } from 'react';
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
  isSaving,
}: {
  isActive: boolean;
  interactive: boolean;
  isSaving: boolean;
}) =>
  cn(
    'group absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    isActive ? 'border-annotation-bold bg-annotation-bold text-annotation-foreground' : 'border-2 border-white bg-annotation text-annotation-foreground',
    interactive ? 'cursor-move' : 'cursor-pointer',
    isSaving && 'animate-pulse ring-2 ring-blue-400 ring-opacity-75',
  );

export interface AnnotationPinProps<A extends AttachmentAnnotation = AttachmentAnnotation> {
  annotation: A;
  overlayRef: RefObject<HTMLDivElement | null>;
  isActive?: boolean;
  interactive?: boolean;
  handToolActive?: boolean; // Disable context menu when hand tool is active
  isSaving?: boolean; // Show saving indicator when true
  isPopoverOpen?: boolean; // Whether popover is currently shown for this annotation
  onSelect?: (annotationId: string) => void;
  onMove?: (annotationId: string, position: AnnotationPosition) => void;
  onMoveComplete?: (annotationId: string, position: AnnotationPosition) => void;
  onDragStart?: (annotationId: string) => void;
  onDragEnd?: (annotationId: string) => void;
  onEdit?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
  onHoverStart?: (annotationId: string) => void;
  onHoverEnd?: () => void;
}

export function AnnotationPin<A extends AttachmentAnnotation>({
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
}: AnnotationPinProps<A>) {
  const isMobile = useIsMobile();
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const lastPositionRef = useRef<AnnotationPosition | null>(null);
  
  // Track the effective base position for drag calculations
  // This is annotation position + any uncommitted offset from previous drag
  const effectiveBaseRef = useRef<{ x: number; y: number }>({ x: annotation.x, y: annotation.y });
  
  // Local drag offset for smooth visual updates (prevents re-renders during drag)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  
  // Update the effective base when props change (i.e., when save completes)
  // BUT only if not currently dragging - otherwise we'd jump mid-drag
  useEffect(() => {
    if (!isDraggingRef.current) {
      // When props update (save completed), sync effective base to new props
      effectiveBaseRef.current = { x: annotation.x, y: annotation.y };
      // Clear any lingering offset since props now reflect the committed position
      if (dragOffset !== null) {
        setDragOffset(null);
      }
    }
  }, [annotation.x, annotation.y]);

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
    
    // IMPORTANT: If there's an existing drag offset (from a previous drag that's still saving),
    // "bake" it into the effective base position. This prevents snap-back when starting
    // a new drag before the previous save completes and props have updated.
    if (dragOffset !== null) {
      effectiveBaseRef.current = {
        x: annotation.x + dragOffset.x,
        y: annotation.y + dragOffset.y,
      };
      // Clear the offset since we've incorporated it into the base
      setDragOffset(null);
    }
    
    // Notify parent immediately that drag might start (prevents sync during potential drag)
    onDragStart?.(annotation.id);
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
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.min(Math.max(x, 0), 1);
    const clampedY = Math.min(Math.max(y, 0), 1);
    const position = { x: clampedX, y: clampedY };

    // Store last position for drag completion callback
    lastPositionRef.current = position;
    
    // Calculate offset relative to EFFECTIVE BASE (not stale props)
    // This ensures smooth drag even when props haven't updated from previous save
    const base = effectiveBaseRef.current;
    setDragOffset({
      x: clampedX - base.x,
      y: clampedY - base.y,
    });
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
    if (isDraggingRef.current && lastPositionRef.current) {
      // Call onMoveComplete for final state update and history (onMove is for live updates during drag)
      onMoveComplete?.(annotation.id, lastPositionRef.current);
    }

    // Don't clear dragOffset here - let useEffect clear it when annotation.x/y updates
    // This prevents flicker between drop and state update
    dragStartRef.current = null;
    isDraggingRef.current = false;
    lastPositionRef.current = null;

    // Always notify parent that drag ended (matches onDragStart in pointerDown)
    onDragEnd?.(annotation.id);
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

  // Hover handlers - only trigger when not dragging
  const handleMouseEnter = () => {
    if (!isDraggingRef.current && !handToolActive && onHoverStart) {
      onHoverStart(annotation.id);
    }
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current && onHoverEnd) {
      onHoverEnd();
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={getAnnotationPinClassName({ isActive: isActive || isPopoverOpen, interactive, isSaving })}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          left: dragOffset 
            ? `${(effectiveBaseRef.current.x + dragOffset.x) * 100}%` 
            : `${annotation.x * 100}%`,
          top: dragOffset 
            ? `${(effectiveBaseRef.current.y + dragOffset.y) * 100}%` 
            : `${annotation.y * 100}%`,
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
