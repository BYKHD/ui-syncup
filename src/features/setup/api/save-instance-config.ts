/**
 * Save Instance Config Fetcher
 * @description Saves the instance configuration during setup
 */

import { apiClient } from '@/lib/api-client';
import {
  InstanceConfigResponseSchema,
  type InstanceConfigRequestDTO,
  type InstanceConfigResponseDTO,
} from './types';

export async function saveInstanceConfig(
  data: InstanceConfigRequestDTO
): Promise<InstanceConfigResponseDTO> {
  const response = await apiClient<InstanceConfigResponseDTO>('/api/setup/config', {
    method: 'POST',
    body: data,
  });
  return InstanceConfigResponseSchema.parse(response);
}
