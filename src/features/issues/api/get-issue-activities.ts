// ============================================================================
// GET ISSUE ACTIVITIES API
// Fetches activity timeline for an issue with pagination
// ============================================================================

import { apiClient } from '@/lib/api-client';
import type { ActivityTimelineResponse, ActivityEntry } from '@/features/issues/types';

export interface GetIssueActivitiesParams {
  issueId: string;
  cursor?: string | null;
  limit?: number;
}

/**
 * API response format from server
 */
interface ActivitiesApiResponse {
  activities: ActivityEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetches paginated activity timeline for an issue
 * Calls GET /api/issues/[issueId]/activities
 * 
 * Converts page-based pagination from API to cursor-based format for hooks
 */
export async function getIssueActivities({
  issueId,
  cursor,
  limit = 10,
}: GetIssueActivitiesParams): Promise<ActivityTimelineResponse> {
  // Convert cursor to page number (cursor is page-based)
  const page = cursor ? parseInt(cursor, 10) : 1;

  const response = await apiClient<ActivitiesApiResponse>(
    `/api/issues/${issueId}/activities`,
    {
      query: { page, limit },
    }
  );

  // Transform to ActivityTimelineResponse format (cursor-based)
  return {
    activities: response.activities,
    hasMore: response.pagination.page < response.pagination.totalPages,
    nextCursor:
      response.pagination.page < response.pagination.totalPages
        ? String(response.pagination.page + 1)
        : null,
  };
}
