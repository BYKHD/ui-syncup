/**
 * ANNOTATION SAVE FEATURE - USAGE EXAMPLE
 *
 * This file demonstrates how to use the annotation save feature
 * in your components. It's a reference implementation showing best practices.
 */

'use client';

import { useState } from 'react';
import { useAnnotationSave } from '@/features/annotations';
import type { AnnotationShape, AttachmentAnnotation } from '@/features/annotations';

export function AnnotationSaveExample() {
  const [annotations, setAnnotations] = useState<AttachmentAnnotation[]>([]);

  // ============================================================================
  // BASIC USAGE
  // ============================================================================
  const { saveState, saveAnnotationPosition, createNewAnnotation, isSaving } = useAnnotationSave({
    onSaveSuccess: (annotation) => {
      console.log('✅ Saved:', annotation);
      // Update local state with saved annotation
      setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? annotation : a)
      );
    },
    onSaveError: (error) => {
      console.error('❌ Error:', error.message);
      // Handle error (already shown in indicator)
    },
  });

  // ============================================================================
  // WITH TOAST NOTIFICATIONS
  // ============================================================================
  const withToasts = useAnnotationSave({
    enableToasts: true,        // Shows "Annotation saved" / error toasts
    autoResetDelay: 3000,      // Reset to idle after 3 seconds
    onSaveSuccess: (annotation) => {
      setAnnotations(prev => [...prev, annotation]);
    },
  });

  // ============================================================================
  // EXAMPLE: Save position after drag
  // ============================================================================
  const handleAnnotationDragComplete = async (
    annotationId: string,
    finalShape: AnnotationShape
  ) => {
    await saveAnnotationPosition({
      issueId: 'iss_123',
      attachmentId: 'att_456',
      annotationId,
      shape: finalShape,
    });
  };

  // ============================================================================
  // EXAMPLE: Create new annotation
  // ============================================================================
  const handleCreateAnnotation = async (
    shape: AnnotationShape,
    description?: string
  ) => {
    const nextLabel = String(annotations.length + 1);

    await createNewAnnotation({
      issueId: 'iss_123',
      attachmentId: 'att_456',
      shape,
      label: nextLabel,
      description,
    });
  };

  // ============================================================================
  // EXAMPLE: Using save state in UI
  // ============================================================================
  return (
    <div className="space-y-4">
      {/* Save State Indicator */}
      <div className="rounded-md border p-4">
        <h3 className="font-semibold mb-2">Save Status</h3>
        <div className="flex items-center gap-2">
          {saveState.status === 'idle' && (
            <span className="text-muted-foreground">Ready</span>
          )}
          {saveState.status === 'saving' && (
            <span className="text-blue-600">Saving...</span>
          )}
          {saveState.status === 'success' && (
            <span className="text-green-600">Saved ✓</span>
          )}
          {saveState.status === 'error' && (
            <span className="text-red-600">Error: {saveState.error}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleCreateAnnotation({
            type: 'pin',
            position: { x: 0.5, y: 0.5 }
          })}
          disabled={isSaving}
          className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        >
          Create Pin Annotation
        </button>

        <button
          onClick={() => handleAnnotationDragComplete(
            'ann_1',
            { type: 'pin', position: { x: 0.3, y: 0.7 } }
          )}
          disabled={isSaving}
          className="px-4 py-2 bg-secondary text-white rounded disabled:opacity-50"
        >
          Move Annotation
        </button>
      </div>

      {/* Annotations List */}
      <div className="rounded-md border p-4">
        <h3 className="font-semibold mb-2">Annotations ({annotations.length})</h3>
        <ul className="space-y-1">
          {annotations.map(ann => (
            <li key={ann.id} className="text-sm">
              {ann.label}: {ann.shape?.type || 'pin'} at (
              {ann.x.toFixed(2)}, {ann.y.toFixed(2)})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// ADVANCED: Optimistic Updates
// ============================================================================
export function OptimisticAnnotationSave() {
  const [annotations, setAnnotations] = useState<AttachmentAnnotation[]>([]);
  const [tempAnnotations, setTempAnnotations] = useState<AttachmentAnnotation[]>([]);

  const { saveAnnotationPosition } = useAnnotationSave({
    onSaveSuccess: (annotation) => {
      // Replace temp annotation with saved one
      setTempAnnotations(prev => prev.filter(a => a.id !== annotation.id));
      setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? annotation : a)
      );
    },
    onSaveError: (error) => {
      // Rollback: remove temp annotation
      setTempAnnotations(prev => prev.filter(a => a.id !== tempAnnotations[0]?.id));
      console.error('Failed to save, rolled back:', error);
    },
  });

  const handleDragComplete = async (
    annotationId: string,
    finalShape: AnnotationShape
  ) => {
    // Optimistic update: show immediately
    const optimisticAnnotation: AttachmentAnnotation = {
      id: annotationId,
      attachmentId: 'att_456',
      label: '1',
      x: finalShape.type === 'pin' ? finalShape.position.x : 0.5,
      y: finalShape.type === 'pin' ? finalShape.position.y : 0.5,
      shape: finalShape,
      author: { id: 'user_1', name: 'You' },
      createdAt: new Date().toISOString(),
    };

    setTempAnnotations([optimisticAnnotation]);

    // Save in background
    await saveAnnotationPosition({
      issueId: 'iss_123',
      attachmentId: 'att_456',
      annotationId,
      shape: finalShape,
    });
  };

  // Merge real + temp annotations for display
  const displayAnnotations = [...annotations, ...tempAnnotations];

  return (
    <div>
      <p>Total: {displayAnnotations.length} annotations</p>
      <p className="text-sm text-muted-foreground">
        ({tempAnnotations.length} pending save)
      </p>
    </div>
  );
}

// ============================================================================
// INTEGRATION WITH REAL COMPONENT
// ============================================================================
export function IntegratedExample() {
  /**
   * In your actual component (optimized-attachment-view.tsx),
   * the save hook is integrated like this:
   */

  // 1. Initialize save hook
  const { saveState, saveAnnotationPosition, createNewAnnotation } = useAnnotationSave({
    onSaveSuccess: (annotation) => {
      console.log('Saved:', annotation);
    },
    onSaveError: (error) => {
      console.error('Error:', error);
    },
  });

  // 2. Use in draft commit
  /*
  const { commitDraft } = useAnnotationDrafts({
    onCommit: async (draft, message) => {
      await createNewAnnotation({
        issueId,
        attachmentId: selectedAttachment.id,
        shape: draft.shape,
        label: nextLabel,
        description: message,
      });
    },
  });
  */

  // 3. Use in move complete
  /*
  const handleAnnotationMoveComplete = async (annotationId, finalPosition) => {
    if (hasChanged && selectedAttachment) {
      await saveAnnotationPosition({
        issueId,
        attachmentId: selectedAttachment.id,
        annotationId,
        shape: finalShape,
      });
    }
  };
  */

  // 4. Pass state to canvas view
  /*
  <CenteredCanvasView
    {...props}
    saveStatus={saveState.status}
    saveError={saveState.error}
  />
  */

  return (
    <div className="text-sm text-muted-foreground">
      See optimized-attachment-view.tsx for full integration
    </div>
  );
}

// ============================================================================
// ERROR HANDLING PATTERNS
// ============================================================================
export function ErrorHandlingExample() {
  const { saveAnnotationPosition, saveState } = useAnnotationSave({
    enableToasts: true,
    onSaveError: (error) => {
      // Pattern 1: Retry logic
      if (error.message.includes('Network error')) {
        console.log('Network error, will retry...');
        // Implement exponential backoff retry
      }

      // Pattern 2: Rollback UI
      if (error.message.includes('Validation error')) {
        console.log('Invalid data, reverting changes');
        // Revert annotation to previous position
      }

      // Pattern 3: Log to monitoring service
      // logError({ context: 'annotation_save', error });
    },
  });

  return (
    <div>
      {saveState.status === 'error' && (
        <div className="rounded-md bg-red-50 p-4 text-sm">
          <p className="font-semibold">Failed to save annotation</p>
          <p className="text-red-600">{saveState.error}</p>
          <button
            className="mt-2 text-red-700 underline"
            onClick={() => {/* Retry logic */}}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
