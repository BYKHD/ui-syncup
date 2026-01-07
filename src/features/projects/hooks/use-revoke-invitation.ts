/**
 * USE REVOKE INVITATION HOOK
 * React Query mutation for revoking a project invitation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectKeys } from './use-project'
import { revokeInvitation } from '../api'
import type { RevokeInvitationResponse } from '../api'

// ============================================================================
// HOOK
// ============================================================================

export interface UseRevokeInvitationOptions {
  onSuccess?: (data: RevokeInvitationResponse) => void
  onError?: (error: Error) => void
}

export interface UseRevokeInvitationParams {
  projectId: string
  invitationId: string
}

export interface UseRevokeInvitationResult {
  mutate: (params: UseRevokeInvitationParams) => void
  mutateAsync: (params: UseRevokeInvitationParams) => Promise<RevokeInvitationResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for revoking a project invitation
 */
export function useRevokeInvitation(options?: UseRevokeInvitationOptions): UseRevokeInvitationResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ projectId, invitationId }: UseRevokeInvitationParams) =>
      revokeInvitation(projectId, invitationId),
    onSuccess: (data, variables) => {
      // Invalidate invitations query
      queryClient.invalidateQueries({ 
        queryKey: [...projectKeys.detail(variables.projectId), 'invitations'] 
      })

      toast.success('Invitation revoked successfully')
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke invitation')
      options?.onError?.(error)
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  }
}
