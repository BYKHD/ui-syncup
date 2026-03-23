'use client'

import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/get-health'

export function useHealth(refetchIntervalMs = 30_000) {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: refetchIntervalMs,
    retry: 1,
  })
}
