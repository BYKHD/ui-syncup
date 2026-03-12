'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { updateTeam, type UpdateTeamInput, type TeamResponse } from '../api';
import { TEAMS_QUERY_KEY } from './use-teams';
import { TEAM_QUERY_KEY } from './use-team';

export interface UpdateTeamVariables {
  teamId: string;
  input: UpdateTeamInput;
}

/**
 * Hook to update team settings
 * Automatically invalidates team queries on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateTeam();
 * 
 * mutate({ teamId: 'team-123', input: { name: 'New Name' } }, {
 *   onSuccess: (data) => {
 *     console.log('Team updated:', data.team);
 *   }
 * });
 * ```
 */
export function useUpdateTeam(
  options?: Omit<UseMutationOptions<TeamResponse, Error, UpdateTeamVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, input }: UpdateTeamVariables) => updateTeam(teamId, input),
    onSuccess: (data, variables, context) => {
      // Invalidate specific team query
      queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY, variables.teamId] });
      
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      
      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, undefined as any);
    },
    ...options,
  });
}
