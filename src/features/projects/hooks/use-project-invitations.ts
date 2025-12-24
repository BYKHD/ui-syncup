/**
 * USE PROJECT INVITATIONS HOOK
 * React hook for fetching project invitations
 */

import { useQuery } from '@tanstack/react-query'
import { projectKeys } from './use-project'

// ============================================================================
// TYPES
// ============================================================================

interface ProjectInvitation {
  id: string
  invitedUserId: string | null
  role: 'editor' | 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: string
  expiresAt: string
  invitedUser: {
    id: string
    name: string
    email: string
    image: string | null
  }
  invitedByUser: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

interface GetProjectInvitationsResponse {
  invitations: ProjectInvitation[]
}

// ============================================================================
// API FUNCTION
// ============================================================================

async function getProjectInvitations(projectId: string): Promise<GetProjectInvitationsResponse> {
  const response = await fetch(`/api/projects/${projectId}/invitations`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || `Failed to fetch invitations (${response.status})`)
  }

  return response.json()
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseProjectInvitationsParams {
  projectId: string
  enabled?: boolean
}

export interface UseProjectInvitationsResult {
  data: GetProjectInvitationsResponse | undefined
  invitations: ProjectInvitation[]
  pendingInvitations: ProjectInvitation[]
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
    queryFn: () => getProjectInvitations(projectId),
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })

  const invitations = query.data?.invitations || []
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')

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
