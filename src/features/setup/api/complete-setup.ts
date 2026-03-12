/**
 * Complete Setup Fetcher
 * @description Marks setup as complete and optionally creates sample data
 */

import { apiClient } from '@/lib/api-client';
import {
  SetupCompleteResponseSchema,
  type SetupCompleteRequestDTO,
  type SetupCompleteResponseDTO,
} from './types';

export async function completeSetup(
  data: SetupCompleteRequestDTO
): Promise<SetupCompleteResponseDTO> {
  const response = await apiClient<SetupCompleteResponseDTO>('/api/setup/complete', {
    method: 'POST',
    body: data,
  });
  return SetupCompleteResponseSchema.parse(response);
}
