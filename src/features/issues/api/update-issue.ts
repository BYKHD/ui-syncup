// ============================================================================
// UPDATE ISSUE API
// Updates a single field on an issue with optimistic updates
// ============================================================================

import { apiClient } from '@/lib/api-client';
import type { IssueUpdatePayload, IssueUpdateResponse, IssueDetailData } from '@/features/issues/types';

export interface UpdateIssueParams extends IssueUpdatePayload {
  issueId: string;
}

/**
 * Updates a single field on an issue
 * Calls PATCH /api/issues/[issueId]
 */
export async function updateIssue({
  issueId,
  field,
  value,
}: UpdateIssueParams): Promise<IssueUpdateResponse> {
  const response = await apiClient<{ issue: IssueDetailData }>(
    `/api/issues/${issueId}`,
    {
      method: 'PATCH',
      body: { [field]: value },
    }
  );

  return { issue: response.issue };
}
