/**
 * Complete Annotation Example with Undo/Redo
 *
 * This is a complete, working example showing how to implement
 * annotations with full undo/redo support.
 *
 * Copy this file to get started quickly!
 */

import React from 'react';

import { useRef } from 'react';
import {
  useAnnotationTools,
  useAnnotationsWithHistory,
  AnnotationToolbar,
  AnnotationLayer,
  AnnotationCanvas,
  type AttachmentAnnotation,
  type AnnotationDraft,
} from '@/features/annotations';

interface CompleteAnnotationExampleProps {
  attachmentId: string;
  imageUrl: string;
  initialAnnotations?: AttachmentAnnotation[];
  currentUser?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  onAnnotationsChange?: (annotations: AttachmentAnnotation[]) => void;
}

export function CompleteAnnotationExample({
  attachmentId,
  imageUrl,
  initialAnnotations = [],
  currentUser = { id: '1', name: 'Current User' },
  onAnnotationsChange,
}: CompleteAnnotationExampleProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // STEP 1: Set up annotations with history
  // ============================================================================
  const {
    annotations,
    handleAnnotationMove,
    handleBoxAnnotationMove,
    handleAnnotationCreate,
    handleAnnotationDelete,
    applyUndo,
    applyRedo,
  } = useAnnotationsWithHistory({
    initialAnnotations,
  });

  // Notify parent when annotations change
  React.useEffect(() => {
    onAnnotationsChange?.(annotations);
  }, [annotations, onAnnotationsChange]);

  // ============================================================================
  // STEP 2: Set up toolbar with undo/redo
  // ============================================================================
  const {
    tools,
    activeTool,
    editModeEnabled,
    canUndo,
    canRedo,
    selectTool,
    toggleEditMode,
    undo,
    redo,
    pushHistory,
    handToolActive,
  } = useAnnotationTools({
    initialTool: 'box',
    initialEditMode: false,
    enableKeyboardShortcuts: true,
    onUndo: applyUndo, // ← Connect undo handler
    onRedo: applyRedo, // ← Connect redo handler
  });

  // ============================================================================
  // STEP 3: Handle new annotation creation
  // ============================================================================
  const handleDraftCommit = (draft: AnnotationDraft, message?: string) => {
    // Generate next label (1, 2, 3, etc.)
    const nextLabel = String(annotations.length + 1);

    // Create new annotation
    const newAnnotation: AttachmentAnnotation = {
      id: draft.id,
      attachmentId,
      label: nextLabel,
      description: message,
      x: draft.shape.type === 'pin' ? draft.shape.position.x : 0.5,
      y: draft.shape.type === 'pin' ? draft.shape.position.y : 0.5,
      shape: draft.shape,
      author: currentUser,
      createdAt: new Date().toISOString(),
      comments: message
        ? [
            {
              id: `comment-${Date.now()}`,
              annotationId: draft.id,
              author: currentUser,
              message,
              createdAt: new Date().toISOString(),
            },
          ]
        : undefined,
    };

    // Add to state with automatic history tracking
    handleAnnotationCreate(newAnnotation);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-muted/30">
      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-20">
        <AnnotationToolbar
          activeTool={activeTool}
          tools={tools}
          editModeEnabled={editModeEnabled}
          canUndo={canUndo} // ← Enables/disables undo button
          canRedo={canRedo} // ← Enables/disables redo button
          onToolChange={selectTool}
          onToggleEditMode={toggleEditMode}
          onUndo={undo} // ← Already wired to Cmd+Z
          onRedo={redo} // ← Already wired to Cmd+Shift+Z
        />
      </div>

      {/* Canvas Container */}
      <div className="relative h-full w-full">
        {/* Image */}
        <div
          ref={overlayRef}
          className="relative h-full w-full flex items-center justify-center"
        >
          <img
            src={imageUrl}
            alt="Annotatable content"
            className="max-h-full max-w-full object-contain"
          />

          {/* Drawing Canvas (for creating new annotations) */}
          <AnnotationCanvas
            overlayRef={overlayRef}
            activeTool={activeTool}
            editModeEnabled={editModeEnabled}
            handToolActive={handToolActive}
            onDraftCommit={handleDraftCommit}
            requireCommentForBox={true}
            requireCommentForPin={false}
          />

          {/* Annotation Layer (shows existing annotations) */}
          <AnnotationLayer
            annotations={annotations}
            overlayRef={overlayRef}
            interactive={editModeEnabled && activeTool === 'cursor'}
            onMove={handleAnnotationMove} // ← Pin moves with history
            onBoxMove={handleBoxAnnotationMove} // ← Box moves/resizes with history
          />
        </div>

        {/* Status Indicator */}
        <div className="absolute bottom-4 right-4 rounded-lg border bg-background/95 px-3 py-2 text-xs backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Annotations:</span>
              <span className="font-semibold">{annotations.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tool:</span>
              <span className="font-semibold capitalize">{activeTool}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-semibold">
                {editModeEnabled ? 'Edit' : 'View'}
              </span>
            </div>
          </div>
        </div>

        {/* Help Text */}
        {!editModeEnabled && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-sm text-muted-foreground">
              Press <kbd className="rounded bg-muted px-2 py-1">E</kbd> to start
              annotating
            </p>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg border bg-background/95 px-4 py-3 text-xs backdrop-blur">
        <div className="font-semibold mb-2">Keyboard Shortcuts</div>
        <div className="space-y-1 text-muted-foreground">
          <div className="flex items-center justify-between gap-8">
            <span>Toggle Edit Mode</span>
            <kbd className="rounded bg-muted px-2 py-1">E</kbd>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span>Cursor Tool</span>
            <kbd className="rounded bg-muted px-2 py-1">1</kbd> or{' '}
            <kbd className="rounded bg-muted px-2 py-1">C</kbd>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span>Pin Tool</span>
            <kbd className="rounded bg-muted px-2 py-1">2</kbd> or{' '}
            <kbd className="rounded bg-muted px-2 py-1">P</kbd>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span>Box Tool</span>
            <kbd className="rounded bg-muted px-2 py-1">3</kbd> or{' '}
            <kbd className="rounded bg-muted px-2 py-1">B</kbd>
          </div>
          <div className="border-t border-border my-2" />
          <div className="flex items-center justify-between gap-8">
            <span>Undo</span>
            <kbd className="rounded bg-muted px-2 py-1">⌘Z</kbd>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span>Redo</span>
            <kbd className="rounded bg-muted px-2 py-1">⇧⌘Z</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example Usage:
 *
 * ```tsx
 * import { CompleteAnnotationExample } from '@/features/annotations/examples/complete-example';
 *
 * function MyPage() {
 *   return (
 *     <CompleteAnnotationExample
 *       attachmentId="attachment-123"
 *       imageUrl="/path/to/image.png"
 *       initialAnnotations={[]}
 *       onAnnotationsChange={(annotations) => {
 *         console.log('Annotations updated:', annotations);
 *         // Save to API, update parent state, etc.
 *       }}
 *     />
 *   );
 * }
 * ```
 */
