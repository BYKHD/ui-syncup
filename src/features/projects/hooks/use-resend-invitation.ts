/**
 * USE RESEND INVITATION HOOK
 * React Query mutation for resending a project invitation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectKeys } from './use-project'

// ============================================================================
// API FUNCTION
// ============================================================================

interface ResendInvitationResponse {
  success: boolean
  message: string
}

async function resendInvitation(
  projectId: string,
  invitationId: string
): Promise<ResendInvitationResponse> {
  const response = await fetch(`/api/projects/${projectId}/invitations/${invitationId}/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || error?.error?.message || 'Failed to resend invitation')
  }

  return response.json()
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseResendInvitationOptions {
  onSuccess?: (data: ResendInvitationResponse) => void
  onError?: (error: Error) => void
}

export interface UseResendInvitationParams {
  projectId: string
  invitationId: string
}

export interface UseResendInvitationResult {
  mutate: (params: UseResendInvitationParams) => void
  mutateAsync: (params: UseResendInvitationParams) => Promise<ResendInvitationResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for resending a project invitation
 */
export function useResendInvitation(options?: UseResendInvitationOptions): UseResendInvitationResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ projectId, invitationId }: UseResendInvitationParams) =>
      resendInvitation(projectId, invitationId),
    onSuccess: (data, variables) => {
      // Invalidate invitations query
      queryClient.invalidateQueries({ 
        queryKey: [...projectKeys.detail(variables.projectId), 'invitations'] 
      })

      toast.success('Invitation resent successfully')
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resend invitation')
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
