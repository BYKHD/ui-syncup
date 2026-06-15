'use client';

/**
 * AnnotatedAttachmentView Component
 *
 * Wrapper component that integrates CenteredCanvasView with real annotation
 * API endpoints. Uses useAnnotationIntegration for CRUD operations and
 * useAnnotationPermissions for role-based UI control.
 *
 * Requirements: 1.1, 2.2, 8.1, 8.5
 *
 * @module features/annotations/components/annotated-attachment-view
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { IssueAttachment, CanvasViewState } from '@/features/issues/types';
import type { AttachmentAnnotation, AnnotationShape, AnnotationToolId, AnnotationSaveStatus, AnnotationPermissions } from '../types';
import { CenteredCanvasView } from '@/features/issues/components/centered-canvas-view';
import { AnnotationLayer } from './annotation-layer';
import { AnnotationCanvas } from './annotation-canvas';
import { AnnotationToolbar } from './annotation-toolbar';
import { AnnotationCommentInput } from './annotation-comment-input';
import { useAnnotationIntegration } from '../hooks/use-annotation-integration';
import { useAnnotationPermissions } from '../hooks/use-annotation-permissions';
import { useAnnotationDrafts } from '../hooks/use-annotation-drafts';
import { useAnnotationEditState } from '../hooks/use-annotation-edit-state';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';

// ============================================================================
// TYPES
// ============================================================================

export interface AnnotatedAttachmentViewProps {
  /** Issue ID for API calls (not required in local mode) */
  issueId?: string;
  /** Attachment to display */
  attachment: IssueAttachment;
  /** Project ID for permission checking */
  projectId?: string;
  /** Team ID for permission checking */
  teamId?: string;
  /**
   * When true, force annotation UI into read-only mode regardless of role.
   * Set by the parent when the project is archived (see features/projects
   * wiki — archived projects are a frozen historical record).
   */
  isArchived?: boolean;
  /** Canvas state from parent (for sync with compare mode) */
  canvasState?: CanvasViewState;
  /** Callback when canvas state changes */
  onCanvasStateChange?: (updates: Partial<CanvasViewState>) => void;
  /** Whether the attachment viewer is in interactive annotation mode */
  interactive?: boolean;
  /** Currently active annotation ID */
  activeAnnotationId?: string | null;
  /** Callback when annotation selection changes */
  onAnnotationSelect?: (annotationId: string | null) => void;
  /** Optional permissions override (skips internal check) */
  permissions?: Partial<AnnotationPermissions>;
  /** External annotations override (for API mode) */
  annotations?: AttachmentAnnotation[];
  
  // ============================================================================
  // LOCAL MODE PROPS (for draft/preview without API persistence)
  // ============================================================================
  
  /** Enable local mode - bypasses API fetch/save, uses local state */
  localMode?: boolean;
  /** Local annotations (controlled state) */
  localAnnotations?: AttachmentAnnotation[];
  /** Callback when local annotations change */
  onLocalAnnotationsChange?: (annotations: AttachmentAnnotation[]) => void;
}

// ============================================================================
// DEFAULT CANVAS STATE
// ============================================================================

const DEFAULT_CANVAS_STATE: CanvasViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  fitMode: 'fit',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AnnotatedAttachmentView combines CenteredCanvasView with annotation
 * capabilities, wired to real API endpoints.
 *
 * Features:
 * - Full CRUD operations via useAnnotationIntegration
 * - Permission-aware toolbar showing/hiding
 * - Optimistic updates with rollback
 * - Draft annotation creation with comment input
 * - Edit popover for updating annotation descriptions
 */
export function AnnotatedAttachmentView({
  issueId,
  attachment,
  projectId,
  teamId,
  isArchived,
  canvasState: externalCanvasState,
  onCanvasStateChange: externalOnCanvasStateChange,
  interactive = true,
  activeAnnotationId: externalActiveAnnotationId,
  onAnnotationSelect: externalOnAnnotationSelect,
  permissions: propPermissions,
  annotations: propAnnotations,
  // Local mode props
  localMode = false,
  localAnnotations = [],
  onLocalAnnotationsChange,
}: AnnotatedAttachmentViewProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  // Internal canvas state (used when not controlled by parent)
  const [internalCanvasState, setInternalCanvasState] = useState<CanvasViewState>(DEFAULT_CANVAS_STATE);
  const canvasState = externalCanvasState ?? internalCanvasState;
  const handleCanvasStateChange = useCallback(
    (updates: Partial<CanvasViewState>) => {
      if (externalOnCanvasStateChange) {
        externalOnCanvasStateChange(updates);
      } else {
        setInternalCanvasState((prev) => ({ ...prev, ...updates }));
      }
    },
    [externalOnCanvasStateChange]
  );

  // Internal active annotation (used when not controlled by parent)
  const [internalActiveAnnotationId, setInternalActiveAnnotationId] = useState<string | null>(null);
  const activeAnnotationId = externalActiveAnnotationId ?? internalActiveAnnotationId;
  const handleAnnotationSelect = useCallback(
    (annotationId: string | null) => {
      if (externalOnAnnotationSelect) {
        externalOnAnnotationSelect(annotationId);
      } else {
        setInternalActiveAnnotationId(annotationId);
      }
    },
    [externalOnAnnotationSelect]
  );

  // Refs for overlay positioning
  const annotationOverlayRef = useRef<HTMLDivElement | null>(null);
  const annotationSurfaceRef = useRef<HTMLDivElement | null>(null);

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  const { permissions: hookPermissions, isLoading: permissionsLoading, userId } = useAnnotationPermissions({
    projectId,
    teamId,
    isArchived,
  });

  const permissions = useMemo(() => ({
    ...hookPermissions,
    ...propPermissions,
  }), [hookPermissions, propPermissions]);

  // ============================================================================
  // ANNOTATION INTEGRATION (skipped in local mode)
  // ============================================================================

  const {
    annotations: apiAnnotations,
    isLoading: annotationsLoading,
    isSaving,
    activeTool: apiActiveTool,
    editModeEnabled: apiEditModeEnabled,
    canUndo: apiCanUndo,
    canRedo: apiCanRedo,
    handToolActive: apiHandToolActive,
    showShortcutsHelp: apiShowShortcutsHelp,
    createAnnotation: apiCreateAnnotation,
    handleAnnotationMove: apiHandleAnnotationMove,
    handleBoxAnnotationMove: apiHandleBoxAnnotationMove,
    deleteAnnotation: apiDeleteAnnotation,
    selectTool: apiSelectTool,
    toggleEditMode: apiToggleEditMode,
    undo: apiUndo,
    redo: apiRedo,
    setShowShortcutsHelp: apiSetShowShortcutsHelp,
    setDragging: apiSetDragging,
    refetch: _refetch,
  } = useAnnotationIntegration({
    issueId: issueId || '',
    attachmentId: attachment.id,
    enabled: !localMode && interactive && permissions.canView && !!issueId,
  });

  // ============================================================================
  // LOCAL MODE STATE (when localMode is true)
  // ============================================================================

  const [localActiveTool, setLocalActiveTool] = useState<AnnotationToolId>('cursor');
  const [localEditModeEnabled, setLocalEditModeEnabled] = useState(false);
  const [localHistory, setLocalHistory] = useState<{ past: AttachmentAnnotation[][]; future: AttachmentAnnotation[][] }>({ past: [], future: [] });
  const [localShowShortcutsHelp, setLocalShowShortcutsHelp] = useState(false);

  // Local mode tool selection
  const selectTool = localMode ? setLocalActiveTool : apiSelectTool;
  const activeTool = localMode ? localActiveTool : apiActiveTool;
  const editModeEnabled = localMode ? localEditModeEnabled : apiEditModeEnabled;
  const toggleEditMode = localMode ? () => setLocalEditModeEnabled(prev => !prev) : apiToggleEditMode;
  const handToolActive = localMode ? (localActiveTool === 'cursor' && !localEditModeEnabled) : apiHandToolActive;
  const showShortcutsHelp = localMode ? localShowShortcutsHelp : apiShowShortcutsHelp;
  const setShowShortcutsHelp = localMode ? setLocalShowShortcutsHelp : apiSetShowShortcutsHelp;

  // Local mode undo/redo
  const canUndo = localMode ? localHistory.past.length > 0 : apiCanUndo;
  const canRedo = localMode ? localHistory.future.length > 0 : apiCanRedo;
  
  const localUndo = useCallback(() => {
    if (localHistory.past.length === 0 || !onLocalAnnotationsChange) return;
    const prev = localHistory.past[localHistory.past.length - 1];
    setLocalHistory(h => ({
      past: h.past.slice(0, -1),
      future: [localAnnotations, ...h.future],
    }));
    onLocalAnnotationsChange(prev);
  }, [localHistory, localAnnotations, onLocalAnnotationsChange]);

  const localRedo = useCallback(() => {
    if (localHistory.future.length === 0 || !onLocalAnnotationsChange) return;
    const next = localHistory.future[0];
    setLocalHistory(h => ({
      past: [...h.past, localAnnotations],
      future: h.future.slice(1),
    }));
    onLocalAnnotationsChange(next);
  }, [localHistory, localAnnotations, onLocalAnnotationsChange]);

  const undo = localMode ? localUndo : apiUndo;
  const redo = localMode ? localRedo : apiRedo;

  // Local annotation helpers
  const pushLocalHistory = useCallback(() => {
    if (!onLocalAnnotationsChange) return;
    setLocalHistory(h => ({
      past: [...h.past.slice(-19), localAnnotations],
      future: [],
    }));
  }, [localAnnotations, onLocalAnnotationsChange]);

  // Local mode annotation operations
  const localCreateAnnotation = useCallback((shape: AnnotationShape, message?: string) => {
    if (!onLocalAnnotationsChange) return;
    pushLocalHistory();
    const nextLabel = String(localAnnotations.length + 1);
    const newAnnotation: AttachmentAnnotation = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      attachmentId: attachment.id,
      label: nextLabel,
      description: message || '',
      x: shape.type === 'pin' ? shape.position.x : (shape.start.x + shape.end.x) / 2,
      y: shape.type === 'pin' ? shape.position.y : (shape.start.y + shape.end.y) / 2,
      author: { id: 'current_user', name: 'You', email: '' },
      createdAt: new Date().toISOString(),
      shape,
      comments: message ? [{
        id: `comment_${Date.now()}`,
        annotationId: '',
        message,
        author: { id: 'current_user', name: 'You', email: '' },
        createdAt: new Date().toISOString(),
      }] : [],
    };
    onLocalAnnotationsChange([...localAnnotations, newAnnotation]);
  }, [localAnnotations, onLocalAnnotationsChange, pushLocalHistory, attachment.id]);

  const localHandleAnnotationMove = useCallback((annotationId: string, coords: { x: number; y: number }) => {
    if (!onLocalAnnotationsChange) return;
    pushLocalHistory();
    const updated = localAnnotations.map(a =>
      a.id === annotationId
        ? { ...a, x: coords.x, y: coords.y, shape: { type: 'pin' as const, position: coords } }
        : a
    );
    onLocalAnnotationsChange(updated);
  }, [localAnnotations, onLocalAnnotationsChange, pushLocalHistory]);

  const localHandleBoxAnnotationMove = useCallback((annotationId: string, start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!onLocalAnnotationsChange) return;
    pushLocalHistory();
    const updated = localAnnotations.map(a =>
      a.id === annotationId
        ? { ...a, shape: { type: 'box' as const, start, end }, x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
        : a
    );
    onLocalAnnotationsChange(updated);
  }, [localAnnotations, onLocalAnnotationsChange, pushLocalHistory]);

  const localDeleteAnnotation = useCallback((annotationId: string) => {
    if (!onLocalAnnotationsChange) return;
    pushLocalHistory();
    const filtered = localAnnotations.filter(a => a.id !== annotationId);
    // Re-sequence labels
    const resequenced = filtered.map((a, i) => ({ ...a, label: String(i + 1) }));
    onLocalAnnotationsChange(resequenced);
  }, [localAnnotations, onLocalAnnotationsChange, pushLocalHistory]);

  // Choose API or local handlers
  const createAnnotation = localMode ? localCreateAnnotation : apiCreateAnnotation;
  const handleAnnotationMove = localMode ? localHandleAnnotationMove : apiHandleAnnotationMove;
  const handleBoxAnnotationMove = localMode ? localHandleBoxAnnotationMove : apiHandleBoxAnnotationMove;
  const deleteAnnotation = localMode ? localDeleteAnnotation : apiDeleteAnnotation;

  // Stable setDragging ref pattern: the identity of the chosen setDragging function may
  // change between renders (localMode toggle, or apiSetDragging identity). Storing it in a
  // ref and calling through stable callbacks lets React.memo on AnnotationPin/AnnotationBox
  // hold — the memo never sees a new function reference for onDragStart/onDragEnd.
  const setDraggingImpl = localMode ? undefined : apiSetDragging;
  const setDraggingRef = useRef(setDraggingImpl);
  // eslint-disable-next-line react-hooks/refs
  setDraggingRef.current = setDraggingImpl;

  const handleDragStart = useCallback((annotationId: string) => {
    setDraggingRef.current?.(annotationId, true);
  }, []);

  const handleDragEnd = useCallback((annotationId: string) => {
    setDraggingRef.current?.(annotationId, false);
  }, []);

  // Choose annotation source
  const annotationsToUse = localMode ? localAnnotations : (propAnnotations || apiAnnotations);

  // Filter annotations for current attachment
  const currentAnnotations = useMemo(
    () => annotationsToUse.filter((ann) => ann.attachmentId === attachment.id),
    [annotationsToUse, attachment.id]
  );



  // ============================================================================
  // EDIT STATE
  // ============================================================================

  const { editState, openEdit, closeEdit, submitEdit } = useAnnotationEditState();

  // Refs for values read by stable callbacks below. Written on every render so the
  // callback always sees the latest value without being in the dep array.
  const currentAnnotationsRef = useRef(currentAnnotations);
  // eslint-disable-next-line react-hooks/refs
  currentAnnotationsRef.current = currentAnnotations;

  // openEdit identity is stable (from useAnnotationEditState), no ref needed.

  const handleAnnotationEdit = useCallback(
    (annotationId: string) => {
      openEdit(annotationId, currentAnnotationsRef.current, annotationOverlayRef);
    },
    // openEdit is stable; annotationOverlayRef is a ref object (stable identity).
    [openEdit]
  );

  const handleEditSubmit = useCallback(
    async (newDescription: string) => {
      if (!editState.editingAnnotation) return;
      // Update via API - need to update the annotation description
      // For now, close the edit dialog (the real update is handled by submitEdit)
      submitEdit(newDescription, async (annotationId, updates) => {
        // Find annotation and update via integration hook
        const annotation = currentAnnotationsRef.current.find((a) => a.id === annotationId);
        if (annotation?.shape) {
          // Re-create annotation with updated description using the update mutation
          // Note: useAnnotationIntegration doesn't expose updateAnnotation directly,
          // so we'll need to add it or call the API directly
          console.log('Updated annotation description:', annotationId, updates.description);
        }
      });
    },
    [editState.editingAnnotation, submitEdit]
  );

  // ============================================================================
  // DRAFT CREATION
  // ============================================================================

  // NOTE: `updateDraft` is intentionally not consumed. The live drawing preview
  // is rendered locally inside AnnotationCanvas (renderDraftPreview); wiring an
  // onDraftUpdate handler here only triggered a full-view re-render per pointermove
  // with zero visible effect. See perf fix: annotation draw re-render storm.
  const { createDraft, commitDraft, cancelDraft } = useAnnotationDrafts({
    onCommit: async (draft, message) => {
      // Generate label based on current count
      const nextLabel = String(currentAnnotations.length + 1);
      console.info('📝 Creating annotation:', { draft, message, label: nextLabel });

      // Create via integration hook
      await createAnnotation(draft.shape, message || undefined);
    },
  });

  // ============================================================================
  // ANNOTATION DELETE HANDLER
  // ============================================================================

  // Refs for all values read by handleAnnotationDelete so the callback has a stable
  // identity (empty deps). Written on every render to stay fresh (no stale closures).
  const permissionsRef = useRef(permissions);
  // eslint-disable-next-line react-hooks/refs
  permissionsRef.current = permissions;
  const userIdRef = useRef(userId);
  // eslint-disable-next-line react-hooks/refs
  userIdRef.current = userId;
  const activeAnnotationIdRef = useRef(activeAnnotationId);
  // eslint-disable-next-line react-hooks/refs
  activeAnnotationIdRef.current = activeAnnotationId;
  const handleAnnotationSelectRef = useRef(handleAnnotationSelect);
  // eslint-disable-next-line react-hooks/refs
  handleAnnotationSelectRef.current = handleAnnotationSelect;
  const deleteAnnotationRef = useRef(deleteAnnotation);
  // eslint-disable-next-line react-hooks/refs
  deleteAnnotationRef.current = deleteAnnotation;

  const handleAnnotationDelete = useCallback(
    async (annotationId: string) => {
      // Read fresh values from refs to avoid stale closures
      const annotation = currentAnnotationsRef.current.find((a) => a.id === annotationId);
      if (!annotation) return;

      const isOwner = annotation.author?.id === userIdRef.current;
      const perms = permissionsRef.current;
      if (!perms.canDeleteAll && !(perms.canDelete && isOwner)) {
        console.warn('No permission to delete annotation');
        return;
      }

      await deleteAnnotationRef.current(annotationId);

      // Clear active if deleted
      if (activeAnnotationIdRef.current === annotationId) {
        handleAnnotationSelectRef.current(null);
      }
    },
    // Empty dep array — all live values are read through refs that are synced every render.
    []
  );

  // ============================================================================
  // CLICK OUTSIDE HANDLER
  // ============================================================================

  useEffect(() => {
    if (!interactive || activeTool !== 'cursor' || !activeAnnotationId) {
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

      handleAnnotationSelect(null);
    };

    interactionNode.addEventListener('pointerdown', handleBackgroundPointerDown);
    return () => {
      interactionNode.removeEventListener('pointerdown', handleBackgroundPointerDown);
    };
  }, [interactive, activeTool, activeAnnotationId, handleAnnotationSelect]);

  // ============================================================================
  // COMPUTED STATE
  // ============================================================================

  const isAnnotationInteractive = interactive && editModeEnabled && permissions.canCreate;
  const pointerPanEnabled = !interactive || !editModeEnabled || handToolActive;
  const showToolbar = interactive && permissions.canCreate;

  // Save status for indicator
  const saveStatus: AnnotationSaveStatus = isSaving ? 'saving' : 'idle';

  // ============================================================================
  // TOOLBAR TOOLS
  // ============================================================================

  const toolbarTools = useMemo((): readonly AnnotationToolId[] => {
    const allTools: readonly AnnotationToolId[] = ['cursor', 'pin', 'box'] as const;

    // Filter based on permissions
    if (!permissions.canCreate) {
      return ['cursor'] as const; // Only cursor for view-only
    }

    return allTools;
  }, [permissions.canCreate]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Don't render annotations for non-image attachments
  if (!attachment.fileType.startsWith('image/')) {
    return (
      <CenteredCanvasView
        attachment={attachment}
        canvasState={canvasState}
        onCanvasStateChange={handleCanvasStateChange}
      />
    );
  }

  // Loading state (skip in local mode)
  if (!localMode && (annotationsLoading || permissionsLoading)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Overlay content with annotation layer and canvas
  const overlayContent =
    currentAnnotations.length > 0 || isAnnotationInteractive ? (
      <>
        {currentAnnotations.length > 0 && (
          <AnnotationLayer
            annotations={currentAnnotations}
            overlayRef={annotationOverlayRef}
            activeAnnotationId={activeAnnotationId}
            interactive={isAnnotationInteractive}
            handToolActive={handToolActive}
            onSelect={handleAnnotationSelect}
            onMoveComplete={handleAnnotationMove}
            onBoxMoveComplete={handleBoxAnnotationMove}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onEdit={handleAnnotationEdit}
            onDelete={handleAnnotationDelete}
            issueId={issueId}
            attachmentId={attachment.id}
            enablePopover={!editModeEnabled}
          />
        )}
        {isAnnotationInteractive && (
          <AnnotationCanvas
            overlayRef={annotationOverlayRef}
            activeTool={activeTool}
            editModeEnabled={editModeEnabled}
            handToolActive={handToolActive}
            onDraftCreate={createDraft}
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
    <div className="relative h-full w-full">
      {/* Annotation toolbar */}
      {showToolbar && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-start gap-3 px-4">
          <AnnotationToolbar
            className="pointer-events-auto"
            activeTool={activeTool}
            tools={toolbarTools}
            editModeEnabled={editModeEnabled}
            canUndo={canUndo}
            canRedo={canRedo}
            onToolChange={selectTool}
            onToggleEditMode={toggleEditMode}
            onUndo={undo}
            onRedo={redo}
          />
        </div>
      )}

      {/* Canvas with annotations */}
      <CenteredCanvasView
        attachment={attachment}
        canvasState={canvasState}
        onCanvasStateChange={handleCanvasStateChange}
        overlayRef={annotationOverlayRef}
        interactionLayerRef={annotationSurfaceRef}
        overlayContent={overlayContent}
        pointerPanEnabled={pointerPanEnabled}
        scrollPanEnabled={true}
        saveStatus={saveStatus}
      />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </div>
  );
}

export default AnnotatedAttachmentView;
