'use client';

import { useState, useCallback, type PointerEvent, type RefObject } from 'react';
import type { AnnotationToolId, AnnotationPosition, AnnotationDraft } from '../types';
import { cn } from '@/lib/utils';

export interface AnnotationCanvasProps {
  overlayRef: RefObject<HTMLDivElement | null>;
  activeTool: AnnotationToolId;
  editModeEnabled: boolean;
  handToolActive?: boolean;
  onDraftCreate?: (draft: AnnotationDraft) => void;
  onDraftUpdate?: (draft: AnnotationDraft) => void;
  onDraftCommit?: (draft: AnnotationDraft) => void;
  onDraftCancel?: () => void;
  className?: string;
}

interface DraftState {
  id: string;
  tool: AnnotationToolId;
  startPosition: AnnotationPosition;
  currentPosition: AnnotationPosition;
  isDrawing: boolean;
}

export function AnnotationCanvas({
  overlayRef,
  activeTool,
  editModeEnabled,
  handToolActive = false,
  onDraftCreate,
  onDraftUpdate,
  onDraftCommit,
  onDraftCancel,
  className,
}: AnnotationCanvasProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(null);

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

  const createDraft = useCallback(
    (tool: AnnotationToolId, position: AnnotationPosition): AnnotationDraft => {
      const id = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      if (!editModeEnabled || handToolActive) return;

      // Ignore if clicking on existing annotations
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-annotation-pin]') ||
        target.closest('[data-annotation-box]') ||
        target.closest('[data-annotation-arrow]')
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
    [editModeEnabled, handToolActive, activeTool, getRelativePosition, createDraft, onDraftCreate],
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
      // For boxes/arrows, only commit if there's meaningful size
      if (draftState.tool === 'pin') {
        onDraftCommit?.(finalDraft);
      } else {
        const dx = Math.abs(position.x - draftState.startPosition.x);
        const dy = Math.abs(position.y - draftState.startPosition.y);
        const minSize = 0.01; // Minimum 1% of canvas size

        if (dx > minSize || dy > minSize) {
          onDraftCommit?.(finalDraft);
        } else {
          onDraftCancel?.();
        }
      }

      setDraftState(null);
    },
    [draftState, getRelativePosition, updateDraft, onDraftCommit, onDraftCancel],
  );

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

  if (!editModeEnabled) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-10',
        handToolActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-annotation-canvas="true"
    >
      {renderDraftPreview()}
    </div>
  );
}
