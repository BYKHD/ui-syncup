/**
 * Create First Workspace Fetcher
 * @description Creates the initial workspace during setup
 */

import { apiClient } from '@/lib/api-client';
import {
  FirstWorkspaceResponseSchema,
  type FirstWorkspaceRequestDTO,
  type FirstWorkspaceResponseDTO,
} from './types';

export async function createFirstWorkspace(
  data: FirstWorkspaceRequestDTO
): Promise<FirstWorkspaceResponseDTO> {
  const response = await apiClient<FirstWorkspaceResponseDTO>('/api/setup/workspace', {
    method: 'POST',
    body: data,
  });
  return FirstWorkspaceResponseSchema.parse(response);
}
