import { apiClient } from '@/lib/api-client';
import { z } from 'zod';
import { invitationSchema } from './types';

const resendInvitationResponseSchema = z.object({
  invitation: invitationSchema,
});

export type ResendInvitationResponse = z.infer<typeof resendInvitationResponseSchema>;

/**
 * Resend a team invitation
 */
export async function resendInvitation(
  teamId: string,
  invitationId: string
): Promise<ResendInvitationResponse> {
  const response = await apiClient<ResendInvitationResponse>(
    `/api/teams/${teamId}/invitations/${invitationId}/resend`,
    {
      method: 'POST',
    }
  );

  return resendInvitationResponseSchema.parse(response);
}
