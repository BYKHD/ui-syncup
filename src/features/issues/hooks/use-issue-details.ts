// ============================================================================
// USE ISSUE DETAILS HOOK
// React hook for fetching issue details with SWR
// ============================================================================

import useSWR, { type SWRConfiguration } from 'swr';
import { getIssueDetails, type GetIssueDetailsResponse } from '../api';
import type { IssueDetailData } from '@/src/types/issue';

export interface UseIssueDetailsOptions extends SWRConfiguration<GetIssueDetailsResponse> {
  issueId: string;
}

export interface UseIssueDetailsReturn {
  issue: IssueDetailData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<GetIssueDetailsResponse | undefined>;
  isValidating: boolean;
}

/**
 * Hook to fetch and cache issue details
 *
 * @example
 * ```tsx
 * const { issue, isLoading, error } = useIssueDetails({ issueId: 'issue_1' });
 * ```
 */
export function useIssueDetails(options: UseIssueDetailsOptions): UseIssueDetailsReturn {
  const { issueId, ...swrOptions } = options;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<GetIssueDetailsResponse, Error>(
    issueId ? ['issue-details', issueId] : null,
    () => getIssueDetails({ issueId }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...swrOptions,
    }
  );

  return {
    issue: data?.issue,
    isLoading,
    isError: !!error,
    error,
    mutate,
    isValidating,
  };
}
