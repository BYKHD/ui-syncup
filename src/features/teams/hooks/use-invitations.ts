'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getInvitations, type GetInvitationsParams, type InvitationsResponse } from '../api';

export const INVITATIONS_QUERY_KEY = 'invitations';

/**
 * Hook to fetch team invitations with pagination
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useInvitations(teamId, { page: 1, limit: 20 });
 * const invitations = data?.invitations ?? [];
 * ```
 */
export function useInvitations(
  teamId: string | undefined,
  params?: GetInvitationsParams,
  options?: Omit<UseQueryOptions<InvitationsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [INVITATIONS_QUERY_KEY, teamId, params],
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required');
      return getInvitations(teamId, params);
    },
    enabled: !!teamId,
    ...options,
  });
}
