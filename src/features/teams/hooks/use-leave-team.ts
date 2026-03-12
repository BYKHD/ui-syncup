'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { leaveTeam, type LeaveTeamResponse } from '../api';
import { TEAMS_QUERY_KEY } from './use-teams';
import { TEAM_QUERY_KEY } from './use-team';
import { TEAM_MEMBERS_QUERY_KEY } from './use-team-members';

/**
 * Hook to leave a team (remove yourself)
 * Automatically invalidates all team queries on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useLeaveTeam();
 * 
 * mutate('team-123', {
 *   onSuccess: () => {
 *     console.log('Left team');
 *     router.push('/teams');
 *   }
 * });
 * ```
 */
export function useLeaveTeam(
  options?: Omit<UseMutationOptions<LeaveTeamResponse, Error, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveTeam,
    onSuccess: (data, teamId, context) => {
      // Invalidate all team-related queries
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY, teamId] });
      queryClient.invalidateQueries({ queryKey: [TEAM_MEMBERS_QUERY_KEY, teamId] });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, teamId, context, undefined as any);
    },
    ...options,
  });
}
