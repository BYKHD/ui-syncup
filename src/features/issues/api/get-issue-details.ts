// ============================================================================
// GET ISSUE DETAILS API
// Fetches complete issue details with all relationships
// ============================================================================

import type { IssueDetailData } from '@/src/types/issue';
import { getDetailedIssueById } from '@/src/mocks/issue.fixtures';
import { getAttachmentsByIssueId } from '@/src/mocks/attachment.fixtures';

export interface GetIssueDetailsParams {
  issueId: string;
}

export interface GetIssueDetailsResponse {
  issue: IssueDetailData;
}

/**
 * Fetches complete issue details with populated relationships
 *
 * MOCK IMPLEMENTATION: Returns mock data from fixtures
 * TODO: Replace with actual API call when backend is ready
 */
export async function getIssueDetails(
  params: GetIssueDetailsParams
): Promise<GetIssueDetailsResponse> {
  const { issueId } = params;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Get mock issue data
  const issueDetail = getDetailedIssueById(issueId);

  if (!issueDetail) {
    throw new Error(`Issue ${issueId} not found`);
  }

  // Get attachments for this issue
  const attachments = getAttachmentsByIssueId(issueId);

  // Convert to IssueDetailData format
  const issue: IssueDetailData = {
    id: issueDetail.id,
    issueKey: issueDetail.issueKey,
    title: issueDetail.title,
    description: issueDetail.description,
    type: issueDetail.type,
    priority: issueDetail.priority,
    status: issueDetail.status,
    projectId: issueDetail.projectId,
    projectKey: issueDetail.projectKey,
    projectName: issueDetail.projectName,
    assignee: issueDetail.assignee,
    reporter: issueDetail.reporter,
    attachments,
    coverImageUrl: issueDetail.coverImageUrl,
    createdAt: issueDetail.createdAt,
    updatedAt: issueDetail.updatedAt,
  };

  return { issue };
}
