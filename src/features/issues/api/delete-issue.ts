// ============================================================================
// DELETE ISSUE API
// Deletes an issue (soft delete in production)
// ============================================================================

import { apiClient } from '@/lib/api-client';
import type { IssueDeletePayload } from '@/features/issues/types';

// `actorId` is optional because the request carries no body — the route derives the
// actor from the session. Callers that already have a user id may still pass it.
export interface DeleteIssueParams extends Partial<IssueDeletePayload> {
  issueId: string;
}

export interface DeleteIssueResponse {
  success: boolean;
  message: string;
  projectKey: string;
}

/**
 * Deletes an issue
 * Calls DELETE /api/issues/[issueId]
 */
export async function deleteIssue({
  issueId,
}: DeleteIssueParams): Promise<DeleteIssueResponse> {
  return apiClient<DeleteIssueResponse>(`/api/issues/${issueId}`, { method: 'DELETE' });
}
