/**
 * ISSUE HOOKS BARREL EXPORTS
 * Ready-to-wire hooks following project scaffolding guidelines
 */

// Query hooks (data fetching)
export {
  useIssueDetails,
  issueKeys,
} from './use-issue-details';
export type {
  UseIssueDetailsParams,
  UseIssueDetailsResult,
} from './use-issue-details';

export { useIssueActivities } from './use-issue-activities';
export type {
  UseIssueActivitiesParams,
  UseIssueActivitiesResult,
} from './use-issue-activities';

export { useProjectIssues } from './use-project-issues';
export type { UseProjectIssuesParams } from './use-project-issues';

// Mutation hooks (data modification)
export { useCreateIssue } from './use-create-issue';
export type { UseCreateIssueOptions } from './use-create-issue';

export { useIssueUpdate } from './use-issue-update';
export type {
  UseIssueUpdateOptions,
  UseIssueUpdateParams,
  UseIssueUpdateResult,
} from './use-issue-update';

export { useIssueDelete } from './use-issue-delete';
export type {
  UseIssueDeleteOptions,
  UseIssueDeleteResult,
} from './use-issue-delete';

// UI state hooks
export { useIssueFilters } from './use-issue-filters';
export type { UseIssueFiltersResult } from './use-issue-filters';

export {
  useKeyboardShortcuts,
  formatShortcut,
  getModifierKey,
} from './use-keyboard-shortcuts';
export type { KeyboardShortcut } from './use-keyboard-shortcuts';

// Performance hooks
export {
  useOptimizedImage,
  useAttachmentImage,
  useAvatarImage,
  useThumbnailImage,
  generateOptimizedSrc,
  generateSrcSet,
} from './use-optimized-image';

// Canvas hooks
export { useCanvasTransform } from './use-canvas-transform';
export type {
  Point,
  Size,
  FitMode,
  CanvasTransformState,
  CanvasTransform,
} from './use-canvas-transform';

export { useElasticScroll } from './use-elastic-scroll';
export type {
  Bounds,
  UseElasticScrollOptions,
  UseElasticScrollReturn,
} from './use-elastic-scroll';
