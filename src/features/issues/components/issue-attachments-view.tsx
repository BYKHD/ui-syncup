'use client';

// ============================================================================
// ISSUE ATTACHMENTS VIEW
// Displays issue attachments with canvas view and image selector
// Pure presentational component
// ============================================================================

import { useState, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, FileText, Upload } from 'lucide-react';
import {CenteredCanvasView} from './centered-canvas-view';
import {ImageSelector} from './image-selector';
import type { IssueAttachment, CanvasViewState } from '@/types/issue';

interface IssueAttachmentsViewProps {
  issueId: string;
  attachments: IssueAttachment[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export default function IssueAttachmentsView({
  issueId,
  attachments,
  isLoading = false,
  error = null,
  onRetry,
}: IssueAttachmentsViewProps) {
  // Filter only image attachments for canvas view
  const imageAttachments = useMemo(
    () => attachments.filter((att) => att.fileType.startsWith('image/')),
    [attachments]
  );

  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>(
    imageAttachments[0]?.id || ''
  );

  // Canvas state management
  const [canvasState, setCanvasState] = useState<CanvasViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    fitMode: 'fit',
  });

  // Update selected attachment when attachments change
  useState(() => {
    if (imageAttachments.length > 0 && !selectedAttachmentId) {
      setSelectedAttachmentId(imageAttachments[0].id);
    }
  });

  const selectedAttachment = useMemo(
    () => imageAttachments.find((att) => att.id === selectedAttachmentId) || imageAttachments[0],
    [imageAttachments, selectedAttachmentId]
  );

  // Handle canvas state updates
  const handleCanvasStateChange = (updates: Partial<CanvasViewState>) => {
    setCanvasState(prev => ({ ...prev, ...updates }));
  };

  // Handle attachment selection
  const handleAttachmentSelect = (attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
    // Reset zoom and pan when switching attachments
    setCanvasState({
      zoom: 1,
      panX: 0,
      panY: 0,
      fitMode: 'fit',
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
          <div className="flex gap-2 mt-4">
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
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-sm">No attachments</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
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
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-sm">No image attachments</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
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
        <div className="text-center space-y-2">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading attachments...</p>
        </div>
      </div>
    );
  }

  // Main view with canvas and image selector
  return (
    <div className="relative h-full w-full bg-muted/30">
      {/* Image selector overlay (when multiple images) */}
      {imageAttachments.length > 1 && (
        <div className="absolute top-4 left-4 z-20">
          <ImageSelector
            attachments={imageAttachments}
            selectedAttachmentId={selectedAttachmentId}
            onSelect={setSelectedAttachmentId}
            layout="thumbnails"
          />
        </div>
      )}

      {/* Canvas view */}
      {selectedAttachment && (
        <CenteredCanvasView
          key={selectedAttachment.id}
          attachment={selectedAttachment}
          attachments={imageAttachments}
          canvasState={canvasState}
          onCanvasStateChange={handleCanvasStateChange}
          onAttachmentSelect={handleAttachmentSelect}
        />
      )}
    </div>
  );
}
