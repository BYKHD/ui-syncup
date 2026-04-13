import { apiClient } from '@/lib/api-client';
import { z } from 'zod';
import { teamMemberSchema, type UpdateMemberRolesInput } from './types';
import type { OwnershipTransfer } from './remove-member';

const updateMemberRolesResponseSchema = z.object({
  member: teamMemberSchema,
});

export type UpdateMemberRolesResponse = z.infer<typeof updateMemberRolesResponseSchema>;

/**
 * Update a team member's roles.
 * Pass ownershipTransfers when demoting an editor who owns projects.
 */
export async function updateMemberRoles(
  teamId: string,
  userId: string,
  input: UpdateMemberRolesInput,
  ownershipTransfers?: OwnershipTransfer[]
): Promise<UpdateMemberRolesResponse> {
  const response = await apiClient<UpdateMemberRolesResponse>(
    `/api/teams/${teamId}/members/${userId}`,
    {
      method: 'PATCH',
      body: ownershipTransfers ? { ...input, ownershipTransfers } : input,
    }
  );

  return updateMemberRolesResponseSchema.parse(response);
}
