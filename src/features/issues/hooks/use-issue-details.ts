/**
 * USE ISSUE DETAILS HOOK
 * Ready-to-wire: React Query hook for issue details (no business logic)
 */

import { useQuery } from '@tanstack/react-query';
import { getIssueDetails } from '../api';
import type { IssueDetailData } from '@/features/issues/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...issueKeys.lists(), filters] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
  activities: (id: string) => [...issueKeys.detail(id), 'activities'] as const,
};

// ============================================================================
// HOOK
// ============================================================================

export interface UseIssueDetailsParams {
  issueId: string;
  enabled?: boolean;
}

export interface UseIssueDetailsResult {
  issue: IssueDetailData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Ready-to-wire hook: fetch and cache issue details
 * Pure data fetching - no business logic
 *
 * @example
 * ```tsx
 * const { issue, isLoading, error, refetch } = useIssueDetails({
 *   issueId: 'issue_1'
 * });
 * ```
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock data from fixtures
 */
export function useIssueDetails({ issueId, enabled = true }: UseIssueDetailsParams): UseIssueDetailsResult {
  const query = useQuery({
    queryKey: issueKeys.detail(issueId),
    queryFn: () => getIssueDetails({ issueId }).then(res => res.issue),
    enabled: enabled && !!issueId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  return {
    issue: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
