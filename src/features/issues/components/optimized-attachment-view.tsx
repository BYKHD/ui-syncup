'use client';

// ============================================================================
// ISSUE ATTACHMENTS VIEW
// Zeplin-style canvas for design QA with annotation + compare modes
// Uses AnnotatedAttachmentView for real API integration
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, RefreshCw, FileText, Upload, PenLine, Columns2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnnotatedAttachmentView } from '@/features/annotations';
import { InfiniteCanvasBackground } from './infinite-canvas-background';
import { ZoomControls } from './zoom-controls';
import { UploadProgressOverlay } from './upload-progress-overlay';
import { uploadAttachment } from '@/features/issues/api/upload-attachment';
import { useElasticScroll } from '../hooks/use-elastic-scroll';
import type { IssueAttachment, CanvasViewState, AttachmentReviewVariant } from '@/features/issues/types';

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
  /** Callback when upload completes successfully */
  onUploadComplete?: (attachment: IssueAttachment) => void;
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
  onUploadComplete,
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

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadVariant, setUploadVariant] = useState<AttachmentReviewVariant>('as_is');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Trigger file input for upload
  const triggerUpload = useCallback((variant: AttachmentReviewVariant) => {
    setUploadVariant(variant);
    fileInputRef.current?.click();
  }, []);

  // Handle file selection and upload
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input for repeated uploads of same file
    event.target.value = '';

    // Validate image type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get image dimensions
      const dimensions = await getImageDimensions(file);
      
      const attachment = await uploadAttachment({
        issueId,
        file,
        reviewVariant: uploadVariant,
        width: dimensions.width,
        height: dimensions.height,
        onProgress: (progress) => setUploadProgress(progress),
      });

      toast.success(`${uploadVariant === 'as_is' ? 'As-Is' : 'To-Be'} image uploaded`);
      onUploadComplete?.(attachment);
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [issueId, uploadVariant, onUploadComplete]);

  // Helper to get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
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
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => triggerUpload('as_is')}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload As-Is
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => triggerUpload('to_be')}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload To-Be
            </Button>
          </div>
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
      {/* Upload Progress Overlay */}
      <UploadProgressOverlay 
        isVisible={isUploading} 
        progress={uploadProgress} 
        className="z-50"
      />
      
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
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
                onUpload={triggerUpload}
                isUploading={isUploading}
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
  onUpload?: (variant: AttachmentReviewVariant) => void;
  isUploading?: boolean;
}

function CompareCanvasView({
  asIsAttachment,
  toBeAttachment,
  canvasState,
  onCanvasStateChange,
  onUpload,
  isUploading = false,
}: CompareCanvasViewProps) {
  // Show upload prompt when missing one or both images
  if (!asIsAttachment || !toBeAttachment) {
    const missingAsIs = !asIsAttachment;
    const missingToBe = !toBeAttachment;
    
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground p-6">
        <div className="space-y-2">
          <p className="text-base font-medium">
            {missingAsIs && missingToBe 
              ? 'Add both As-Is and To-Be designs to enable compare mode.'
              : missingToBe 
                ? 'Add a To-Be design to enable compare mode.'
                : 'Add an As-Is design to enable compare mode.'}
          </p>
          <p className="text-sm">Compare current implementation against the final mock side-by-side.</p>
        </div>
        {onUpload && (
          <div className="flex gap-2">
            {missingAsIs && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => onUpload('as_is')}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload As-Is
              </Button>
            )}
            {missingToBe && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => onUpload('to_be')}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload To-Be
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  const handleZoomChange = (zoom: number) => {
    onCanvasStateChange({ zoom });
  };

  const handlePanChange = (panOffset: { x: number; y: number }) => {
    onCanvasStateChange({ panX: panOffset.x, panY: panOffset.y });
  };

  // Compute button disabled states for compare mode
  const isActualSize = Math.abs(canvasState.zoom - 1) < 0.001;
  const isFitted = canvasState.panX === 0 && canvasState.panY === 0 && Math.abs(canvasState.zoom - 1) < 0.001;

  // Motion values for smooth animation during drag
  const visualPanX = useMotionValue(canvasState.panX);
  const visualPanY = useMotionValue(canvasState.panY);
  
  // Track raw pan during drag
  const rawPanRef = useRef({ x: canvasState.panX, y: canvasState.panY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Elastic scroll hook - use a reasonable estimate for content size
  const contentSize = useMemo(() => ({
    width: containerSize.width * canvasState.zoom,
    height: containerSize.height * canvasState.zoom,
  }), [containerSize, canvasState.zoom]);

  const { applyRubberBand, isOverscrolled, getClampedPosition } = useElasticScroll({
    containerSize,
    contentSize,
    enabled: true,
  });

  // Sync motion values with state when not dragging
  useEffect(() => {
    if (!isDragging) {
      visualPanX.set(canvasState.panX);
      visualPanY.set(canvasState.panY);
      rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
    }
  }, [canvasState.panX, canvasState.panY, isDragging, visualPanX, visualPanY]);

  // Mouse handlers for pan
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    setIsDragging(true);
    rawPanRef.current = { x: canvasState.panX, y: canvasState.panY };
    setDragStart({
      x: event.clientX - canvasState.panX,
      y: event.clientY - canvasState.panY,
    });
    event.preventDefault();
  }, [canvasState.panX, canvasState.panY]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    const rawX = event.clientX - dragStart.x;
    const rawY = event.clientY - dragStart.y;
    rawPanRef.current = { x: rawX, y: rawY };
    const visual = applyRubberBand(rawX, rawY);
    visualPanX.set(visual.x);
    visualPanY.set(visual.y);
  }, [isDragging, dragStart, applyRubberBand, visualPanX, visualPanY]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (isOverscrolled(rawPanRef.current.x, rawPanRef.current.y)) {
      const clamped = getClampedPosition(rawPanRef.current.x, rawPanRef.current.y);
      animate(visualPanX, clamped.x, { type: 'spring', stiffness: 300, damping: 30 });
      animate(visualPanY, clamped.y, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        onComplete: () => onCanvasStateChange({ panX: clamped.x, panY: clamped.y }),
      });
    } else {
      onCanvasStateChange({ panX: rawPanRef.current.x, panY: rawPanRef.current.y });
    }
  }, [isDragging, isOverscrolled, getClampedPosition, visualPanX, visualPanY, onCanvasStateChange]);

  // Wheel zoom handler
  const handleWheel = useCallback((event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, canvasState.zoom * zoomFactor));
      onCanvasStateChange({ zoom: newZoom });
    }
  }, [canvasState.zoom, onCanvasStateChange]);

  // Event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="relative flex h-full max-h-full min-h-0 flex-col gap-4 p-4">
      <div className="pointer-events-auto self-end">
        <ZoomControls
          zoomLevel={canvasState.zoom}
          isFitted={isFitted}
          isActualSize={isActualSize}
          onRecenterView={() => onCanvasStateChange({ panX: 0, panY: 0 })}
          onZoomIn={() => handleZoomChange(Math.min(canvasState.zoom * 1.5, 5))}
          onZoomOut={() => handleZoomChange(Math.max(canvasState.zoom / 1.5, 0.1))}
          onFitToCanvas={() => {
            handleZoomChange(1);
            handlePanChange({ x: 0, y: 0 });
          }}
          onActualSize={() => {
            handleZoomChange(1);
          }}
        />
      </div>
      <div 
        ref={containerRef}
        id="compare-canvas-container" 
        className="grid flex-1 min-h-0 gap-4 md:grid-cols-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        {[{ label: 'As-Is', attachment: asIsAttachment }, { label: 'To-Be', attachment: toBeAttachment }].map(
          ({ label, attachment }) => (
            <div
              key={attachment.id}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-canvas h-full"
            >
              {/* Infinite canvas background with motion values */}
              <InfiniteCanvasBackground
                panX={visualPanX}
                panY={visualPanY}
                zoom={canvasState.zoom}
              />
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
                <span
                  className={`h-2 w-2 rounded-full ${label === 'As-Is' ? 'bg-destructive' : 'bg-emerald-500'}`}
                />
                {label}
              </div>
              {/* Image with motion transform */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center will-change-transform"
                style={{
                  x: visualPanX,
                  y: visualPanY,
                }}
              >
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="max-w-none pointer-events-none"
                  style={{
                    transform: `scale(${canvasState.zoom})`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
              </motion.div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
