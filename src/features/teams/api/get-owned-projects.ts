import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const OwnedProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
});

const EligibleOwnerSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});

const OwnedProjectsResponseSchema = z.object({
  ownedProjects: z.array(OwnedProjectSchema),
  eligibleOwners: z.array(EligibleOwnerSchema),
});

export type OwnedProject = z.infer<typeof OwnedProjectSchema>;
export type EligibleOwner = z.infer<typeof EligibleOwnerSchema>;
export type OwnedProjectsResponse = z.infer<typeof OwnedProjectsResponseSchema>;

export async function getOwnedProjects(
  teamId: string,
  userId: string
): Promise<OwnedProjectsResponse> {
  const response = await apiClient<OwnedProjectsResponse>(
    `/api/teams/${teamId}/members/${userId}/owned-projects`,
    { method: 'GET' }
  );
  return OwnedProjectsResponseSchema.parse(response);
}
