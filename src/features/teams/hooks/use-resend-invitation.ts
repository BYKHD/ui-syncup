'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { resendInvitation, type ResendInvitationResponse } from '../api';
import { INVITATIONS_QUERY_KEY } from './use-invitations';

export interface ResendInvitationVariables {
  teamId: string;
  invitationId: string;
}

/**
 * Hook to resend a team invitation
 * Automatically invalidates invitations list on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useResendInvitation();
 * 
 * mutate({
 *   teamId: 'team-123',
 *   invitationId: 'inv-456'
 * }, {
 *   onSuccess: (data) => {
 *     console.log('Invitation resent:', data.invitation);
 *   }
 * });
 * ```
 */
export function useResendInvitation(
  options?: Omit<
    UseMutationOptions<ResendInvitationResponse, Error, ResendInvitationVariables>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, invitationId }: ResendInvitationVariables) =>
      resendInvitation(teamId, invitationId),
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
