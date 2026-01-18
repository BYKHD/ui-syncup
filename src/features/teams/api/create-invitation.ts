import { apiClient } from '@/lib/api-client';
import { z } from 'zod';
import { invitationSchema, type CreateInvitationInput } from './types';

const createInvitationResponseSchema = z.object({
  invitation: invitationSchema,
  invitationUrl: z.string().url(),
});

export type CreateInvitationResponse = z.infer<typeof createInvitationResponseSchema>;

/**
 * Create a new team invitation
 */
export async function createInvitation(
  teamId: string,
  input: CreateInvitationInput
): Promise<CreateInvitationResponse> {
  const response = await apiClient<CreateInvitationResponse>(
    `/api/teams/${teamId}/invitations`,
    {
      method: 'POST',
      body: input,
    }
  );

  return createInvitationResponseSchema.parse(response);
}
