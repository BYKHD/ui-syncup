"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiCloseLine, RiPushpinLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AnnotationCanvas,
  AnnotationLayer,
  AnnotationToolbar,
  AnnotationCommentInput,
  useAnnotationTools,
  useAnnotationEditState,
  createHistoryEntry,
  createSnapshot,
  type AnnotationDraft,
  type AttachmentAnnotation,
} from "@/features/annotations";
import { ImageCanvas } from "./image-canvas";
import { ZoomControls } from "./zoom-controls";
import type { CanvasViewState } from "@/features/issues/types";

interface ImageMetadata {
  file: File;
  preview: string;
  width: number;
  height: number;
}

import { UploadProgressOverlay } from "./upload-progress-overlay";

interface UploadedImagePreviewProps {
  variant: "as-is" | "to-be";
  image: ImageMetadata;
  annotations?: AttachmentAnnotation[];
  onAnnotationsChange?: (annotations: AttachmentAnnotation[]) => void;
  onRemove: () => void;
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string | null) => void;
  className?: string;
  progress?: number;
  isUploading?: boolean;
}

export function UploadedImagePreview({
  variant,
  image,
  annotations = [],
  onAnnotationsChange,
  onRemove,
  activeAnnotationId,
  onAnnotationSelect,
  className,
  progress = 0,
  isUploading = false,
}: UploadedImagePreviewProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [nextAnnotationLabel, setNextAnnotationLabel] = useState("A");

  // Edit dialog state management
  const { editState, openEdit, closeEdit, submitEdit } = useAnnotationEditState();

  // Canvas state for zoom and pan (only for as-is variant)
  const [canvasState, setCanvasState] = useState<CanvasViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    fitMode: "fit",
  });

  // Annotation system hooks (only for as-is variant)
  const {
    tools,
    activeTool,
    selectTool,
    editModeEnabled,
    toggleEditMode,
    handToolActive,
    canUndo,
    canRedo,
    undo,
    redo,
    pushHistory,
  } = useAnnotationTools({
    activeAnnotationId,
    onUndo: (entry) => {
      if (!onAnnotationsChange) return;
      const updated = annotations.map((a) =>
        a.id === entry.annotationId && entry.previousSnapshot
          ? { ...a, shape: entry.previousSnapshot.shape }
          : a
      );
      onAnnotationsChange(updated);
    },
    onRedo: (entry) => {
      if (!onAnnotationsChange) return;
      const updated = annotations.map((a) =>
        a.id === entry.annotationId
          ? { ...a, shape: entry.snapshot.shape }
          : a
      );
      onAnnotationsChange(updated);
    },
    onEdit: (annotationId: string) => {
      openEdit(annotationId, annotations, overlayRef);
    },
    onDelete: (annotationId: string) => {
      if (!onAnnotationsChange) return;

      // Remove the annotation
      const filtered = annotations.filter((a) => a.id !== annotationId);

      // Re-sequence labels to maintain sequential numbering (1, 2, 3...)
      const resequenced = filtered.map((annotation, index) => ({
        ...annotation,
        label: String(index + 1),
      }));

      onAnnotationsChange(resequenced);

      // Clear active annotation if it was deleted
      if (activeAnnotationId === annotationId) {
        onAnnotationSelect?.(null);
      }
    },
  });


  // Delete annotation handler with label re-sequencing
  const handleAnnotationDelete = useCallback(
    (annotationId: string) => {
      if (!onAnnotationsChange) return;

      // Remove the annotation
      const filtered = annotations.filter((a) => a.id !== annotationId);

      // Re-sequence labels to maintain sequential numbering (1, 2, 3...)
      const resequenced = filtered.map((annotation, index) => ({
        ...annotation,
        label: String(index + 1),
      }));

      onAnnotationsChange(resequenced);

      // Clear active annotation if it was deleted
      if (activeAnnotationId === annotationId) {
        onAnnotationSelect?.(null);
      }
    },
    [annotations, onAnnotationsChange, activeAnnotationId, onAnnotationSelect]
  );

  // Generate next annotation label (numeric sequence)
  useEffect(() => {
    if (annotations.length === 0) {
      setNextAnnotationLabel("1");
    } else {
      const lastLabel = annotations[annotations.length - 1].label;
      const currentNumber = parseInt(lastLabel, 10);
      if (!isNaN(currentNumber)) {
        setNextAnnotationLabel(String(currentNumber + 1));
      } else {
        // Fallback if label is not a number
        setNextAnnotationLabel(String(annotations.length + 1));
      }
    }
  }, [annotations.length]);

  const handleDraftCommit = useCallback(
    (draft: AnnotationDraft, message?: string) => {
      if (!onAnnotationsChange) return;

      const annotationId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const newAnnotation: AttachmentAnnotation = {
        id: annotationId,
        attachmentId: "temp", // Will be assigned when issue is created
        label: nextAnnotationLabel,
        description: message || "",
        x: draft.shape.type === "pin" ? draft.shape.position.x : 0,
        y: draft.shape.type === "pin" ? draft.shape.position.y : 0,
        author: {
          id: "current_user", // Will be filled by parent
          name: "You",
          email: "user@example.com",
        },
        createdAt: new Date().toISOString(),
        comments: message
          ? [
              {
                id: `comment_${Date.now()}`,
                annotationId: annotationId,
                message: message,
                author: {
                  id: "current_user",
                  name: "You",
                  email: "user@example.com",
                },
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
        shape: draft.shape,
      };

      onAnnotationsChange([...annotations, newAnnotation]);
    },
    [annotations, onAnnotationsChange, nextAnnotationLabel]
  );

  const handleAnnotationMove = useCallback(
    (annotationId: string, coords: { x: number; y: number }) => {
      if (!onAnnotationsChange) return;

      const updated = annotations.map((a) =>
        a.id === annotationId
          ? {
              ...a,
              x: coords.x,
              y: coords.y,
              shape: { type: "pin" as const, position: { x: coords.x, y: coords.y } },
            }
          : a
      );
      onAnnotationsChange(updated);
    },
    [annotations, onAnnotationsChange]
  );

  const handleAnnotationMoveComplete = useCallback(
    (annotationId: string, coords: { x: number; y: number }) => {
      const annotation = annotations.find((a) => a.id === annotationId);
      if (annotation && annotation.shape) {
        const previousSnapshot = createSnapshot(annotationId, annotation.shape);
        const newSnapshot = createSnapshot(annotationId, {
          type: "pin",
          position: coords,
        });
        const entry = createHistoryEntry("move", annotationId, newSnapshot, previousSnapshot);
        pushHistory(entry);
      }
    },
    [annotations, pushHistory]
  );

  const handleBoxAnnotationMove = useCallback(
    (
      annotationId: string,
      start: { x: number; y: number },
      end: { x: number; y: number }
    ) => {
      if (!onAnnotationsChange) return;

      const updated = annotations.map((a) =>
        a.id === annotationId
          ? {
              ...a,
              shape: { type: "box" as const, start, end },
              x: (start.x + end.x) / 2,
              y: (start.y + end.y) / 2,
            }
          : a
      );
      onAnnotationsChange(updated);
    },
    [annotations, onAnnotationsChange]
  );

  const handleBoxAnnotationMoveComplete = useCallback(
    (
      annotationId: string,
      start: { x: number; y: number },
      end: { x: number; y: number }
    ) => {
      const annotation = annotations.find((a) => a.id === annotationId);
      if (annotation && annotation.shape) {
        const previousSnapshot = createSnapshot(annotationId, annotation.shape);
        const newSnapshot = createSnapshot(annotationId, {
          type: "box",
          start,
          end,
        });
        const entry = createHistoryEntry("resize", annotationId, newSnapshot, previousSnapshot);
        pushHistory(entry);
      }
    },
    [annotations, pushHistory]
  );

  const handleAnnotationSelect = useCallback(
    (annotationId: string) => {
      onAnnotationSelect?.(annotationId);
    },
    [onAnnotationSelect]
  );

  // Edit annotation handler for AnnotationLayer
  const handleAnnotationEdit = useCallback(
    (annotationId: string) => {
      openEdit(annotationId, annotations, overlayRef);
    },
    [openEdit, annotations, overlayRef]
  );

  // Handle edit submit
  const handleEditSubmit = useCallback(
    (newDescription: string) => {
      if (!onAnnotationsChange) return;
      submitEdit(newDescription, (annotationId, updates) => {
        const updated = annotations.map((a) =>
          a.id === annotationId
            ? { ...a, ...updates }
            : a
        );
        onAnnotationsChange(updated);
      });
    },
    [submitEdit, annotations, onAnnotationsChange]
  );


  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAsIs = variant === "as-is";

  return (
    <div className={cn("space-y-0 h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-6 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">
              {isAsIs ? "As-Is Image" : "To-Be Image"}
            </h4>
            {isAsIs && annotations.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <RiPushpinLine className="size-3" aria-hidden="true" />
                {annotations.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate" title={image.file.name}>
            {image.file.name} • {formatFileSize(image.file.size)} • {image.width} × {image.height}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="shrink-0"
          aria-label={`Remove ${variant} image`}
          disabled={isUploading}
        >
          <RiCloseLine className="size-4" />
        </Button>
      </div>

      <div className="relative flex-1 min-h-0 bg-muted/30">
        <UploadProgressOverlay 
          isVisible={isUploading} 
          progress={progress} 
          className="z-50"
        />
        <div
          className={cn(
            "relative w-full h-full overflow-hidden",
            isAsIs ? "" : "rounded-lg border min-h-[150px] sm:min-h-[200px]"
          )}
        >
        {isAsIs ? (
          <>
            {/* Zoom Controls - Top Right */}
            {imageLoaded && (
              <div className="absolute top-4 right-4 z-30">
                <ZoomControls
                  zoomLevel={canvasState.zoom}
                  fitMode={canvasState.fitMode}
                  onRecenterView={() =>
                    setCanvasState((prev) => ({ ...prev, panX: 0, panY: 0 }))
                  }
                  onZoomIn={() =>
                    setCanvasState((prev) => ({
                      ...prev,
                      zoom: Math.min(prev.zoom * 1.5, 5),
                    }))
                  }
                  onZoomOut={() =>
                    setCanvasState((prev) => ({
                      ...prev,
                      zoom: Math.max(prev.zoom / 1.5, 0.1),
                    }))
                  }
                  onFitToCanvas={() =>
                    setCanvasState((prev) => ({ ...prev, fitMode: "fit", zoom: 1 }))
                  }
                  onActualSize={() =>
                    setCanvasState({ zoom: 1, panX: 0, panY: 0, fitMode: "actual" })
                  }
                />
              </div>
            )}

            {/* Annotation Toolbar - Bottom */}
            {imageLoaded && (
              <div className="absolute inset-x-0 bottom-6 z-20 flex flex-col items-start gap-3 px-4 w-full">
                <AnnotationToolbar
                  tools={tools}
                  activeTool={activeTool}
                  onToolChange={selectTool}
                  editModeEnabled={editModeEnabled}
                  onToggleEditMode={toggleEditMode}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undo}
                  onRedo={redo}
                />
              </div>
            )}

            {/* Image Canvas with Zoom & Pan */}
            <div className="relative w-full h-full">
              <ImageCanvas
                src={image.preview}
                alt="As-is preview"
                zoomLevel={canvasState.zoom}
                panOffset={{ x: canvasState.panX, y: canvasState.panY }}
                fitMode={canvasState.fitMode}
                onZoomChange={(zoom) =>
                  setCanvasState((prev) => ({ ...prev, zoom }))
                }
                onPanChange={(pan) =>
                  setCanvasState((prev) => ({ ...prev, panX: pan.x, panY: pan.y }))
                }
                onImageLoad={() => setImageLoaded(true)}
                overlayRef={overlayRef}
                overlayContent={
                  <>
                    {/* Existing Annotations Layer */}
                    <AnnotationLayer
                      annotations={annotations}
                      overlayRef={overlayRef}
                      activeAnnotationId={activeAnnotationId}
                      interactive={editModeEnabled && !handToolActive}
                      handToolActive={handToolActive}
                      onSelect={handleAnnotationSelect}
                      onMove={handleAnnotationMove}
                      onBoxMove={handleBoxAnnotationMove}
                      onMoveComplete={handleAnnotationMoveComplete}
                      onBoxMoveComplete={handleBoxAnnotationMoveComplete}
                      onEdit={handleAnnotationEdit}
                      onDelete={handleAnnotationDelete}
                    />

                    {/* Annotation Canvas for Creating New Annotations */}
                    {editModeEnabled && activeTool !== "cursor" && (
                      <AnnotationCanvas
                        overlayRef={overlayRef}
                        activeTool={activeTool}
                        editModeEnabled={editModeEnabled}
                        onDraftCommit={handleDraftCommit}
                        handToolActive={handToolActive}
                        requireCommentForPin={true}
                        requireCommentForBox={true}
                      />
                    )}
                  </>
                }
                pointerPanEnabled={!editModeEnabled || handToolActive}
                scrollPanEnabled={true}
              />
            </div>
          </>
        ) : (
          /* Simple To-Be Image Preview */
          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
            <img
              src={image.preview}
              alt="To-be preview"
              className="w-full h-full max-w-full max-h-full object-contain rounded"
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="w-full h-32 flex items-center justify-center text-sm text-muted-foreground">
                Loading image...
              </div>
            )}
          </div>
        )}
      </div>
      </div>

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
    </div>
  );
}
