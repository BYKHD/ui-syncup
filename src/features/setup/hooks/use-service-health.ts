'use client';

/**
 * useServiceHealth Hook
 * @description React Query hook for fetching service health status
 */

import { useQuery } from '@tanstack/react-query';
import { getServiceHealth } from '../api';
import type { ServiceHealthDTO } from '../api';

export const SERVICE_HEALTH_QUERY_KEY = ['setup', 'service-health'] as const;

export function useServiceHealth() {
  return useQuery<ServiceHealthDTO>({
    queryKey: SERVICE_HEALTH_QUERY_KEY,
    queryFn: getServiceHealth,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}
