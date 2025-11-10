// ============================================================================
// USE ISSUE ACTIVITIES HOOK
// React hook for fetching issue activity timeline with pagination
// ============================================================================

import useSWR, { type SWRConfiguration } from 'swr';
import { getIssueActivities, type GetIssueActivitiesParams } from '../api';
import type { ActivityTimelineResponse, ActivityEntry } from '@/src/types/issue';

export interface UseIssueActivitiesOptions extends SWRConfiguration<ActivityTimelineResponse> {
  issueId: string;
  cursor?: string | null;
  limit?: number;
  enabled?: boolean;
}

export interface UseIssueActivitiesReturn {
  activities: ActivityEntry[];
  hasMore: boolean;
  nextCursor: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<ActivityTimelineResponse | undefined>;
  isValidating: boolean;
}

/**
 * Hook to fetch and cache issue activity timeline with pagination
 *
 * @example
 * ```tsx
 * const { activities, hasMore, isLoading } = useIssueActivities({
 *   issueId: 'issue_1',
 *   limit: 10,
 * });
 * ```
 */
export function useIssueActivities(
  options: UseIssueActivitiesOptions
): UseIssueActivitiesReturn {
  const { issueId, cursor, limit = 10, enabled = true, ...swrOptions } = options;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ActivityTimelineResponse, Error>(
    enabled && issueId ? ['issue-activities', issueId, cursor, limit] : null,
    () => getIssueActivities({ issueId, cursor, limit }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      refreshInterval: 30000, // Refresh every 30 seconds
      ...swrOptions,
    }
  );

  return {
    activities: data?.activities || [],
    hasMore: data?.hasMore || false,
    nextCursor: data?.nextCursor || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
    isValidating,
  };
}
