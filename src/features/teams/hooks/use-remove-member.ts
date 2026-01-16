'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { removeMember, type RemoveMemberResponse } from '../api';
import { TEAM_MEMBERS_QUERY_KEY } from './use-team-members';
import { TEAM_QUERY_KEY } from './use-team';

export interface RemoveMemberVariables {
  teamId: string;
  userId: string;
}

/**
 * Hook to remove a member from a team
 * Automatically invalidates team and member queries on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useRemoveMember();
 * 
 * mutate({
 *   teamId: 'team-123',
 *   userId: 'user-456'
 * }, {
 *   onSuccess: () => {
 *     console.log('Member removed');
 *   }
 * });
 * ```
 */
export function useRemoveMember(
  options?: Omit<
    UseMutationOptions<RemoveMemberResponse, Error, RemoveMemberVariables>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId }: RemoveMemberVariables) =>
      removeMember(teamId, userId),
    onSuccess: (data, variables, context) => {
      // Invalidate team members list
      queryClient.invalidateQueries({
        queryKey: [TEAM_MEMBERS_QUERY_KEY, variables.teamId],
      });

      // Invalidate team details (member count may have changed)
      queryClient.invalidateQueries({
        queryKey: [TEAM_QUERY_KEY, variables.teamId],
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, undefined as any);
    },
    ...options,
  });
}
