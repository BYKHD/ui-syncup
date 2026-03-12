/**
 * Issue Configuration - Barrel Export
 *
 * Single source of truth for issue-related configuration.
 * Re-exports all issue config for clean imports.
 */

// Options - Priority, Status, Type configurations
export {
  // Priority
  ISSUE_PRIORITY_VALUES,
  PRIORITY_OPTIONS,
  DEFAULT_PRIORITY_ICON,
  // Status
  STATUS_OPTIONS,
  DEFAULT_STATUS_ICON,
  STATUS_COLORS,
  DEFAULT_STATUS_COLOR,
  // Type
  ISSUE_TYPE_VALUES,
  TYPE_OPTIONS,
  ISSUE_TYPE_METADATA,
  // Attachments
  ATTACHMENT_LIMITS,
} from './options';
export type {
  IssuePriorityValue,
  IssueTypeValue,
  PriorityOption,
  StatusOption,
  StatusColorConfig,
  TypeOption,
  IssueTypeCategory,
} from './options';

// Workflow (status transitions)
export {
  ISSUE_STATUS_VALUES,
  ISSUE_WORKFLOW,
  ISSUE_STATUS_METADATA,
  WORKFLOW_TRANSITIONS,
} from './workflow';
export type {
  IssueStatusValue,
  IssueWorkflowStage,
  IssueWorkflowState,
} from './workflow';
