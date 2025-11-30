'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { cancelInvitation, type CancelInvitationResponse } from '../api';
import { INVITATIONS_QUERY_KEY } from './use-invitations';

export interface CancelInvitationVariables {
  teamId: string;
  invitationId: string;
}

/**
 * Hook to cancel a team invitation
 * Automatically invalidates invitations list on success
 * 
 * @example
 * ```tsx
 * const { mutate, isPending } = useCancelInvitation();
 * 
 * mutate({
 *   teamId: 'team-123',
 *   invitationId: 'inv-456'
 * }, {
 *   onSuccess: () => {
 *     console.log('Invitation cancelled');
 *   }
 * });
 * ```
 */
export function useCancelInvitation(
  options?: Omit<
    UseMutationOptions<CancelInvitationResponse, Error, CancelInvitationVariables>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, invitationId }: CancelInvitationVariables) =>
      cancelInvitation(teamId, invitationId),
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
