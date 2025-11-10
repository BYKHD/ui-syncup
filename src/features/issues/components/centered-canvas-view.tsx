"use client";

import { useState } from "react";
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
}

export function CenteredCanvasView({
  attachment,
  attachments,
  canvasState,
  onCanvasStateChange,
  onAttachmentSelect
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

  const handleDownload = async () => {
    try {
      // Check if the file exists first
      const response = await fetch(attachment.url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`File not found: ${response.status}`);
      }
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      // You could show a toast notification here
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Main canvas area - takes up most of the space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Layered canvas structure for future annotation support */}
        <div className="absolute inset-0">
          {attachment.fileType.startsWith('video/') ? (
            /* Video player */
            <VideoPlayer
              src={attachment.url}
              alt={attachment.fileName}
              mimeType={attachment.fileType}
              onVideoLoad={setImageDimensions}
            />
          ) : (
            /* Image canvas with zoom/pan */
            <>
              <ImageCanvas
                src={attachment.url}
                alt={attachment.fileName}
                zoomLevel={canvasState.zoom}
                panOffset={{ x: canvasState.panX, y: canvasState.panY }}
                fitMode={canvasState.fitMode}
                onZoomChange={handleZoomChange}
                onPanChange={handlePanChange}
                onImageLoad={setImageDimensions}
              />
              
              {/* Interaction layer placeholder for future annotations */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Future annotation layer will go here */}
              </div>
            </>
          )}
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

      {/* Image selector for multiple attachments */}
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
      {attachment.fileType.startsWith('image/') && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-md px-3 py-1.5 text-xs text-muted-foreground border flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span>📝 Annotations coming soon</span>
          </div>
        </div>
      )}
    </div>
  );
}