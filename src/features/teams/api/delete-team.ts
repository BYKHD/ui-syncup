import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const deleteTeamResponseSchema = z.object({
  message: z.string(),
});

export type DeleteTeamResponse = z.infer<typeof deleteTeamResponseSchema>;

/**
 * Soft delete a team
 */
export async function deleteTeam(teamId: string): Promise<DeleteTeamResponse> {
  const response = await apiClient<DeleteTeamResponse>(`/api/teams/${teamId}`, {
    method: 'DELETE',
  });

  return deleteTeamResponseSchema.parse(response);
}
