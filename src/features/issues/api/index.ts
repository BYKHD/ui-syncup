// ============================================================================
// ISSUE API BARREL EXPORTS
// ============================================================================

// Get issue details
export { getIssueDetails } from './get-issue-details';
export type {
  GetIssueDetailsParams,
  GetIssueDetailsResponse,
} from './get-issue-details';

// Get issue activities
export { getIssueActivities } from './get-issue-activities';
export type { GetIssueActivitiesParams } from './get-issue-activities';

// Update issue
export { updateIssue } from './update-issue';
export type { UpdateIssueParams } from './update-issue';

// Delete issue
export { deleteIssue } from './delete-issue';
export type {
  DeleteIssueParams,
  DeleteIssueResponse,
} from './delete-issue';

// Get project issues (client-side)
export { getProjectIssues } from './get-project-issues';
export type {
  GetProjectIssuesParams,
  ProjectIssuesResponse,
} from './get-project-issues';

// Create issue
export { createIssue } from './create-issue';
export type { CreateIssueParams } from './create-issue';

// Upload attachment
export { uploadAttachment } from './upload-attachment';
export type { UploadAttachmentParams } from './upload-attachment';

// Server-side APIs (for SSR prefetching)
export { getProjectIssuesServer } from './get-project-issues-server';
export type { ServerFetchOptions } from './get-project-issues-server';
