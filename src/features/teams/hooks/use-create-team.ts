'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { createTeam, type CreateTeamInput, type TeamResponse } from '../api';
import { TEAMS_QUERY_KEY } from './use-teams';

/**
 * Hook to create a new team
 * Automatically invalidates teams list on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useCreateTeam();
 * 
 * mutate({ name: 'My Team', description: 'Team description' }, {
 *   onSuccess: (data) => {
 *     console.log('Team created:', data.team);
 *   }
 * });
 * ```
 */
export function useCreateTeam(
  options?: Omit<UseMutationOptions<TeamResponse, Error, CreateTeamInput>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeam,
    onSuccess: (data, variables, context) => {
      // Invalidate teams list to refetch
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      
      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, undefined as any);
    },
    ...options,
  });
}
