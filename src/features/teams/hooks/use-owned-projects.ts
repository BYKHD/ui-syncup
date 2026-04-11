'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOwnedProjects, type OwnedProjectsResponse } from '../api';

export const OWNED_PROJECTS_QUERY_KEY = 'team-member-owned-projects';

/**
 * Fetches projects owned by a specific team member plus eligible replacement owners.
 * Pass `enabled: open` so the query only fires when the remove dialog opens.
 */
export function useOwnedProjects(
  teamId: string | undefined,
  userId: string | undefined,
  options?: Omit<UseQueryOptions<OwnedProjectsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [OWNED_PROJECTS_QUERY_KEY, teamId, userId],
    queryFn: () => {
      if (!teamId || !userId) throw new Error('teamId and userId are required');
      return getOwnedProjects(teamId, userId);
    },
    enabled: !!teamId && !!userId,
    ...options,
  });
}
