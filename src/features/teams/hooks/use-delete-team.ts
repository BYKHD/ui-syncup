'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { deleteTeam, type DeleteTeamResponse } from '../api';
import { TEAMS_QUERY_KEY } from './use-teams';
import { TEAM_QUERY_KEY } from './use-team';

/**
 * Hook to soft delete a team
 * Automatically invalidates team queries on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useDeleteTeam();
 * 
 * mutate('team-123', {
 *   onSuccess: () => {
 *     console.log('Team deleted');
 *     router.push('/onboarding');
 *   }
 * });
 * ```
 */
export function useDeleteTeam(
  options?: Omit<UseMutationOptions<DeleteTeamResponse, Error, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: (data, teamId, context) => {
      // Invalidate specific team query
      queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY, teamId] });
      
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      
      // Call user's onSuccess if provided
      options?.onSuccess?.(data, teamId, context, undefined as any);
    },
    ...options,
  });
}
