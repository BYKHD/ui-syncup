/**
 * USE PROJECT INVITATIONS HOOK
 * React hook for fetching project invitations
 */

import { useQuery } from '@tanstack/react-query'
import { projectKeys } from './use-project'
import { listInvitations } from '../api'
import type { ProjectInvitationWithUsers } from '../api'

// ============================================================================
// TYPES
// ============================================================================

// Note: Using types from API layer for consistency
export type { ProjectInvitationWithUsers } from '../api'


// ============================================================================
// HOOK
// ============================================================================

export interface UseProjectInvitationsParams {
  projectId: string
  enabled?: boolean
}

export interface UseProjectInvitationsResult {
  data: { invitations: ProjectInvitationWithUsers[] } | undefined
  invitations: ProjectInvitationWithUsers[]
  pendingInvitations: ProjectInvitationWithUsers[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches all invitations for a project
 */
export function useProjectInvitations({
  projectId,
  enabled = true,
}: UseProjectInvitationsParams): UseProjectInvitationsResult {
  const query = useQuery({
    queryKey: [...projectKeys.detail(projectId), 'invitations'],
    queryFn: () => listInvitations(projectId),
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })

  const invitations = query.data?.invitations || []
  const pendingInvitations = invitations.filter((inv: ProjectInvitationWithUsers) => inv.status === 'pending')

  return {
    data: query.data,
    invitations,
    pendingInvitations,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

