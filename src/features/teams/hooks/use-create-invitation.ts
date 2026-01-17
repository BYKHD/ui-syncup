'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import {
  createInvitation,
  type CreateInvitationInput,
  type CreateInvitationResponse,
} from '../api';
import { INVITATIONS_QUERY_KEY } from './use-invitations';

export interface CreateInvitationVariables {
  teamId: string;
  input: CreateInvitationInput;
}

/**
 * Hook to create a new team invitation
 * Automatically invalidates invitations list on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useCreateInvitation();
 * 
 * mutate({
 *   teamId: 'team-123',
 *   input: {
 *     email: 'user@example.com',
 *     operationalRole: 'WORKSPACE_MEMBER'
 *   }
 * }, {
 *   onSuccess: (data) => {
 *     console.log('Invitation sent:', data.invitation);
 *   }
 * });
 * ```
 */
export function useCreateInvitation(
  options?: Omit<
    UseMutationOptions<CreateInvitationResponse, Error, CreateInvitationVariables>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, input }: CreateInvitationVariables) =>
      createInvitation(teamId, input),
    onSuccess: (data, variables, context) => {
      // Invalidate invitations list
      queryClient.invalidateQueries({
        queryKey: [INVITATIONS_QUERY_KEY, variables.teamId],
      });

      // Call user's onSuccess if provided
      options?.onSuccess?.(data, variables, context, undefined as any);
    },
    ...options,
  });
}
