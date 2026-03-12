'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getTeamMembers, type GetTeamMembersParams, type MembersResponse } from '../api';

export const TEAM_MEMBERS_QUERY_KEY = 'team-members';

/**
 * Hook to fetch team members with pagination
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTeamMembers(teamId, { page: 1, limit: 20 });
 * const members = data?.members ?? [];
 * ```
 */
export function useTeamMembers(
  teamId: string | undefined,
  params?: GetTeamMembersParams,
  options?: Omit<UseQueryOptions<MembersResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [TEAM_MEMBERS_QUERY_KEY, teamId, params],
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required');
      return getTeamMembers(teamId, params);
    },
    enabled: !!teamId,
    ...options,
  });
}
