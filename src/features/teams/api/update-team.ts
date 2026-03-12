import { apiClient } from '@/lib/api-client';
import { teamResponseSchema, type UpdateTeamInput, type TeamResponse } from './types';

/**
 * Update team settings
 */
export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<TeamResponse> {
  const response = await apiClient<TeamResponse>(`/api/teams/${teamId}`, {
    method: 'PATCH',
    body: input,
  });

  return teamResponseSchema.parse(response);
}
