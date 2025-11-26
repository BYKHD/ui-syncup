import { apiClient } from '@/lib/api-client';
import { teamResponseSchema, type CreateTeamInput, type TeamResponse } from './types';

/**
 * Create a new team
 */
export async function createTeam(input: CreateTeamInput): Promise<TeamResponse> {
  const response = await apiClient<TeamResponse>('/api/teams', {
    method: 'POST',
    body: input,
  });

  return teamResponseSchema.parse(response);
}
