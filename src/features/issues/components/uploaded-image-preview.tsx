"use client";

import { useState } from "react";
import { RiCloseLine, RiPushpinLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnnotatedAttachmentView, type AttachmentAnnotation } from "@/features/annotations";
import { UploadProgressOverlay } from "./upload-progress-overlay";
import type { CanvasViewState, IssueAttachment } from "@/features/issues/types";

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
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string | null) => void;
  className?: string;
  progress?: number;
  isUploading?: boolean;
}

/**
 * UploadedImagePreview Component
 * 
 * Preview component for uploaded images in the issue creation dialog.
 * Uses AnnotatedAttachmentView in local mode for architectural consistency.
 * 
 * - as-is variant: Full annotation support (pin, box) with local state
 * - to-be variant: Simple image preview without annotations
 */
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
  const [imageLoaded, setImageLoaded] = useState(false);

  // Canvas state for zoom and pan
  const [canvasState, setCanvasState] = useState<CanvasViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    fitMode: "fit",
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAsIs = variant === "as-is";

  // Create a mock attachment object for AnnotatedAttachmentView
  const mockAttachment: IssueAttachment = {
    id: 'preview',
    issueId: 'draft',
    fileName: image.file.name,
    fileSize: image.file.size,
    fileType: image.file.type,
    url: image.preview,
    width: image.width,
    height: image.height,
    uploadedBy: { id: 'current_user', name: 'You', email: '', image: null },
    createdAt: new Date().toISOString(),
  };

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
          /* As-Is Image with Annotation Support using AnnotatedAttachmentView in local mode */
          <AnnotatedAttachmentView
            attachment={mockAttachment}
            canvasState={canvasState}
            onCanvasStateChange={(updates) =>
              setCanvasState((prev) => ({ ...prev, ...updates }))
            }
            interactive={true}
            activeAnnotationId={activeAnnotationId}
            onAnnotationSelect={onAnnotationSelect}
            // Local mode props - bypasses API, uses local state
            localMode={true}
            localAnnotations={annotations}
            onLocalAnnotationsChange={onAnnotationsChange}
            // Grant all permissions for local editing
            permissions={{
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              canDeleteAll: true,
            }}
          />
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
    </div>
  );
}
