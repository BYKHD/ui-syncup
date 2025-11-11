'use client';

// ============================================================================
// ISSUE ATTACHMENTS VIEW
// Zeplin-style canvas for design QA with annotation + compare modes
// ============================================================================

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, FileText, Upload, PenLine, Columns2 } from 'lucide-react';
import { CenteredCanvasView } from './centered-canvas-view';
import { ImageSelector } from './image-selector';
import { ImageCanvas } from './image-canvas';
import { ZoomControls } from './zoom-controls';
import type {
  IssueAttachment,
  CanvasViewState,
  AttachmentAnnotation,
} from '@/types/issue';

const VIEW_MODES = [
  { id: 'annotate', label: 'Annotate', icon: PenLine },
  { id: 'compare', label: 'Compare', icon: Columns2 },
] as const;

type AttachmentViewMode = (typeof VIEW_MODES)[number]['id'];

type AnnotationMovePayload = { x: number; y: number };

interface IssueAttachmentsViewProps {
  issueId: string;
  attachments: IssueAttachment[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  annotationThreads?: AttachmentAnnotation[];
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string) => void;
  onAnnotationMove?: (annotationId: string, position: AnnotationMovePayload) => void;
}

export default function IssueAttachmentsView({
  issueId,
  attachments,
  isLoading = false,
  error = null,
  onRetry,
  annotationThreads = [],
  activeAnnotationId = null,
  onAnnotationSelect,
  onAnnotationMove,
}: IssueAttachmentsViewProps) {
  const imageAttachments = useMemo(
    () => attachments.filter((att) => att.fileType.startsWith('image/')),
    [attachments]
  );

  const asIsAttachment = useMemo(
    () => imageAttachments.find((att) => att.reviewVariant === 'as_is'),
    [imageAttachments]
  );

  const toBeAttachment = useMemo(
    () => imageAttachments.find((att) => att.reviewVariant === 'to_be'),
    [imageAttachments]
  );

  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>(
    asIsAttachment?.id || imageAttachments[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<AttachmentViewMode>('annotate');
  const [canvasState, setCanvasState] = useState<CanvasViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    fitMode: 'fit',
  });

  const annotationOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!imageAttachments.length) return;

    const fallbackId = asIsAttachment?.id || imageAttachments[0].id;
    const selectionStillValid = imageAttachments.some((attachment) => attachment.id === selectedAttachmentId);

    if (!selectionStillValid) {
      setSelectedAttachmentId(fallbackId);
      setCanvasState({ zoom: 1, panX: 0, panY: 0, fitMode: 'fit' });
    }
  }, [imageAttachments, selectedAttachmentId, asIsAttachment]);

  const selectedAttachment = useMemo(
    () => imageAttachments.find((att) => att.id === selectedAttachmentId) || imageAttachments[0],
    [imageAttachments, selectedAttachmentId]
  );

  const currentAnnotations = useMemo(
    () =>
      (annotationThreads || []).filter(
        (annotation) => annotation.attachmentId === selectedAttachment?.id
      ),
    [annotationThreads, selectedAttachment]
  );

  const handleCanvasStateChange = useCallback((updates: Partial<CanvasViewState>) => {
    setCanvasState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAttachmentSelect = useCallback((attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
    setCanvasState({ zoom: 1, panX: 0, panY: 0, fitMode: 'fit' });
  }, []);

  const handleAnnotationSelect = useCallback(
    (annotationId: string) => {
      setViewMode('annotate');
      onAnnotationSelect?.(annotationId);
    },
    [onAnnotationSelect]
  );

  const handleAnnotationMove = useCallback(
    (annotationId: string, payload: AnnotationMovePayload) => {
      onAnnotationMove?.(annotationId, payload);
    },
    [onAnnotationMove]
  );

  // Error state
  if (error && onRetry) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-muted/30">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load attachments</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || 'Unable to load attachments. Please try again.'}
          </AlertDescription>
          <div className="mt-4 flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // No attachments state
  if (!isLoading && attachments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-muted/30">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">No attachments</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              This issue doesn't have any attachments yet. Add screenshots or files to provide more context.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Attachment
          </Button>
        </div>
      </div>
    );
  }

  // No image attachments state (but has other files)
  if (!isLoading && imageAttachments.length === 0 && attachments.length > 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-muted/30">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">No image attachments</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              This issue has {attachments.length} file{attachments.length > 1 ? 's' : ''}, but no images to display. Check the details panel for file attachments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading attachments...</p>
        </div>
      </div>
    );
  }

  const annotateOverlay = currentAnnotations.length ? (
    <AnnotationLayer
      annotations={currentAnnotations}
      overlayRef={annotationOverlayRef}
      activeAnnotationId={activeAnnotationId}
      onSelect={handleAnnotationSelect}
      onMove={handleAnnotationMove}
    />
  ) : null;

  return (
    <div className="relative flex h-full w-full flex-col bg-muted/30">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Design QA</p>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Attachment Canvas</h2>
            {selectedAttachment?.reviewVariant && (
              <Badge variant="secondary" className="uppercase tracking-wide">
                {selectedAttachment.reviewVariant.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Issue {issueId}</p>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as AttachmentViewMode)}>
          <TabsList className="grid h-11 grid-cols-2">
            {VIEW_MODES.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-2 text-sm">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'annotate' && selectedAttachment ? (
            <motion.div
              key="annotate"
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <CenteredCanvasView
                key={selectedAttachment.id}
                attachment={selectedAttachment}
                attachments={imageAttachments}
                canvasState={canvasState}
                onCanvasStateChange={handleCanvasStateChange}
                onAttachmentSelect={handleAttachmentSelect}
                overlayRef={annotationOverlayRef}
                overlayContent={annotateOverlay}
              />

              {imageAttachments.length > 1 && (
                <motion.div
                  className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ImageSelector
                    attachments={imageAttachments}
                    selectedAttachmentId={selectedAttachmentId}
                    onSelect={handleAttachmentSelect}
                    layout="thumbnails"
                  />
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="compare"
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <CompareCanvasView
                asIsAttachment={asIsAttachment || selectedAttachment}
                toBeAttachment={toBeAttachment}
                canvasState={canvasState}
                onCanvasStateChange={handleCanvasStateChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface AnnotationLayerProps {
  annotations: AttachmentAnnotation[];
  overlayRef: React.RefObject<HTMLDivElement | null>;
  activeAnnotationId: string | null;
  onSelect: (annotationId: string) => void;
  onMove: (annotationId: string, position: AnnotationMovePayload) => void;
}

function AnnotationLayer({ annotations, overlayRef, activeAnnotationId, onSelect, onMove }: AnnotationLayerProps) {
  if (!annotations.length) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      {annotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
          overlayRef={overlayRef}
          isActive={annotation.id === activeAnnotationId}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

interface AnnotationPinProps {
  annotation: AttachmentAnnotation;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  onSelect: (annotationId: string) => void;
  onMove: (annotationId: string, position: AnnotationMovePayload) => void;
}

function AnnotationPin({ annotation, overlayRef, isActive, onSelect, onMove }: AnnotationPinProps) {
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onSelect(annotation.id);
    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!(event.currentTarget as HTMLButtonElement).hasPointerCapture(event.pointerId)) {
      return;
    }

    event.preventDefault();
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.min(Math.max(x, 0), 1);
    const clampedY = Math.min(Math.max(y, 0), 1);
    onMove(annotation.id, { x: clampedX, y: clampedY });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if ((event.currentTarget as HTMLButtonElement).hasPointerCapture(event.pointerId)) {
      (event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId);
    }
  };

  return (
    <motion.button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`group absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/90 text-foreground border-border'
      }`}
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
      aria-label={`Annotation ${annotation.label}`}
    >
      {annotation.label}
    </motion.button>
  );
}

interface CompareCanvasViewProps {
  asIsAttachment?: IssueAttachment;
  toBeAttachment?: IssueAttachment;
  canvasState: CanvasViewState;
  onCanvasStateChange: (updates: Partial<CanvasViewState>) => void;
}

function CompareCanvasView({
  asIsAttachment,
  toBeAttachment,
  canvasState,
  onCanvasStateChange,
}: CompareCanvasViewProps) {
  if (!asIsAttachment || !toBeAttachment) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-base font-medium">Add a to-be design to enable compare mode.</p>
        <p className="text-sm">Upload the final mock to visualize deltas side-by-side.</p>
      </div>
    );
  }

  const handleZoomChange = (zoom: number) => {
    onCanvasStateChange({ zoom });
  };

  const handlePanChange = (panOffset: { x: number; y: number }) => {
    onCanvasStateChange({ panX: panOffset.x, panY: panOffset.y });
  };

  const handleFitModeChange = (fitMode: CanvasViewState['fitMode']) => {
    onCanvasStateChange({ fitMode });
  };

  return (
    <div className="relative flex h-full flex-col gap-4 p-4">
      <div className="grid flex-1 gap-4 md:grid-cols-2">
        {[{ label: 'As-Is', attachment: asIsAttachment }, { label: 'To-Be', attachment: toBeAttachment }].map(
          ({ label, attachment }) => (
            <div
              key={attachment.id}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80"
            >
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
                <span
                  className={`h-2 w-2 rounded-full ${label === 'As-Is' ? 'bg-destructive' : 'bg-emerald-500'}`}
                />
                {label}
              </div>
              <ImageCanvas
                key={attachment.id}
                src={attachment.url}
                alt={attachment.fileName}
                zoomLevel={canvasState.zoom}
                panOffset={{ x: canvasState.panX, y: canvasState.panY }}
                fitMode={canvasState.fitMode}
                onZoomChange={handleZoomChange}
                onPanChange={handlePanChange}
              />
            </div>
          )
        )}
      </div>

      <div className="pointer-events-auto self-end">
        <ZoomControls
          zoomLevel={canvasState.zoom}
          fitMode={canvasState.fitMode}
          onZoomIn={() => handleZoomChange(Math.min(canvasState.zoom * 1.5, 5))}
          onZoomOut={() => handleZoomChange(Math.max(canvasState.zoom / 1.5, 0.1))}
          onFitToCanvas={() => handleFitModeChange('fit')}
          onActualSize={() => {
            handleFitModeChange('actual');
            handleZoomChange(1);
          }}
        />
      </div>
    </div>
  );
}
