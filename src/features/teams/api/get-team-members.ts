import { apiClient } from '@/lib/api-client';
import { membersResponseSchema, type MembersResponse } from './types';

export interface GetTeamMembersParams {
  page?: number;
  limit?: number;
}

/**
 * Fetch team members with pagination
 */
export async function getTeamMembers(
  teamId: string,
  params?: GetTeamMembersParams
): Promise<MembersResponse> {
  const response = await apiClient<MembersResponse>(
    `/api/teams/${teamId}/members`,
    {
      method: 'GET',
      query: params as any,
    }
  );

  return membersResponseSchema.parse(response);
}
