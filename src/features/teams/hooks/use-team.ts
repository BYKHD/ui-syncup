'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getTeam, type TeamResponse } from '../api';

export const TEAM_QUERY_KEY = 'team';

/**
 * Hook to fetch a single team by ID
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTeam(teamId);
 * const team = data?.team;
 * ```
 */
export function useTeam(
  teamId: string | undefined,
  options?: Omit<UseQueryOptions<TeamResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [TEAM_QUERY_KEY, teamId],
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required');
      return getTeam(teamId);
    },
    enabled: !!teamId,
    ...options,
  });
}
