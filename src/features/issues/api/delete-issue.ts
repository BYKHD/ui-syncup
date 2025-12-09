// ============================================================================
// DELETE ISSUE API
// Deletes an issue (soft delete in production)
// ============================================================================

import { apiClient } from '@/lib/api-client';
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
 * Calls DELETE /api/issues/[issueId]
 */
export async function deleteIssue({
  issueId,
}: DeleteIssueParams): Promise<DeleteIssueResponse> {
  await apiClient<void>(`/api/issues/${issueId}`, { method: 'DELETE' });

  return {
    success: true,
    message: `Issue ${issueId} deleted successfully`,
  };
}
