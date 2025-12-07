/**
 * USE PROJECT MEMBERS HOOK
 * React hook for fetching project members
 */

import { useQuery } from '@tanstack/react-query'
import { getProjectMembers } from '../api/get-project-members'
import { projectKeys } from './use-project'
import type { GetProjectMembersResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseProjectMembersParams {
  projectId: string
  enabled?: boolean
}

export interface UseProjectMembersResult {
  data: GetProjectMembersResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches all members of a project with their roles
 *
 * @example
 * const { data, isLoading } = useProjectMembers({ projectId: 'proj_123' })
 *
 * TODO: wire to React Query when backend is ready
 * - Currently returns mock data
 * - Uncomment the useQuery implementation below
 */
export function useProjectMembers({
  projectId,
  enabled = true,
}: UseProjectMembersParams): UseProjectMembersResult {
  const query = useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
