// ============================================================================
// UPDATE ISSUE API
// Updates a single field on an issue with optimistic updates
// ============================================================================

import type { IssueUpdatePayload, IssueUpdateResponse } from '@/features/issues/types';
import { getDetailedIssueById } from '@/mocks/issue.fixtures';
import { getAttachmentsByIssueId } from '@/mocks/attachment.fixtures';

export interface UpdateIssueParams extends IssueUpdatePayload {
  issueId: string;
}

/**
 * Updates a single field on an issue
 *
 * MOCK IMPLEMENTATION: Returns updated mock data
 * TODO: Replace with actual API call when backend is ready
 */
export async function updateIssue(
  params: UpdateIssueParams
): Promise<IssueUpdateResponse> {
  const { issueId, field, value, actorId } = params;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Get mock issue data
  const issueDetail = getDetailedIssueById(issueId);

  if (!issueDetail) {
    throw new Error(`Issue ${issueId} not found`);
  }

  // Get attachments for this issue
  const attachments = getAttachmentsByIssueId(issueId);

  // Create updated issue with the new field value
  const updatedIssue = {
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
    assignee: issueDetail.assignee ? {
      id: issueDetail.assignee.id,
      name: issueDetail.assignee.name,
      email: issueDetail.assignee.email,
      image: issueDetail.assignee.avatarUrl ?? null,
    } : null,
    reporter: {
      id: issueDetail.reporter.id,
      name: issueDetail.reporter.name,
      email: issueDetail.reporter.email,
      image: issueDetail.reporter.avatarUrl ?? null,
    },
    attachments,
    coverImageUrl: issueDetail.coverImageUrl,
    createdAt: issueDetail.createdAt,
    updatedAt: new Date().toISOString(), // Update timestamp
    [field]: value, // Apply the update
  };

  // Create mock activity entry
  const activity = {
    id: `act_${Date.now()}`,
    issueId,
    type: `${field}_changed` as any,
    actor: {
      id: issueDetail.reporter.id,
      name: issueDetail.reporter.name,
      email: issueDetail.reporter.email,
      image: issueDetail.reporter.avatarUrl ?? null,
    },
    changes: [
      {
        field,
        oldValue: (issueDetail as any)[field],
        newValue: value,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  return {
    issue: updatedIssue,
    activity,
  };
}
