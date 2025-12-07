import { apiClient } from '@/lib/api-client';
import { z } from 'zod';
import { teamMemberSchema, type UpdateMemberRolesInput } from './types';

const updateMemberRolesResponseSchema = z.object({
  member: teamMemberSchema,
});

export type UpdateMemberRolesResponse = z.infer<typeof updateMemberRolesResponseSchema>;

/**
 * Update a team member's roles
 */
export async function updateMemberRoles(
  teamId: string,
  userId: string,
  input: UpdateMemberRolesInput
): Promise<UpdateMemberRolesResponse> {
  const response = await apiClient<UpdateMemberRolesResponse>(
    `/api/teams/${teamId}/members/${userId}`,
    {
      method: 'PATCH',
      body: input,
    }
  );

  return updateMemberRolesResponseSchema.parse(response);
}
