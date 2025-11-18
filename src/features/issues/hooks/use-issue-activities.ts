/**
 * USE ISSUE ACTIVITIES HOOK
 * Ready-to-wire: React Query hook for issue activity timeline (no business logic)
 */

import { useQuery } from '@tanstack/react-query';
import { getIssueActivities } from '../api';
import { issueKeys } from './use-issue-details';
import type { ActivityEntry } from '@/features/issues/types';

// ============================================================================
// HOOK
// ============================================================================

export interface UseIssueActivitiesParams {
  issueId: string;
  cursor?: string | null;
  limit?: number;
  enabled?: boolean;
}

export interface UseIssueActivitiesResult {
  activities: ActivityEntry[];
  hasMore: boolean;
  nextCursor: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Ready-to-wire hook: fetch and cache issue activity timeline
 * Pure data fetching - no business logic
 *
 * @example
 * ```tsx
 * const { activities, hasMore, nextCursor, isLoading } = useIssueActivities({
 *   issueId: 'issue_1',
 *   limit: 10,
 * });
 * ```
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock data from fixtures
 * - Consider implementing infinite query for pagination
 */
export function useIssueActivities({
  issueId,
  cursor,
  limit = 10,
  enabled = true,
}: UseIssueActivitiesParams): UseIssueActivitiesResult {
  const query = useQuery({
    queryKey: [...issueKeys.activities(issueId), cursor, limit],
    queryFn: () => getIssueActivities({ issueId, cursor: cursor ?? undefined, limit }),
    enabled: enabled && !!issueId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  return {
    activities: query.data?.activities || [],
    hasMore: query.data?.hasMore || false,
    nextCursor: query.data?.nextCursor || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
