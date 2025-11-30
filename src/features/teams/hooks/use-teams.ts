'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getTeams, type GetTeamsParams, type TeamsResponse } from '../api';

export const TEAMS_QUERY_KEY = 'teams';

/**
 * Hook to fetch all teams for the current user
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTeams();
 * const teams = data?.teams ?? [];
 * ```
 */
export function useTeams(
  params?: GetTeamsParams,
  options?: Omit<UseQueryOptions<TeamsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [TEAMS_QUERY_KEY, params],
    queryFn: () => getTeams(params),
    ...options,
  });
}
