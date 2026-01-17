'use client';

/**
 * useInstanceStatus Hook
 * @description React Query hook for fetching instance setup status
 */

import { useQuery } from '@tanstack/react-query';
import { getInstanceStatus } from '../api';
import type { InstanceStatusDTO } from '../api';

export const INSTANCE_STATUS_QUERY_KEY = ['setup', 'instance-status'] as const;

export function useInstanceStatus() {
  return useQuery<InstanceStatusDTO>({
    queryKey: INSTANCE_STATUS_QUERY_KEY,
    queryFn: getInstanceStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
