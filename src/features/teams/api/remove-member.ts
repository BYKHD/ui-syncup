import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const removeMemberResponseSchema = z.object({
  message: z.string(),
});

export type RemoveMemberResponse = z.infer<typeof removeMemberResponseSchema>;

export interface OwnershipTransfer {
  projectId: string;
  newOwnerId: string;
}

export async function removeMember(
  teamId: string,
  userId: string,
  ownershipTransfers?: OwnershipTransfer[]
): Promise<RemoveMemberResponse> {
  const response = await apiClient<RemoveMemberResponse>(
    `/api/teams/${teamId}/members/${userId}`,
    {
      method: 'DELETE',
      body: ownershipTransfers ? JSON.stringify({ ownershipTransfers }) : undefined,
    }
  );

  return removeMemberResponseSchema.parse(response);
}
