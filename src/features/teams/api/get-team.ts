import { apiClient } from '@/lib/api-client';
import { teamResponseSchema, type TeamResponse } from './types';

/**
 * Fetch a single team by ID
 */
export async function getTeam(teamId: string): Promise<TeamResponse> {
  const response = await apiClient<TeamResponse>(`/api/teams/${teamId}`, {
    method: 'GET',
  });

  return teamResponseSchema.parse(response);
}
