/**
 * Get Service Health Fetcher
 * @description Fetches the health status of all services
 */

import { apiClient } from '@/lib/api-client';
import { ServiceHealthSchema, type ServiceHealthDTO } from './types';

export async function getServiceHealth(): Promise<ServiceHealthDTO> {
  const response = await apiClient<ServiceHealthDTO>('/api/setup/health');
  return ServiceHealthSchema.parse(response);
}
