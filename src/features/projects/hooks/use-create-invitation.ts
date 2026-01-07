/**
 * USE CREATE INVITATION HOOK
 * React Query mutation for creating a project invitation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectKeys } from './use-project'
import { createInvitation } from '../api'
import type { CreateInvitationResponse, CreateInvitationBody } from '../api'

// ============================================================================
// HOOK
// ============================================================================

export interface UseCreateInvitationOptions {
  onSuccess?: (data: CreateInvitationResponse) => void
  onError?: (error: Error) => void
}

export interface UseCreateInvitationParams {
  projectId: string
  data: CreateInvitationBody
}

export interface UseCreateInvitationResult {
  mutate: (params: UseCreateInvitationParams) => void
  mutateAsync: (params: UseCreateInvitationParams) => Promise<CreateInvitationResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for creating a project invitation
 */
export function useCreateInvitation(options?: UseCreateInvitationOptions): UseCreateInvitationResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ projectId, data }: UseCreateInvitationParams) =>
      createInvitation(projectId, data),
    onSuccess: (data, variables) => {
      // Invalidate invitations query to include new invitation
      queryClient.invalidateQueries({ 
        queryKey: [...projectKeys.detail(variables.projectId), 'invitations'] 
      })

      toast.success('Invitation sent successfully')
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      // Show specific error messages
      const message = error.message || 'Failed to send invitation'
      
      if (message.includes('already a member')) {
        toast.error('This user is already a member of the project')
      } else if (message.includes('active invitation')) {
        toast.error('An invitation has already been sent to this email')
      } else if (message.includes('rate limit')) {
        toast.error('Too many invitations sent. Please try again later.')
      } else {
        toast.error(message)
      }
      
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
