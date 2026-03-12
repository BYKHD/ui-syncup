// ============================================================================
// GET ISSUE DETAILS API
// Fetches complete issue details with all relationships
// ============================================================================

import { apiClient } from '@/lib/api-client';
import type { IssueDetailData } from '@/features/issues/types';

export interface GetIssueDetailsParams {
  issueId: string;
}

export interface GetIssueDetailsResponse {
  issue: IssueDetailData;
}

/**
 * Fetches complete issue details with populated relationships
 * Calls GET /api/issues/[issueId]
 */
export async function getIssueDetails({
  issueId,
}: GetIssueDetailsParams): Promise<GetIssueDetailsResponse> {
  return apiClient<GetIssueDetailsResponse>(`/api/issues/${issueId}`);
}
