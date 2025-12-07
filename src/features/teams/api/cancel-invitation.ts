import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const cancelInvitationResponseSchema = z.object({
  message: z.string(),
});

export type CancelInvitationResponse = z.infer<typeof cancelInvitationResponseSchema>;

/**
 * Cancel a team invitation
 */
export async function cancelInvitation(
  teamId: string,
  invitationId: string
): Promise<CancelInvitationResponse> {
  const response = await apiClient<CancelInvitationResponse>(
    `/api/teams/${teamId}/invitations/${invitationId}`,
    {
      method: 'DELETE',
    }
  );

  return cancelInvitationResponseSchema.parse(response);
}
