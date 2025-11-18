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
import { AlertCircle, RefreshCw, FileText, Upload, PenLine, Columns2 } from 'lucide-react';
import {
  AnnotationLayer,
  AnnotationToolbar,
  AnnotationCanvas,
  AnnotationCommentInput,
  useAnnotationTools,
  useAnnotationDrafts,
  useAnnotationSave,
  useAnnotationEditState,
  draftToAnnotation,
  createHistoryEntry,
  createSnapshot,
} from '@/features/annotations';
import type { AttachmentAnnotation, AnnotationPosition, AnnotationHistoryEntry } from '@/features/annotations';
import { CenteredCanvasView } from './centered-canvas-view';
import { ImageCanvas } from './image-canvas';
import { ZoomControls } from './zoom-controls';
import type { IssueAttachment, CanvasViewState } from '@/features/issues/types';

const VIEW_MODES = [
  { id: 'annotate', label: 'Annotate', icon: PenLine },
  { id: 'compare', label: 'Compare', icon: Columns2 },
] as const;

type AttachmentViewMode = (typeof VIEW_MODES)[number]['id'];

interface IssueAttachmentsViewProps {
  issueId: string;
  attachments: IssueAttachment[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  annotationThreads?: AttachmentAnnotation[];
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string | null) => void;
  onAnnotationMove?: (annotationId: string, position: AnnotationPosition) => void;
  onBoxAnnotationMove?: (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => void;
  onAnnotationEdit?: (annotationId: string) => void;
  onAnnotationUpdate?: (annotationId: string, updates: Partial<AttachmentAnnotation>) => void;
  onAnnotationDelete?: (annotationId: string) => void;
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
  onBoxAnnotationMove,
  onAnnotationEdit,
  onAnnotationUpdate,
  onAnnotationDelete,
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
  const annotationSurfaceRef = useRef<HTMLDivElement | null>(null);

  // Track drag state to only create history on completion (not during drag)
  const annotationDragState = useRef<{
    annotationId: string;
    initialShape: import('@/features/annotations').AnnotationShape;
    isDragging: boolean;
  } | null>(null);

  // Edit dialog state management
  const { editState, openEdit, closeEdit, submitEdit } = useAnnotationEditState();

  // Handler for undo operations
  const handleAnnotationUndo = useCallback((entry: AnnotationHistoryEntry) => {
    const { action, annotationId, previousSnapshot } = entry;

    console.log('🔙 Undo:', action, annotationId);

    // For now, just log - you need to wire this to your actual annotation state
    // In a real implementation, you'd update the annotations via onAnnotationMove or similar
    if (action === 'create') {
      console.log('→ Would remove annotation:', annotationId);
      // TODO: Call parent's onAnnotationDelete or similar
    } else if ((action === 'move' || action === 'resize') && previousSnapshot) {
      console.log('→ Would restore previous shape:', previousSnapshot.shape);
      // TODO: Call onAnnotationMove or onBoxAnnotationMove with previous position
      if (previousSnapshot.shape.type === 'pin') {
        onAnnotationMove?.(annotationId, previousSnapshot.shape.position);
      } else if (previousSnapshot.shape.type === 'box') {
        onBoxAnnotationMove?.(annotationId, previousSnapshot.shape.start, previousSnapshot.shape.end);
      }
    }
  }, [onAnnotationMove, onBoxAnnotationMove]);

  // Handler for redo operations
  const handleAnnotationRedo = useCallback((entry: AnnotationHistoryEntry) => {
    const { action, annotationId, snapshot } = entry;

    console.log('🔜 Redo:', action, annotationId);

    if ((action === 'move' || action === 'resize') && snapshot) {
      console.log('→ Would restore new shape:', snapshot.shape);
      // TODO: Call onAnnotationMove or onBoxAnnotationMove with new position
      if (snapshot.shape.type === 'pin') {
        onAnnotationMove?.(annotationId, snapshot.shape.position);
      } else if (snapshot.shape.type === 'box') {
        onBoxAnnotationMove?.(annotationId, snapshot.shape.start, snapshot.shape.end);
      }
    }
  }, [onAnnotationMove, onBoxAnnotationMove]);

  const {
    tools: annotationToolbarTools,
    activeTool: activeAnnotationTool,
    editModeEnabled: annotationEditModeEnabled,
    canUndo: annotationCanUndo,
    canRedo: annotationCanRedo,
    selectTool: selectAnnotationTool,
    toggleEditMode: toggleAnnotationEditMode,
    undo: undoAnnotationHistory,
    redo: redoAnnotationHistory,
    pushHistory: pushAnnotationHistory,
    handToolActive,
  } = useAnnotationTools({
    initialTool: 'cursor',
    initialEditMode: false,
    onUndo: handleAnnotationUndo,
    onRedo: handleAnnotationRedo,
    onEdit: (annotationId: string) => {
      openEdit(annotationId, annotationThreads, annotationOverlayRef);
      onAnnotationEdit?.(annotationId);
    },
    onDelete: (annotationId: string) => {
      onAnnotationDelete?.(annotationId);
    },
  });

  // Edit submission handler
  const handleEditSubmit = useCallback(
    (newDescription: string) => {
      if (!onAnnotationUpdate) return;
      submitEdit(newDescription, onAnnotationUpdate);
    },
    [submitEdit, onAnnotationUpdate]
  );

  // Edit annotation handler for AnnotationLayer
  const handleAnnotationEdit = useCallback(
    (annotationId: string) => {
      openEdit(annotationId, annotationThreads, annotationOverlayRef);
      onAnnotationEdit?.(annotationId);
    },
    [openEdit, annotationThreads, annotationOverlayRef, onAnnotationEdit]
  );

  // Reset to cursor tool when edit mode is enabled
  useEffect(() => {
    if (annotationEditModeEnabled) {
      selectAnnotationTool('cursor');
    }
  }, [annotationEditModeEnabled, selectAnnotationTool]);

  useEffect(() => {
    if (
      viewMode !== 'annotate' ||
      activeAnnotationTool !== 'cursor' ||
      !onAnnotationSelect ||
      !activeAnnotationId
    ) {
      return;
    }

    const interactionNode = annotationSurfaceRef.current;
    if (!interactionNode) return;

    const handleBackgroundPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !interactionNode.contains(target)) {
        return;
      }

      if (target instanceof HTMLElement) {
        if (
          target.closest('[data-annotation-pin]') ||
          target.closest('[data-annotation-box]') ||
          target.closest('[data-annotation-comment-input]')
        ) {
          return;
        }
      }

      onAnnotationSelect(null);
    };

    interactionNode.addEventListener('pointerdown', handleBackgroundPointerDown);
    return () => {
      interactionNode.removeEventListener('pointerdown', handleBackgroundPointerDown);
    };
  }, [viewMode, activeAnnotationTool, onAnnotationSelect, activeAnnotationId]);

  // Save state management for annotation persistence
  const { saveState, saveAnnotationPosition: saveAnnotationAPI, createNewAnnotation, isSaving } = useAnnotationSave({
    onSaveSuccess: (annotation) => {
      console.info('✅ Annotation saved successfully:', annotation);
      // TODO: Update local annotation state or refetch from parent
    },
    onSaveError: (error) => {
      console.error('❌ Failed to save annotation:', error);
      // Error state is already tracked in saveState, will show in indicator
    },
  });

  // Draft management for new annotations
  const { createDraft, updateDraft, commitDraft, cancelDraft } = useAnnotationDrafts({
    onCommit: async (draft, message) => {
      // Generate incremental numeric label (1, 2, 3, etc.)
      const nextLabel = String(currentAnnotations.length + 1);

      console.info('📝 Creating new annotation:', {
        draft,
        message,
        label: nextLabel,
        attachmentId: selectedAttachment?.id,
      });

      // Record in history
      recordAnnotationHistory('create', draft.id, draft.shape);

      // Save to mock API
      if (selectedAttachment) {
        await createNewAnnotation({
          issueId,
          attachmentId: selectedAttachment.id,
          shape: draft.shape,
          label: nextLabel,
          description: message,
        });
      }
    },
  });
  const isAnnotationView = viewMode === 'annotate';
  const isAnnotationInteractive = annotationEditModeEnabled && isAnnotationView;
  const pointerPanEnabled = !isAnnotationView || !annotationEditModeEnabled || handToolActive;
  const scrollPanEnabled = isAnnotationView;

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
  const recordAnnotationHistory = useCallback(
    (action: 'create' | 'move' | 'resize' | 'delete', annotationId: string, shape?: any) => {
      // Simplified history tracking - for demo purposes only
      // In a real implementation, you should track actual snapshots
      if (!shape) return;

      pushAnnotationHistory({
        id: `${action}_${annotationId}_${Date.now()}`,
        action,
        timestamp: Date.now(),
        annotationId,
        snapshot: {
          id: annotationId,
          shape,
        },
      });
    },
    [pushAnnotationHistory]
  );

  const handleCanvasStateChange = useCallback((updates: Partial<CanvasViewState>) => {
    setCanvasState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAnnotationSelect = useCallback(
    (annotationId: string | null) => {
      setViewMode('annotate');
      // Note: Select isn't tracked in history - only create/move/resize/delete
      onAnnotationSelect?.(annotationId);
    },
    [onAnnotationSelect]
  );

  const handleAnnotationMove = useCallback(
    (annotationId: string, payload: AnnotationPosition) => {
      // Track initial state on first move of a NEW drag operation
      if (!annotationDragState.current) {
        // Read the most current annotation state from annotationThreads
        // Use annotationThreads directly to avoid stale closure over currentAnnotations
        const annotation = (annotationThreads || [])
          .filter(ann => ann.attachmentId === selectedAttachment?.id)
          .find(ann => ann.id === annotationId);

        if (annotation && annotationEditModeEnabled) {
          const initialShape = annotation.shape || { type: 'pin' as const, position: { x: annotation.x, y: annotation.y } };
          annotationDragState.current = {
            annotationId,
            initialShape: { ...initialShape },
            isDragging: true,
          };
        }
      }

      // Always apply the move immediately (for smooth dragging)
      onAnnotationMove?.(annotationId, payload);
    },
    [annotationThreads, selectedAttachment?.id, annotationEditModeEnabled, onAnnotationMove]
  );

  // Callback when pin drag completes
  const handleAnnotationMoveComplete = useCallback(
    async (annotationId: string, finalPosition: AnnotationPosition) => {
      if (!annotationDragState.current || !annotationEditModeEnabled) return;

      const { initialShape } = annotationDragState.current;
      const finalShape: import('@/features/annotations').AnnotationShape = { type: 'pin', position: finalPosition };

      // Only create history if position actually changed
      const hasChanged = JSON.stringify(initialShape) !== JSON.stringify(finalShape);
      if (hasChanged) {
        const previousSnapshot = createSnapshot(annotationId, initialShape);
        const newSnapshot = createSnapshot(annotationId, finalShape);
        const historyEntry = createHistoryEntry('move', annotationId, newSnapshot, previousSnapshot);
        pushAnnotationHistory(historyEntry);

        // Save to API
        if (selectedAttachment) {
          await saveAnnotationAPI({
            issueId,
            attachmentId: selectedAttachment.id,
            annotationId,
            shape: finalShape,
          });
        }
      }

      // Clear drag state
      annotationDragState.current = null;
    },
    [annotationEditModeEnabled, pushAnnotationHistory, selectedAttachment, issueId, saveAnnotationAPI]
  );

  // Handler for box annotation movements (move/resize)
  const handleBoxAnnotationMove = useCallback(
    (annotationId: string, start: AnnotationPosition, end: AnnotationPosition) => {
      // Track initial state on first move of a NEW drag operation
      if (!annotationDragState.current) {
        // Read the most current annotation state from annotationThreads
        // Use annotationThreads directly to avoid stale closure over currentAnnotations
        const annotation = (annotationThreads || [])
          .filter(ann => ann.attachmentId === selectedAttachment?.id)
          .find(ann => ann.id === annotationId);

        if (annotation && annotationEditModeEnabled) {
          const initialShape = annotation.shape || { type: 'box' as const, start, end };
          annotationDragState.current = {
            annotationId,
            initialShape: { ...initialShape },
            isDragging: true,
          };
        }
      }

      // Always apply the move/resize immediately (for smooth dragging)
      if (onBoxAnnotationMove) {
        onBoxAnnotationMove(annotationId, start, end);
      } else {
        // Fallback: use center point for legacy handlers
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        onAnnotationMove?.(annotationId, { x: centerX, y: centerY });
      }
    },
    [annotationThreads, selectedAttachment?.id, annotationEditModeEnabled, onAnnotationMove, onBoxAnnotationMove]
  );

  // Callback when box drag/resize completes
  const handleBoxAnnotationMoveComplete = useCallback(
    async (annotationId: string, finalStart: AnnotationPosition, finalEnd: AnnotationPosition) => {
      if (!annotationDragState.current || !annotationEditModeEnabled) return;

      const { initialShape } = annotationDragState.current;
      const finalShape: import('@/features/annotations').AnnotationShape = { type: 'box', start: finalStart, end: finalEnd };

      // Only create history if position actually changed
      const hasChanged = JSON.stringify(initialShape) !== JSON.stringify(finalShape);
      if (hasChanged) {
        const previousSnapshot = createSnapshot(annotationId, initialShape);
        const newSnapshot = createSnapshot(annotationId, finalShape);
        const historyEntry = createHistoryEntry('resize', annotationId, newSnapshot, previousSnapshot);
        pushAnnotationHistory(historyEntry);

        // Save to API
        if (selectedAttachment) {
          await saveAnnotationAPI({
            issueId,
            attachmentId: selectedAttachment.id,
            annotationId,
            shape: finalShape,
          });
        }
      }

      // Clear drag state
      annotationDragState.current = null;
    },
    [annotationEditModeEnabled, pushAnnotationHistory, selectedAttachment, issueId, saveAnnotationAPI]
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

  const annotateOverlay =
    currentAnnotations.length || isAnnotationInteractive ? (
      <>
        {currentAnnotations.length > 0 && (
          <AnnotationLayer
            annotations={currentAnnotations}
            overlayRef={annotationOverlayRef}
            activeAnnotationId={activeAnnotationId}
            interactive={isAnnotationInteractive}
            onSelect={handleAnnotationSelect}
            onMove={handleAnnotationMove}
            onBoxMove={handleBoxAnnotationMove}
            onMoveComplete={handleAnnotationMoveComplete}
            onBoxMoveComplete={handleBoxAnnotationMoveComplete}
            onEdit={handleAnnotationEdit}
            onDelete={onAnnotationDelete}
          />
        )}
        {isAnnotationInteractive && (
          <AnnotationCanvas
            overlayRef={annotationOverlayRef}
            activeTool={activeAnnotationTool}
            editModeEnabled={annotationEditModeEnabled}
            handToolActive={handToolActive}
            onDraftCreate={createDraft}
            onDraftUpdate={updateDraft}
            onDraftCommit={commitDraft}
            onDraftCancel={cancelDraft}
            requireCommentForPin={true}
            requireCommentForBox={true}
          />
        )}
        {/* Edit Annotation Popover */}
        {editState.showEditDialog && editState.editingAnnotation && editState.editPopoverPosition && (
          <AnnotationCommentInput
            position={editState.editPopoverPosition}
            defaultValue={editState.editingAnnotation.description}
            title={`Edit Annotation ${editState.editingAnnotation.label}`}
            placeholder="Update annotation description..."
            onSubmit={handleEditSubmit}
            onCancel={closeEdit}
            autoFocus
          />
        )}
      </>
    ) : null;

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
        {viewMode === 'annotate' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-start gap-3 px-4">
            <AnnotationToolbar
              className="pointer-events-auto"
              activeTool={activeAnnotationTool}
              tools={annotationToolbarTools}
              editModeEnabled={annotationEditModeEnabled}
              canUndo={annotationCanUndo}
              canRedo={annotationCanRedo}
              onToolChange={selectAnnotationTool}
              onToggleEditMode={(next) => toggleAnnotationEditMode(next)}
              onUndo={undoAnnotationHistory}
              onRedo={redoAnnotationHistory}
            />
          </div>
        )}
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
                canvasState={canvasState}
                onCanvasStateChange={handleCanvasStateChange}
                overlayRef={annotationOverlayRef}
                interactionLayerRef={annotationSurfaceRef}
                overlayContent={annotateOverlay}
                pointerPanEnabled={pointerPanEnabled}
                scrollPanEnabled={scrollPanEnabled}
                saveStatus={saveState.status}
                saveError={saveState.error}
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
