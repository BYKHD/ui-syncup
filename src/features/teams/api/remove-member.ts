import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const removeMemberResponseSchema = z.object({
  message: z.string(),
});

export type RemoveMemberResponse = z.infer<typeof removeMemberResponseSchema>;

/**
 * Remove a member from a team
 */
export async function removeMember(
  teamId: string,
  userId: string
): Promise<RemoveMemberResponse> {
  const response = await apiClient<RemoveMemberResponse>(
    `/api/teams/${teamId}/members/${userId}`,
    {
      method: 'DELETE',
    }
  );

  return removeMemberResponseSchema.parse(response);
}
