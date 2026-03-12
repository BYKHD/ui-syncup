import { apiClient } from '@/lib/api-client';
import { invitationsResponseSchema, type InvitationsResponse } from './types';

export interface GetInvitationsParams {
  page?: number;
  limit?: number;
}

/**
 * Fetch team invitations with pagination
 */
export async function getInvitations(
  teamId: string,
  params?: GetInvitationsParams
): Promise<InvitationsResponse> {
  const response = await apiClient<InvitationsResponse>(
    `/api/teams/${teamId}/invitations`,
    {
      method: 'GET',
      query: params as any,
    }
  );

  return invitationsResponseSchema.parse(response);
}
