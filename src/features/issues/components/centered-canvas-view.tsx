"use client";

import { useState } from "react";
import type { IssueAttachment, CanvasViewState } from "@/src/types/issue";
import { ImageCanvas } from "./image-canvas";
import { VideoPlayer } from "./video-player";
import { ZoomControls } from "./zoom-controls";
import { FileInfoBar } from "./file-info-bar";
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

  const handleZoomChange = (zoomLevel: number) => {
    onCanvasStateChange({ zoomLevel });
  };

  const handlePanChange = (panOffset: { x: number; y: number }) => {
    onCanvasStateChange({ panOffset });
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
      link.download = attachment.filename;
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
          {attachment.kind === 'video' ? (
            /* Video player */
            <VideoPlayer
              src={attachment.url}
              alt={attachment.filename}
              mimeType={attachment.mimeType}
              onVideoLoad={setImageDimensions}
            />
          ) : (
            /* Image canvas with zoom/pan */
            <>
              <ImageCanvas
                src={attachment.url}
                alt={attachment.filename}
                zoomLevel={canvasState.zoomLevel}
                panOffset={canvasState.panOffset}
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
        {attachment.kind === 'image' && (
          <div className="absolute top-4 right-4 z-20">
            <ZoomControls
              zoomLevel={canvasState.zoomLevel}
              fitMode={canvasState.fitMode}
              onZoomIn={() => handleZoomChange(Math.min(canvasState.zoomLevel * 1.5, 5))}
              onZoomOut={() => handleZoomChange(Math.max(canvasState.zoomLevel / 1.5, 0.1))}
              onFitToCanvas={() => handleFitModeChange('fit')}
              onActualSize={() => {
                handleFitModeChange('actual');
                handleZoomChange(1);
              }}
            />
          </div>
        )}

        {/* File info bar overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <FileInfoBar
            filename={attachment.filename}
            mimeType={attachment.mimeType}
            size={attachment.size}
            imageDimensions={imageDimensions}
            url={attachment.url}
            onDownload={handleDownload}
          />
        </div>
      </div>

      {/* Image selector for multiple attachments */}
      {attachments.length > 1 && (
        <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ImageSelector
            attachments={attachments}
            selectedId={canvasState.selectedAttachmentId}
            onSelect={onAttachmentSelect}
            layout="thumbnails"
          />
        </div>
      )}

      {/* Future annotation support indicator - only for images */}
      {attachment.kind === 'image' && (
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