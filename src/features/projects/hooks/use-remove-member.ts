/**
 * USE REMOVE MEMBER HOOK
 * React Query mutation for removing a project member
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { removeMember } from '../api/remove-member'
import { projectKeys } from './use-project'
import type { RemoveMemberResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseRemoveMemberOptions {
  onSuccess?: (data: RemoveMemberResponse) => void
  onError?: (error: Error) => void
}

export interface UseRemoveMemberParams {
  projectId: string
  memberId: string
}

export interface UseRemoveMemberResult {
  mutate: (params: UseRemoveMemberParams) => void
  mutateAsync: (params: UseRemoveMemberParams) => Promise<RemoveMemberResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for removing a member from a project
 *
 * @example
 * const { mutate: removeMember, isPending } = useRemoveMember({
 *   onSuccess: () => {
 *     toast.success('Member removed!')
 *   }
 * })
 *
 * // Usage
 * removeMember({
 *   projectId: 'proj_123',
 *   memberId: 'user_456'
 * })
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock implementation
 * - Uncomment the useMutation implementation below
 */
export function useRemoveMember(options?: UseRemoveMemberOptions): UseRemoveMemberResult {
  const queryClient = useQueryClient()

  // TODO: Uncomment when backend is ready
  // const mutation = useMutation({
  //   mutationFn: ({ projectId, memberId }: UseRemoveMemberParams) =>
  //     removeMember(projectId, memberId),
  //   onSuccess: (data, variables) => {
  //     // Invalidate project members and detail
  //     queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) })
  //     queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
  //
  //     // Show success toast
  //     toast.success('Member removed successfully')
  //
  //     // Call custom success handler
  //     options?.onSuccess?.(data)
  //   },
  //   onError: (error: Error) => {
  //     // Show error toast
  //     toast.error(error.message || 'Failed to remove member')
  //
  //     // Call custom error handler
  //     options?.onError?.(error)
  //   },
  // })
  //
  // return {
  //   mutate: mutation.mutate,
  //   mutateAsync: mutation.mutateAsync,
  //   isPending: mutation.isPending,
  //   isError: mutation.isError,
  //   error: mutation.error,
  //   reset: mutation.reset,
  // }

  // Mock implementation for now
  return {
    mutate: async ({ projectId, memberId }: UseRemoveMemberParams) => {
      try {
        const result = await removeMember(projectId, memberId)
        queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
        toast.success('Member removed successfully')
        options?.onSuccess?.(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to remove member')
        toast.error(err.message)
        options?.onError?.(err)
      }
    },
    mutateAsync: async ({ projectId, memberId }: UseRemoveMemberParams) =>
      removeMember(projectId, memberId),
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}
