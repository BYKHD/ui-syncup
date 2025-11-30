import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const leaveTeamResponseSchema = z.object({
  message: z.string(),
});

export type LeaveTeamResponse = z.infer<typeof leaveTeamResponseSchema>;

/**
 * Leave a team (remove yourself)
 */
export async function leaveTeam(teamId: string): Promise<LeaveTeamResponse> {
  const response = await apiClient<LeaveTeamResponse>(
    `/api/teams/${teamId}/leave`,
    {
      method: 'POST',
    }
  );

  return leaveTeamResponseSchema.parse(response);
}
