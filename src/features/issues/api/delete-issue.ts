// ============================================================================
// DELETE ISSUE API
// Deletes an issue (soft delete in production)
// ============================================================================

import type { IssueDeletePayload } from '@/features/issues/types';

export interface DeleteIssueParams extends IssueDeletePayload {
  issueId: string;
}

export interface DeleteIssueResponse {
  success: boolean;
  message: string;
}

/**
 * Deletes an issue
 *
 * MOCK IMPLEMENTATION: Simulates deletion
 * TODO: Replace with actual API call when backend is ready
 */
export async function deleteIssue(
  params: DeleteIssueParams
): Promise<DeleteIssueResponse> {
  const { issueId, actorId } = params;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock validation
  if (!issueId || !actorId) {
    throw new Error('Issue ID and Actor ID are required');
  }

  // In production, this would be a soft delete (status = 'deleted')
  // For now, just return success
  return {
    success: true,
    message: `Issue ${issueId} deleted successfully`,
  };
}
