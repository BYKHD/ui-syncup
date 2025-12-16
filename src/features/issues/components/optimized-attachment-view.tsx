'use client';

// ============================================================================
// ISSUE ATTACHMENTS VIEW
// Zeplin-style canvas for design QA with annotation + compare modes
// Uses AnnotatedAttachmentView for real API integration
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, RefreshCw, FileText, Upload, PenLine, Columns2 } from 'lucide-react';
import { AnnotatedAttachmentView } from '@/features/annotations';
import { ImageCanvas } from './image-canvas';
import { ZoomControls } from './zoom-controls';
import type { IssueAttachment, CanvasViewState } from '@/features/issues/types';

const VIEW_MODES = [
  { id: 'annotate', label: 'Annotate', icon: PenLine },
  { id: 'compare', label: 'Compare', icon: Columns2 },
] as const;

type AttachmentViewMode = (typeof VIEW_MODES)[number]['id'];

import type { AnnotationPermissions, AttachmentAnnotation } from '@/features/annotations';

interface IssueAttachmentsViewProps {
  issueId: string;
  attachments: IssueAttachment[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /* Project ID for permission checking */
  projectId?: string;
  /** Team ID for permission checking */
  teamId?: string;
  /** Selected Attachment ID (controlled) */
  selectedAttachmentId?: string;
  /** Callback for selecting attachment (controlled) */
  onSelectAttachment?: (id: string) => void;
  /** Permissions override */
  permissions?: Partial<AnnotationPermissions>;
  /** External annotations */
  annotations?: AttachmentAnnotation[];
  /** Active annotation ID for thread panel sync */
  activeAnnotationId?: string | null;
  /** Callback when annotation selection changes */
  onAnnotationSelect?: (annotationId: string | null) => void;
}

export default function IssueAttachmentsView({
  issueId,
  attachments,
  isLoading = false,
  error = null,
  onRetry,
  projectId,
  teamId,
  selectedAttachmentId: controlledSelectedId,
  onSelectAttachment: controlledSetSelectedId,
  permissions,
  annotations,
  activeAnnotationId,
  onAnnotationSelect,
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

  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    asIsAttachment?.id || imageAttachments[0]?.id || ''
  );

  const isControlled = controlledSelectedId !== undefined;
  const selectedAttachmentId = isControlled ? controlledSelectedId : internalSelectedId;
  const setSelectedAttachmentId = isControlled 
    ? (id: string) => controlledSetSelectedId?.(id) 
    : setInternalSelectedId;

  const [viewMode, setViewMode] = useState<AttachmentViewMode>('annotate');
  const [canvasState, setCanvasState] = useState<CanvasViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    fitMode: 'fit',
  });

  // Update selected attachment when attachments change
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

  const handleCanvasStateChange = useCallback((updates: Partial<CanvasViewState>) => {
    setCanvasState((prev) => ({ ...prev, ...updates }));
  }, []);

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

  return (
    <div className="relative flex h-full w-full flex-col bg-muted/30">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Design QA</p>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Attachment Canvas</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
        </div>
      </header>

      <div className="relative flex-1 min-h-0 overflow-hidden">
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
              <AnnotatedAttachmentView
                key={selectedAttachment.id}
                issueId={issueId}
                attachment={selectedAttachment}
                projectId={projectId}
                teamId={teamId}
                canvasState={canvasState}
                onCanvasStateChange={handleCanvasStateChange}
                interactive={true}
                permissions={permissions}
                annotations={permissions?.canView ? annotations : undefined}
                activeAnnotationId={activeAnnotationId}
                onAnnotationSelect={onAnnotationSelect}
              />
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
    <div className="relative flex h-full max-h-full min-h-0 flex-col gap-4 p-4">
      <div className="pointer-events-auto self-end">
        <ZoomControls
          zoomLevel={canvasState.zoom}
          fitMode={canvasState.fitMode}
          onRecenterView={() => onCanvasStateChange({ panX: 0, panY: 0 })}
          onZoomIn={() => handleZoomChange(Math.min(canvasState.zoom * 1.5, 5))}
          onZoomOut={() => handleZoomChange(Math.max(canvasState.zoom / 1.5, 0.1))}
          onFitToCanvas={() => handleFitModeChange('fit')}
          onActualSize={() => {
            handleFitModeChange('actual');
            handleZoomChange(1);
          }}
        />
      </div>
      <div id="compare-canvas-container" className="grid flex-1 min-h-0 gap-4 md:grid-cols-2">
        {[{ label: 'As-Is', attachment: asIsAttachment }, { label: 'To-Be', attachment: toBeAttachment }].map(
          ({ label, attachment }) => (
            <div
              key={attachment.id}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-canvas h-full"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, var(--color-canvas-dotted) 1px, transparent 0)",
                backgroundSize: "16px 16px",
              }}
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
    </div>
  );
}
