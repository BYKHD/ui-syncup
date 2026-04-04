/**
 * Create First Team Fetcher
 * @description Creates the initial team during setup
 */

import { apiClient } from '@/lib/api-client';
import {
  FirstTeamResponseSchema,
  type FirstTeamRequestDTO,
  type FirstTeamResponseDTO,
} from './types';

export async function createFirstTeam(
  data: FirstTeamRequestDTO
): Promise<FirstTeamResponseDTO> {
  const response = await apiClient<FirstTeamResponseDTO>('/api/setup/team', {
    method: 'POST',
    body: data,
  });
  return FirstTeamResponseSchema.parse(response);
}
