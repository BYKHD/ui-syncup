/**
 * Get Instance Status Fetcher
 * @description Fetches the current instance setup status
 */

import { apiClient } from '@/lib/api-client';
import { InstanceStatusSchema, type InstanceStatusDTO } from './types';

export async function getInstanceStatus(): Promise<InstanceStatusDTO> {
  const response = await apiClient<InstanceStatusDTO>('/api/setup/status');
  return InstanceStatusSchema.parse(response);
}
