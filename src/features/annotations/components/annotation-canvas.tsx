'use client';

import { useState, useCallback, useEffect, type PointerEvent, type RefObject } from 'react';
import type { AnnotationToolId, AnnotationPosition, AnnotationDraft } from '../types';
import { AnnotationCommentInput } from './annotation-comment-input';
import { cn } from '@/lib/utils';

export interface AnnotationCanvasProps {
  overlayRef: RefObject<HTMLDivElement | null>;
  activeTool: AnnotationToolId;
  editModeEnabled: boolean;
  handToolActive?: boolean;
  onDraftCreate?: (draft: AnnotationDraft) => void;
  onDraftUpdate?: (draft: AnnotationDraft) => void;
  onDraftCommit?: (draft: AnnotationDraft, message?: string) => void;
  onDraftCancel?: () => void;
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
  boxBounds: { x: number; y: number; width: number; height: number }; // Box bounds in pixels
}

const COMMENT_INPUT_WIDTH = 320; // 80 * 4 = 320px (w-80)
const COMMENT_INPUT_HEIGHT = 200; // Approximate height
const PADDING = 16; // Padding from edges

export function AnnotationCanvas({
  overlayRef,
  activeTool,
  editModeEnabled,
  handToolActive = false,
  onDraftCreate,
  onDraftUpdate,
  onDraftCommit,
  onDraftCancel,
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
    (draft: AnnotationDraft): { position: { x: number; y: number }; boxBounds: { x: number; y: number; width: number; height: number } } | null => {
      const overlay = overlayRef.current;
      if (!overlay || draft.shape.type !== 'box') return null;

      const rect = overlay.getBoundingClientRect();
      const { start, end } = draft.shape;

      // Calculate box bounds in pixels (can be outside image bounds)
      const x1 = Math.min(start.x, end.x) * rect.width;
      const y1 = Math.min(start.y, end.y) * rect.height;
      const x2 = Math.max(start.x, end.x) * rect.width;
      const y2 = Math.max(start.y, end.y) * rect.height;
      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;

      // Clamp box bounds to visible area for space calculation
      const visibleX1 = Math.max(0, Math.min(rect.width, x1));
      const visibleY1 = Math.max(0, Math.min(rect.height, y1));
      const visibleX2 = Math.max(0, Math.min(rect.width, x2));
      const visibleY2 = Math.max(0, Math.min(rect.height, y2));

      // Available space in each direction (from visible portion of box)
      const spaceRight = rect.width - visibleX2;
      const spaceLeft = visibleX1;
      const spaceBottom = rect.height - visibleY2;
      const spaceTop = visibleY1;

      let x = visibleX2; // Default to right of box
      let y = visibleY1; // Default to top of box

      // Priority: Right > Left > Bottom > Top
      if (spaceRight >= COMMENT_INPUT_WIDTH + PADDING) {
        // Position to the right
        x = visibleX2 + PADDING;
        y = Math.max(PADDING, Math.min(visibleY1, rect.height - COMMENT_INPUT_HEIGHT - PADDING));
      } else if (spaceLeft >= COMMENT_INPUT_WIDTH + PADDING) {
        // Position to the left
        x = visibleX1 - COMMENT_INPUT_WIDTH - PADDING;
        y = Math.max(PADDING, Math.min(visibleY1, rect.height - COMMENT_INPUT_HEIGHT - PADDING));
      } else if (spaceBottom >= COMMENT_INPUT_HEIGHT + PADDING) {
        // Position below
        x = Math.max(PADDING, Math.min(visibleX1, rect.width - COMMENT_INPUT_WIDTH - PADDING));
        y = visibleY2 + PADDING;
      } else if (spaceTop >= COMMENT_INPUT_HEIGHT + PADDING) {
        // Position above
        x = Math.max(PADDING, Math.min(visibleX1, rect.width - COMMENT_INPUT_WIDTH - PADDING));
        y = visibleY1 - COMMENT_INPUT_HEIGHT - PADDING;
      } else {
        // Fallback: center on screen
        x = Math.max(PADDING, (rect.width - COMMENT_INPUT_WIDTH) / 2);
        y = Math.max(PADDING, (rect.height - COMMENT_INPUT_HEIGHT) / 2);
      }

      return {
        position: { x, y },
        boxBounds: { x: x1, y: y1, width: boxWidth, height: boxHeight },
      };
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
        case 'arrow':
          return {
            id,
            tool,
            shape: { type: 'arrow', start: position, end: position },
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
        case 'arrow':
          return {
            id: draft.id,
            tool: draft.tool,
            shape: { type: 'arrow', start: draft.startPosition, end: currentPosition },
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

      // Ignore if clicking on existing annotations or comment input
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-annotation-pin]') ||
        target.closest('[data-annotation-box]') ||
        target.closest('[data-annotation-arrow]') ||
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

      // For pins, commit immediately
      if (draftState.tool === 'pin') {
        onDraftCommit?.(finalDraft);
        setDraftState(null);
        return;
      }

      // For boxes/arrows, check if there's meaningful size
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
            boxBounds: smartPos.boxBounds,
          });
          setDraftState(null);
        } else {
          // Fallback: commit without comment
          onDraftCommit?.(finalDraft);
          setDraftState(null);
        }
      } else {
        // For arrows or when comment not required, commit immediately
        onDraftCommit?.(finalDraft);
        setDraftState(null);
      }
    },
    [draftState, getRelativePosition, calculateSmartPosition, updateDraft, onDraftCommit, onDraftCancel, requireCommentForBox],
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

      // Check if clicking inside the box area
      const overlay = overlayRef.current;
      if (overlay) {
        const rect = overlay.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const { boxBounds } = pendingComment;

        // Check if click is inside the box
        if (
          clickX >= boxBounds.x &&
          clickX <= boxBounds.x + boxBounds.width &&
          clickY >= boxBounds.y &&
          clickY <= boxBounds.y + boxBounds.height
        ) {
          return; // Don't dismiss if clicking inside the box
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
            className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-primary bg-primary/20 shadow-lg"
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
            className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10 shadow-lg"
            style={{
              left: `${x1 * 100}%`,
              top: `${y1 * 100}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          />
        );
      }

      case 'arrow': {
        const x1 = startPosition.x * 100;
        const y1 = startPosition.y * 100;
        const x2 = currentPosition.x * 100;
        const y2 = currentPosition.y * 100;

        return (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
            <defs>
              <marker
                id="arrowhead-draft"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>
            <line
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="4 4"
              markerEnd="url(#arrowhead-draft)"
              className="drop-shadow-lg"
            />
          </svg>
        );
      }

      default:
        return null;
    }
  };

  const renderPendingBox = () => {
    if (!pendingComment || pendingComment.draft.shape.type !== 'box') return null;

    const { start, end } = pendingComment.draft.shape;
    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);
    const width = (x2 - x1) * 100;
    const height = (y2 - y1) * 100;

    return (
      <div
        className="pointer-events-none absolute border-2 border-primary bg-primary/10 shadow-lg"
        style={{
          left: `${x1 * 100}%`,
          top: `${y1 * 100}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      />
    );
  };

  if (!editModeEnabled) return null;

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 z-10',
          handToolActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair',
          pendingComment && 'pointer-events-none', // Disable canvas interaction when comment input is shown
          className,
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-annotation-canvas="true"
      >
        {renderDraftPreview()}
        {renderPendingBox()}
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
