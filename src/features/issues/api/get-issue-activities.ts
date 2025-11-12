// ============================================================================
// GET ISSUE ACTIVITIES API
// Fetches activity timeline for an issue with pagination
// ============================================================================

import type { ActivityTimelineResponse } from '@/features/issues/types';
import { getPaginatedActivities } from '@/mocks/activity.fixtures';

export interface GetIssueActivitiesParams {
  issueId: string;
  cursor?: string | null;
  limit?: number;
}

/**
 * Fetches paginated activity timeline for an issue
 *
 * MOCK IMPLEMENTATION: Returns mock data from fixtures
 * TODO: Replace with actual API call when backend is ready
 */
export async function getIssueActivities(
  params: GetIssueActivitiesParams
): Promise<ActivityTimelineResponse> {
  const { issueId, cursor, limit = 10 } = params;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Get paginated mock activities
  const result = getPaginatedActivities(issueId, limit, cursor);

  return result;
}
