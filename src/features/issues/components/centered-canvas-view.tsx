"use client";

import { useState, type ReactNode, type RefObject } from "react";
import type { IssueAttachment, CanvasViewState } from "@/types/issue";
import { ImageCanvas } from "./image-canvas";
import { VideoPlayer } from "./video-player";
import { ZoomControls } from "./zoom-controls";
import { ImageSelector } from "./image-selector";

interface CenteredCanvasViewProps {
  attachment?: IssueAttachment;
  attachments: IssueAttachment[];
  canvasState: CanvasViewState;
  onCanvasStateChange: (updates: Partial<CanvasViewState>) => void;
  onAttachmentSelect: (attachmentId: string) => void;
  overlayContent?: ReactNode;
  overlayRef?: RefObject<HTMLDivElement | null>;
}

export function CenteredCanvasView({
  attachment,
  attachments,
  canvasState,
  onCanvasStateChange,
  onAttachmentSelect,
  overlayContent,
  overlayRef
}: CenteredCanvasViewProps) {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | undefined>();

  if (!attachment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No attachment selected</p>
          <p className="text-sm">Select an attachment to view</p>
        </div>
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
    <div className="relative h-full w-full flex flex-col">
      {/* Main canvas area - takes up most of the space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Layered canvas structure for future annotation support */}
        <div className="absolute inset-0">
          {/* Background pattern */}
          <div
            className="absolute inset-0 z-0 opacity-70"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, var(--color-canvas-dotted) 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
            aria-hidden="true"
          />

          <div className="absolute inset-0 z-10">
            {attachment.fileType.startsWith('video/') ? (
              <VideoPlayer
                src={attachment.url}
                alt={attachment.fileName}
                mimeType={attachment.fileType}
                onVideoLoad={setImageDimensions}
              />
            ) : (
              <ImageCanvas
                src={attachment.url}
                alt={attachment.fileName}
                zoomLevel={canvasState.zoom}
                panOffset={{ x: canvasState.panX, y: canvasState.panY }}
                fitMode={canvasState.fitMode}
                onZoomChange={handleZoomChange}
                onPanChange={handlePanChange}
                onImageLoad={setImageDimensions}
                overlayRef={overlayRef}
                overlayContent={overlayContent}
              />
            )}
          </div>
        </div>

        {/* Zoom controls overlay - only for images */}
        {attachment.fileType.startsWith('image/') && (
          <div className="absolute top-4 right-4 z-20">
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
        )}

       
      </div>

      {/* Image selector pinned to canvas footer */}
      {attachments.length > 1 && (
        <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ImageSelector
            attachments={attachments}
            selectedAttachmentId={attachment.id}
            onSelect={onAttachmentSelect}
            layout="thumbnails"
          />
        </div>
      )}

      {/* Future annotation support indicator - only for images */}
      {attachment.fileType.startsWith('image/') && overlayContent && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-md px-3 py-1.5 text-xs text-muted-foreground border flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Drag pins to reposition annotations</span>
          </div>
        </div>
      )}
    </div>
  );
}
