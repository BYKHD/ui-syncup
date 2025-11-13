'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnnotationDraft, AnnotationPosition, AnnotationToolId } from '../types';
import { cn } from '@/lib/utils';

interface AnnotationDrawerProps {
  activeTool: AnnotationToolId;
  enabled: boolean;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  onDraftCommit?: (draft: AnnotationDraft) => void;
  onDraftChange?: (draft: AnnotationDraft | null) => void;
}

type DrawingState =
  | {
      tool: 'box';
      start: AnnotationPosition;
      current: AnnotationPosition;
    }
  | {
      tool: 'highlight';
      points: AnnotationPosition[];
    }
  | null;

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

const getRelativePosition = (
  overlay: HTMLDivElement,
  event: PointerEvent | MouseEvent,
): AnnotationPosition => {
  const rect = overlay.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height),
  };
};

export function AnnotationDrawer({
  activeTool,
  enabled,
  overlayRef,
  onDraftCommit,
  onDraftChange,
}: AnnotationDrawerProps) {
  const [drawingState, setDrawingState] = useState<DrawingState>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const overlayRectRef = useRef<DOMRect | null>(null);

  const resetDrawing = useCallback(() => {
    setDrawingState(null);
    setDraftId(null);
    draftIdRef.current = null;
    pointerIdRef.current = null;
    onDraftChange?.(null);
  }, [onDraftChange]);

  const commitDraft = useCallback(
    (shape: DrawingState) => {
      if (!shape) return;
      const id = draftIdRef.current ?? draftId ?? `draft_${Date.now()}`;
      const getShape = (): AnnotationDraft['shape'] => {
        if (shape.tool === 'highlight') {
          return { type: 'highlight', points: shape.points };
        }
        return { type: 'box', start: shape.start, end: shape.current };
      };
      onDraftCommit?.({
        id,
        tool: shape.tool,
        shape: getShape(),
        createdAt: Date.now(),
      });
    },
    [draftId, onDraftCommit],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled || pointerIdRef.current !== null) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      overlayRectRef.current = overlay.getBoundingClientRect();
      const rect = overlayRectRef.current;
      if (!rect) return;
      const withinX = event.clientX >= rect.left && event.clientX <= rect.right;
      const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!withinX || !withinY) return;
      const pinTarget = (event.target as HTMLElement | null)?.closest('[data-annotation-pin]');
      if (pinTarget) return;

      if (event.pointerType !== 'touch' && 'button' in event && event.button !== 0) {
        return;
      }

      const position = getRelativePosition(overlay, event);
      pointerIdRef.current = event.pointerId;

      if (activeTool === 'pin') {
        const id = `draft_${Date.now()}`;
        const draft: AnnotationDraft = {
          id,
          tool: 'pin',
          shape: { type: 'pin', position },
          createdAt: Date.now(),
        };
        onDraftCommit?.(draft);
        pointerIdRef.current = null;
        return;
      }

      const id = `draft_${Date.now()}`;
      setDraftId(id);
      draftIdRef.current = id;

      if (activeTool === 'highlight') {
        const initialState: DrawingState = {
          tool: 'highlight',
          points: [position],
        };
      setDrawingState(initialState);
      onDraftChange?.({
        id,
        tool: 'highlight',
        shape: { type: 'highlight', points: initialState.points },
        createdAt: Date.now(),
      });
        return;
      }

      const initialState: DrawingState = {
        tool: activeTool,
        start: position,
        current: position,
      };
      setDrawingState(initialState);
      onDraftChange?.({
        id,
        tool: activeTool,
        shape: { type: 'box', start: position, end: position },
        createdAt: Date.now(),
      });
    },
    [activeTool, enabled, onDraftChange, onDraftCommit, overlayRef],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;
      if (pointerIdRef.current === null || pointerIdRef.current !== event.pointerId) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const position = getRelativePosition(overlay, event);
      const currentDraftId = draftIdRef.current ?? `draft_${Date.now()}`;
      setDrawingState((prev) => {
        if (!prev) return prev;
        if (prev.tool === 'highlight') {
          const updatedPoints = [...prev.points, position];
          onDraftChange?.({
            id: currentDraftId,
            tool: 'highlight',
            shape: { type: 'highlight', points: updatedPoints },
            createdAt: Date.now(),
          });
          return { ...prev, points: updatedPoints };
        }
        const updatedState = { ...prev, current: position };
        onDraftChange?.({
          id: currentDraftId,
          tool: prev.tool,
          shape: { type: 'box', start: prev.start, end: position },
          createdAt: Date.now(),
        });
        return updatedState;
      });
    },
    [draftId, enabled, onDraftChange, overlayRef],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (pointerIdRef.current === null || pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      if (drawingState) {
        commitDraft(drawingState);
      }
      resetDrawing();
    },
    [commitDraft, drawingState, resetDrawing],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrawing();
      }
    },
    [resetDrawing],
  );

  useEffect(() => {
    if (!enabled) {
      resetDrawing();
      return;
    }

    const handlePointerCancel = () => {
      resetDrawing();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown, handlePointerDown, handlePointerMove, handlePointerUp, resetDrawing]);

  useEffect(() => {
    if (!enabled) return;
    resetDrawing();
  }, [activeTool, enabled, resetDrawing]);

  const draftPreview = useMemo(() => {
    if (!drawingState || !overlayRef.current) return null;

    if (drawingState.tool === 'highlight') {
      if (drawingState.points.length < 2) return null;
      const pointsAttr = drawingState.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');
      return (
        <svg className="absolute inset-0 z-30 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={pointsAttr}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_6px_hsl(var(--primary)_/_0.35)]"
          />
        </svg>
      );
    }

    const start = drawingState.start;
    const current = drawingState.current;
    const left = Math.min(start.x, current.x) * 100;
    const top = Math.min(start.y, current.y) * 100;
    const width = Math.abs(current.x - start.x) * 100;
    const height = Math.abs(current.y - start.y) * 100;

    return (
      <div
        className="absolute z-30 border-2 border-dashed border-primary/70 bg-primary/10 pointer-events-none"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      />
    );
  }, [drawingState, overlayRef]);

  return (
    <div className={cn('absolute inset-0 z-30', enabled ? 'pointer-events-none' : 'pointer-events-none')}>
      {draftPreview}
    </div>
  );
}
