import { apiClient } from '@/lib/api-client';
import { teamsResponseSchema, type TeamsResponse } from './types';

export interface GetTeamsParams {
  page?: number;
  limit?: number;
}

/**
 * Fetch all teams for the current user
 */
export async function getTeams(params?: GetTeamsParams): Promise<TeamsResponse> {
  const response = await apiClient<TeamsResponse>('/api/teams', {
    method: 'GET',
    query: params as any,
  });

  return teamsResponseSchema.parse(response);
}
