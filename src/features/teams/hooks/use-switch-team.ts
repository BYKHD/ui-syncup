'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { switchTeam, type TeamResponse } from '../api';
import { TEAMS_QUERY_KEY } from './use-teams';
import { TEAM_QUERY_KEY } from './use-team';

/**
 * Hook to switch active team context
 * Automatically invalidates all team queries on success to ensure fresh data
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useSwitchTeam();
 * 
 * mutate('team-123', {
 *   onSuccess: () => {
 *     // Page will reload with new team context
 *     window.location.reload();
 *   }
 * });
 * ```
 */
export function useSwitchTeam(
  options?: Omit<UseMutationOptions<TeamResponse, Error, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchTeam,
    onSuccess: (data, teamId, context) => {
      // Invalidate all team-related queries to ensure fresh data with new context
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY] });
      
      // Call user's onSuccess if provided
      options?.onSuccess?.(data, teamId, context, undefined as any);
    },
    ...options,
  });
}
