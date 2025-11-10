/**
 * USE PROJECT HOOK
 * React hook for fetching a single project with stats
 */

import { useQuery } from '@tanstack/react-query'
import { getProject } from '../api/get-project'
import type { GetProjectResponse } from '../api/types'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  members: (id: string) => [...projectKeys.detail(id), 'members'] as const,
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseProjectParams {
  projectId: string
  enabled?: boolean
}

export interface UseProjectResult {
  data: GetProjectResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches a single project with stats and user role
 *
 * @example
 * const { data: project, isLoading } = useProject({ projectId: 'proj_123' })
 *
 * TODO: wire to React Query when backend is ready
 * - Currently returns mock data
 * - Uncomment the useQuery implementation below
 */
export function useProject({ projectId, enabled = true }: UseProjectParams): UseProjectResult {
  // TODO: Uncomment when backend is ready
  // const query = useQuery({
  //   queryKey: projectKeys.detail(projectId),
  //   queryFn: () => getProject(projectId),
  //   enabled: enabled && !!projectId,
  //   staleTime: 30 * 1000, // 30 seconds
  //   retry: 1,
  // })
  //
  // return {
  //   data: query.data,
  //   isLoading: query.isLoading,
  //   isError: query.isError,
  //   error: query.error,
  //   refetch: query.refetch,
  // }

  // Mock implementation for now
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  }
}
