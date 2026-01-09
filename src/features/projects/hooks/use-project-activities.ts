/**
 * USE PROJECT ACTIVITIES HOOK
 * React hook for fetching project activities
 */

import { useQuery } from '@tanstack/react-query'
import { getProjectActivities } from '../api/get-project-activities'
import { projectKeys } from './use-project'
import type { ListProjectActivitiesResponse } from '../api/types'

export interface UseProjectActivitiesParams {
  projectId: string
  enabled?: boolean
}

export interface UseProjectActivitiesResult {
  data: ListProjectActivitiesResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export function useProjectActivities({ projectId, enabled = true }: UseProjectActivitiesParams): UseProjectActivitiesResult {
  const query = useQuery({
    queryKey: projectKeys.activities(projectId),
    queryFn: () => getProjectActivities(projectId),
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  }
}
