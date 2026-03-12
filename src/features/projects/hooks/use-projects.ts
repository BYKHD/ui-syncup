import { useQuery } from '@tanstack/react-query'
import { getProjects } from '@/features/projects/api'
import { projectKeys } from './use-project'
import type { GetProjectsResponse } from '@/features/projects/api/types'

interface UseProjectsParams {
  teamId?: string
  status?: 'active' | 'archived'
  visibility?: 'public' | 'private'
  search?: string
  page?: number
  limit?: number
  enabled?: boolean
}

interface UseProjectsResult {
  data: GetProjectsResponse | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useProjects({ 
  teamId, 
  status, 
  visibility, 
  search, 
  page = 1, 
  limit = 20,
  enabled = true 
}: UseProjectsParams): UseProjectsResult {
  const query = useQuery({
    queryKey: projectKeys.list({ teamId, status, visibility, search, page, limit }),
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required')
      return getProjects({ teamId, status, visibility, search, page, limit })
    },
    enabled: enabled && !!teamId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
