"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiCloseLine, RiPushpinLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AnnotationCanvas,
  AnnotationLayer,
  AnnotationToolbar,
  useAnnotationTools,
  createHistoryEntry,
  createSnapshot,
  type AnnotationDraft,
  type AttachmentAnnotation,
} from "@/features/annotations";

interface ImageMetadata {
  file: File;
  preview: string;
  width: number;
  height: number;
}

interface UploadedImagePreviewProps {
  variant: "as-is" | "to-be";
  image: ImageMetadata;
  annotations?: AttachmentAnnotation[];
  onAnnotationsChange?: (annotations: AttachmentAnnotation[]) => void;
  onRemove: () => void;
  className?: string;
}

export function UploadedImagePreview({
  variant,
  image,
  annotations = [],
  onAnnotationsChange,
  onRemove,
  className,
}: UploadedImagePreviewProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [nextAnnotationLabel, setNextAnnotationLabel] = useState("A");

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
  });

  // Generate next annotation label
  useEffect(() => {
    if (annotations.length === 0) {
      setNextAnnotationLabel("A");
    } else {
      const lastLabel = annotations[annotations.length - 1].label;
      const nextCode = lastLabel.charCodeAt(0) + 1;
      // Cycle A-Z, then start with numbers
      if (nextCode > 90) {
        setNextAnnotationLabel("1");
      } else {
        setNextAnnotationLabel(String.fromCharCode(nextCode));
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAsIs = variant === "as-is";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
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
        >
          <RiCloseLine className="size-4" />
        </Button>
      </div>

      {/* Image Preview with Annotation (as-is) or Simple Preview (to-be) */}
      <div
        className={cn(
          "relative rounded-lg border bg-muted/30 overflow-hidden",
          isAsIs ? "min-h-[300px] sm:min-h-[400px]" : "min-h-[150px] sm:min-h-[200px]"
        )}
      >
        {isAsIs ? (
          <>
            {/* Annotation Toolbar */}
            {imageLoaded && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
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

            {/* Image Container with Annotation Layers */}
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
              <div className="relative max-w-full max-h-[400px] sm:max-h-[600px]">
                {/* Base Image */}
                <img
                  src={image.preview}
                  alt="As-is preview"
                  className="max-w-full max-h-[400px] sm:max-h-[600px] w-auto h-auto object-contain"
                  onLoad={() => setImageLoaded(true)}
                  style={{ display: imageLoaded ? "block" : "none" }}
                />

                {/* Loading placeholder */}
                {!imageLoaded && (
                  <div className="w-full h-64 flex items-center justify-center text-sm text-muted-foreground">
                    Loading image...
                  </div>
                )}

                {/* Annotation Overlay */}
                {imageLoaded && (
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 pointer-events-none"
                  >
                    {/* Existing Annotations Layer */}
                    <div className="absolute inset-0 pointer-events-auto">
                      <AnnotationLayer
                        annotations={annotations}
                        overlayRef={overlayRef}
                        activeAnnotationId={null}
                        interactive={editModeEnabled && !handToolActive}
                        onSelect={() => {}}
                        onMove={handleAnnotationMove}
                        onMoveComplete={handleAnnotationMoveComplete}
                      />
                    </div>

                    {/* Annotation Canvas for Creating New Annotations */}
                    <div className="absolute inset-0 pointer-events-auto">
                      <AnnotationCanvas
                        overlayRef={overlayRef}
                        activeTool={activeTool}
                        editModeEnabled={editModeEnabled}
                        onDraftCommit={handleDraftCommit}
                        handToolActive={handToolActive}
                        requireCommentForPin={false}
                        requireCommentForBox={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Simple To-Be Image Preview */
          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
            <img
              src={image.preview}
              alt="To-be preview"
              className="max-w-full max-h-[200px] sm:max-h-[300px] w-auto h-auto object-contain rounded"
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

      {/* Annotation Instructions for as-is */}
      {isAsIs && imageLoaded && (
        <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded p-3">
          <p className="font-medium">💡 Annotation Tips:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Click the <strong>Pin</strong> or <strong>Box</strong> tool to start annotating</li>
            <li>Click on the image to place a pin, or drag to create a box</li>
            <li>You can move annotations after creation</li>
            <li>Use keyboard shortcuts: <kbd className="px-1 py-0.5 bg-background rounded text-xs">1</kbd> Cursor, <kbd className="px-1 py-0.5 bg-background rounded text-xs">2</kbd> Pin, <kbd className="px-1 py-0.5 bg-background rounded text-xs">3</kbd> Box</li>
          </ul>
        </div>
      )}
    </div>
  );
}
