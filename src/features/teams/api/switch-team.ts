import { apiClient } from '@/lib/api-client';
import { teamResponseSchema, type TeamResponse } from './types';

/**
 * Switch active team context
 */
export async function switchTeam(teamId: string): Promise<TeamResponse> {
  const response = await apiClient<TeamResponse>(`/api/teams/${teamId}/switch`, {
    method: 'POST',
  });

  return teamResponseSchema.parse(response);
}
