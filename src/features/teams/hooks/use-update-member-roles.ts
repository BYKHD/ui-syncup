'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
  updateMemberRoles,
  type UpdateMemberRolesInput,
  type UpdateMemberRolesResponse,
} from '../api';
import { TEAM_MEMBERS_QUERY_KEY } from './use-team-members';
import { TEAM_QUERY_KEY } from './use-team';

export interface UpdateMemberRolesVariables {
  teamId: string;
  userId: string;
  input: UpdateMemberRolesInput;
}

/**
 * Hook to update a team member's roles
 * Automatically invalidates team and member queries on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateMemberRoles();
 * 
 * mutate({
 *   teamId: 'team-123',
 *   userId: 'user-456',
 *   input: { operationalRole: 'TEAM_EDITOR' }
 * }, {
 *   onSuccess: (data) => {
 *     console.log('Member roles updated:', data.member);
 *   }
 * });
 * ```
 */
export function useUpdateMemberRoles(
  options?: Omit<
    UseMutationOptions<UpdateMemberRolesResponse, Error, UpdateMemberRolesVariables>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId, input }: UpdateMemberRolesVariables) =>
      updateMemberRoles(teamId, userId, input),
    onSuccess: (data, variables, context) => {
      // Invalidate team members list
      queryClient.invalidateQueries({
        queryKey: [TEAM_MEMBERS_QUERY_KEY, variables.teamId],
      });

      // Invalidate team details (billable seats may have changed)
      queryClient.invalidateQueries({
        queryKey: [TEAM_QUERY_KEY, variables.teamId],
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, undefined as any);
    },
    ...options,
  });
}
