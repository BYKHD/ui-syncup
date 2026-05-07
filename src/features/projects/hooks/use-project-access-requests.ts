import { useQuery } from '@tanstack/react-query'
import { listAccessRequests } from '../api'
import type { AccessRequestWithRequester } from '../api'
import { projectKeys } from './use-project'

export interface UseProjectAccessRequestsResult {
  data: AccessRequestWithRequester[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export function useProjectAccessRequests(projectId: string, enabled = true): UseProjectAccessRequestsResult {
  const query = useQuery({
    queryKey: projectKeys.accessRequests(projectId),
    queryFn: () => listAccessRequests(projectId),
    enabled: enabled && !!projectId,
    staleTime: 30_000,
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
