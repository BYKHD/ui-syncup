/**
 * Annotation Hooks Barrel Export
 *
 * Exports all annotation-related React hooks.
 *
 * @module features/annotations/hooks
 */

// Core hooks (existing)
export { useAnnotationsWithHistory } from './use-annotations-with-history';
export { useAnnotationTools } from './use-annotation-tools';
export { useAnnotationDrafts } from './use-annotation-drafts';
export { useAnnotationEditState } from './use-annotation-edit-state';
export { useAnnotationHistoryTracker } from './use-annotation-history-tracker';
export { useAnnotationSave } from './use-annotation-save';

// Integration hooks (Phase 4)
export {
  useAnnotationIntegration,
  annotationKeys,
  type UseAnnotationIntegrationOptions,
  type UseAnnotationIntegrationResult,
} from './use-annotation-integration';

export {
  useAnnotationComments,
  type UseAnnotationCommentsOptions,
  type UseAnnotationCommentsResult,
} from './use-annotation-comments';

export {
  useAnnotationPermissions,
  useCanPerformAnnotationAction,
  type UseAnnotationPermissionsOptions,
  type UseAnnotationPermissionsResult,
} from './use-annotation-permissions';
