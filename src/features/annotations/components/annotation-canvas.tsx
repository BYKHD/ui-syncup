'use client';

import { useState, useCallback, useEffect, type PointerEvent, type RefObject } from 'react';
import type { AnnotationToolId, AnnotationPosition, AnnotationDraft } from '../types';
import { AnnotationCommentInput } from './annotation-comment-input';
import { cn } from '@/lib/utils';
import {
  calculateCommentInputPosition,
  COMMENT_INPUT_WIDTH,
  COMMENT_INPUT_HEIGHT,
  PADDING,
} from '../utils/position-comment-input';

export interface AnnotationCanvasProps {
  overlayRef: RefObject<HTMLDivElement | null>;
  activeTool: AnnotationToolId;
  editModeEnabled: boolean;
  handToolActive?: boolean;
  onDraftCreate?: (draft: AnnotationDraft) => void;
  onDraftUpdate?: (draft: AnnotationDraft) => void;
  onDraftCommit?: (draft: AnnotationDraft, message?: string) => void;
  onDraftCancel?: () => void;
  requireCommentForPin?: boolean; // If true, pin annotations require a comment
  requireCommentForBox?: boolean; // If true, box annotations require a comment
  className?: string;
}

interface DraftState {
  id: string;
  tool: AnnotationToolId;
  startPosition: AnnotationPosition;
  currentPosition: AnnotationPosition;
  isDrawing: boolean;
}

interface PendingCommentState {
  draft: AnnotationDraft;
  position: { x: number; y: number }; // Pixel position for input
  targetBounds?: { x: number; y: number; width: number; height: number }; // Annotation bounds in pixels (for click-outside detection)
}

// Constants moved to shared utility file

export function AnnotationCanvas({
  overlayRef,
  activeTool,
  editModeEnabled,
  handToolActive = false,
  onDraftCreate,
  onDraftUpdate,
  onDraftCommit,
  onDraftCancel,
  requireCommentForPin = false,
  requireCommentForBox = true,
  className,
}: AnnotationCanvasProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [pendingComment, setPendingComment] = useState<PendingCommentState | null>(null);

  const getRelativePosition = useCallback(
    (event: PointerEvent<HTMLDivElement>): AnnotationPosition | null => {
      const overlay = overlayRef.current;
      if (!overlay) return null;

      const rect = overlay.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      // Allow positions outside the image bounds (no clamping)
      return { x, y };
    },
    [overlayRef],
  );

  const calculateSmartPosition = useCallback(
    (draft: AnnotationDraft): { position: { x: number; y: number }; targetBounds: { x: number; y: number; width: number; height: number } } | null => {
      const overlay = overlayRef.current;
      if (!overlay) return null;

      const rect = overlay.getBoundingClientRect();

      // Convert draft to annotation-like object for the utility function
      const annotation = {
        id: draft.id,
        shape: draft.shape,
        description: '',
        label: '',
        createdAt: draft.createdAt,
      };

      // Use the shared utility function to calculate position
      const position = calculateCommentInputPosition(annotation, {
        width: rect.width,
        height: rect.height,
      });

      // Calculate target bounds for click-outside detection
      if (draft.shape.type === 'box') {
        const { start, end } = draft.shape;
        const x1 = Math.min(start.x, end.x) * rect.width;
        const y1 = Math.min(start.y, end.y) * rect.height;
        const x2 = Math.max(start.x, end.x) * rect.width;
        const y2 = Math.max(start.y, end.y) * rect.height;

        return {
          position,
          targetBounds: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
        };
      } else if (draft.shape.type === 'pin') {
        const { position: pinPos } = draft.shape;
        const pinX = pinPos.x * rect.width;
        const pinY = pinPos.y * rect.height;
        const pinSize = 36;
        const pinRadius = pinSize / 2;

        return {
          position,
          targetBounds: { x: pinX - pinRadius, y: pinY - pinRadius, width: pinSize, height: pinSize },
        };
      }

      return null;
    },
    [overlayRef],
  );

  const createDraft = useCallback(
    (tool: AnnotationToolId, position: AnnotationPosition): AnnotationDraft => {
      const id = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const createdAt = Date.now();

      switch (tool) {
        case 'pin':
          return {
            id,
            tool,
            shape: { type: 'pin', position },
            createdAt,
          };
        case 'box':
          return {
            id,
            tool,
            shape: { type: 'box', start: position, end: position },
            createdAt,
          };
        default:
          return {
            id,
            tool: 'pin',
            shape: { type: 'pin', position },
            createdAt,
          };
      }
    },
    [],
  );

  const updateDraft = useCallback(
    (draft: DraftState, currentPosition: AnnotationPosition): AnnotationDraft => {
      switch (draft.tool) {
        case 'pin':
          return {
            id: draft.id,
            tool: draft.tool,
            shape: { type: 'pin', position: currentPosition },
            createdAt: Date.now(),
          };
        case 'box':
          return {
            id: draft.id,
            tool: draft.tool,
            shape: { type: 'box', start: draft.startPosition, end: currentPosition },
            createdAt: Date.now(),
          };
        default:
          return {
            id: draft.id,
            tool: 'pin',
            shape: { type: 'pin', position: currentPosition },
            createdAt: Date.now(),
          };
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!editModeEnabled || handToolActive || pendingComment) return;

      // Cursor tool is for selecting/manipulating existing annotations, not creating new ones
      if (activeTool === 'cursor') return;

      // Ignore if clicking on existing annotations or comment input
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-annotation-pin]') ||
        target.closest('[data-annotation-box]') ||
        target.closest('[data-annotation-comment-input]')
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const position = getRelativePosition(event);
      if (!position) return;

      const draft = createDraft(activeTool, position);

      setDraftState({
        id: draft.id,
        tool: activeTool,
        startPosition: position,
        currentPosition: position,
        isDrawing: true,
      });

      onDraftCreate?.(draft);

      // Capture pointer for smooth dragging
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [editModeEnabled, handToolActive, pendingComment, activeTool, getRelativePosition, createDraft, onDraftCreate],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draftState || !draftState.isDrawing) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      event.preventDefault();

      const position = getRelativePosition(event);
      if (!position) return;

      setDraftState((prev) => {
        if (!prev) return null;
        return { ...prev, currentPosition: position };
      });

      const updatedDraft = updateDraft(draftState, position);
      onDraftUpdate?.(updatedDraft);
    },
    [draftState, getRelativePosition, updateDraft, onDraftUpdate],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draftState) return;

      event.preventDefault();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const position = getRelativePosition(event);
      if (!position) {
        onDraftCancel?.();
        setDraftState(null);
        return;
      }

      const finalDraft = updateDraft(draftState, position);

      // For pins with requireCommentForPin, show comment input
      if (draftState.tool === 'pin' && requireCommentForPin) {
        const smartPos = calculateSmartPosition(finalDraft);

        if (smartPos) {
          setPendingComment({
            draft: finalDraft,
            position: smartPos.position,
            targetBounds: smartPos.targetBounds,
          });
          setDraftState(null);
        } else {
          // Fallback: commit without comment
          onDraftCommit?.(finalDraft);
          setDraftState(null);
        }
        return;
      }

      // For pins without comment requirement, commit immediately
      if (draftState.tool === 'pin') {
        onDraftCommit?.(finalDraft);
        setDraftState(null);
        return;
      }

      // For boxes, check if there's meaningful size
      const dx = Math.abs(position.x - draftState.startPosition.x);
      const dy = Math.abs(position.y - draftState.startPosition.y);
      const minSize = 0.01; // Minimum 1% of canvas size

      if (dx < minSize && dy < minSize) {
        // Too small, cancel
        onDraftCancel?.();
        setDraftState(null);
        return;
      }

      // For box tool with requireCommentForBox, show comment input
      if (draftState.tool === 'box' && requireCommentForBox) {
        const smartPos = calculateSmartPosition(finalDraft);

        if (smartPos) {
          setPendingComment({
            draft: finalDraft,
            position: smartPos.position,
            targetBounds: smartPos.targetBounds,
          });
          setDraftState(null);
        } else {
          // Fallback: commit without comment
          onDraftCommit?.(finalDraft);
          setDraftState(null);
        }
      } else {
        // For other tools or when comment not required, commit immediately
        onDraftCommit?.(finalDraft);
        setDraftState(null);
      }
    },
    [draftState, getRelativePosition, calculateSmartPosition, updateDraft, onDraftCommit, onDraftCancel, requireCommentForPin, requireCommentForBox],
  );

  const handleCommentSubmit = useCallback(
    (message: string) => {
      if (pendingComment) {
        onDraftCommit?.(pendingComment.draft, message);
        setPendingComment(null);
      }
    },
    [pendingComment, onDraftCommit],
  );

  const handleCommentCancel = useCallback(() => {
    if (pendingComment) {
      onDraftCancel?.();
      setPendingComment(null);
    }
  }, [pendingComment, onDraftCancel]);

  // Click outside to dismiss
  useEffect(() => {
    if (!pendingComment) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't dismiss if clicking inside comment input
      if (target.closest('[data-annotation-comment-input]')) {
        return;
      }

      // Check if clicking inside the annotation area (box or pin)
      if (pendingComment.targetBounds) {
        const overlay = overlayRef.current;
        if (overlay) {
          const rect = overlay.getBoundingClientRect();
          const clickX = event.clientX - rect.left;
          const clickY = event.clientY - rect.top;

          const { targetBounds } = pendingComment;

          // Check if click is inside the annotation target area
          if (
            clickX >= targetBounds.x &&
            clickX <= targetBounds.x + targetBounds.width &&
            clickY >= targetBounds.y &&
            clickY <= targetBounds.y + targetBounds.height
          ) {
            return; // Don't dismiss if clicking inside the annotation
          }
        }
      }

      // Dismiss annotation
      handleCommentCancel();
    };

    // Add listener after a small delay to avoid immediate dismissal
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pendingComment, overlayRef, handleCommentCancel]);

  const renderDraftPreview = () => {
    if (!draftState || !draftState.isDrawing) return null;

    const { tool, startPosition, currentPosition } = draftState;

    switch (tool) {
      case 'pin':
        return (
          <div
            className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-annotation bg-annotation/20 shadow-lg"
            style={{
              left: `${currentPosition.x * 100}%`,
              top: `${currentPosition.y * 100}%`,
            }}
          />
        );

      case 'box': {
        const x1 = Math.min(startPosition.x, currentPosition.x);
        const y1 = Math.min(startPosition.y, currentPosition.y);
        const x2 = Math.max(startPosition.x, currentPosition.x);
        const y2 = Math.max(startPosition.y, currentPosition.y);
        const width = (x2 - x1) * 100;
        const height = (y2 - y1) * 100;

        return (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-annotation bg-annotation/10 shadow-lg"
            style={{
              left: `${x1 * 100}%`,
              top: `${y1 * 100}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          />
        );
      }

      default:
        return null;
    }
  };

  const renderPendingAnnotation = () => {
    if (!pendingComment) return null;

    const { draft } = pendingComment;

    if (draft.shape.type === 'box') {
      const { start, end } = draft.shape;
      const x1 = Math.min(start.x, end.x);
      const y1 = Math.min(start.y, end.y);
      const x2 = Math.max(start.x, end.x);
      const y2 = Math.max(start.y, end.y);
      const width = (x2 - x1) * 100;
      const height = (y2 - y1) * 100;

      return (
        <div
          className="pointer-events-none absolute border-2 border-annotation bg-annotation/10 shadow-lg"
          style={{
            left: `${x1 * 100}%`,
            top: `${y1 * 100}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        />
      );
    } else if (draft.shape.type === 'pin') {
      const { position } = draft.shape;

      return (
        <div
          className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-annotation bg-annotation/20 shadow-lg"
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
          }}
        />
      );
    }

    return null;
  };

  if (!editModeEnabled) return null;

  // Determine cursor style based on active tool and state
  const getCursorClass = () => {
    if (handToolActive) return 'cursor-grab active:cursor-grabbing';
    if (activeTool === 'cursor') return 'cursor-default';
    return 'cursor-crosshair';
  };

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 z-10',
          getCursorClass(),
          // Disable canvas interaction when cursor tool is active (let annotations handle clicks)
          // or when comment input is shown
          (activeTool === 'cursor' || pendingComment) && 'pointer-events-none',
          className,
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-annotation-canvas="true"
      >
        {renderDraftPreview()}
        {renderPendingAnnotation()}
      </div>

      {/* Comment Input Overlay */}
      {pendingComment && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            className="pointer-events-auto absolute"
            style={{
              left: `${pendingComment.position.x}px`,
              top: `${pendingComment.position.y}px`,
            }}
            data-annotation-comment-input="true"
          >
            <AnnotationCommentInput
              position={{ x: 0, y: 0 }} // Position handled by parent div
              onSubmit={handleCommentSubmit}
              onCancel={handleCommentCancel}
              placeholder="Describe this annotation..."
            />
          </div>
        </div>
      )}
    </>
  );
}
