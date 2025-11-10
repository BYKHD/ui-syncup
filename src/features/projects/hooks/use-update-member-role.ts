/**
 * USE UPDATE MEMBER ROLE HOOK
 * React Query mutation for updating a project member's role
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateMemberRole } from '../api/update-member-role'
import { projectKeys } from './use-project'
import type { UpdateMemberRoleBody, UpdateMemberRoleResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseUpdateMemberRoleOptions {
  onSuccess?: (data: UpdateMemberRoleResponse) => void
  onError?: (error: Error) => void
}

export interface UseUpdateMemberRoleParams {
  projectId: string
  memberId: string
  data: UpdateMemberRoleBody
}

export interface UseUpdateMemberRoleResult {
  mutate: (params: UseUpdateMemberRoleParams) => void
  mutateAsync: (params: UseUpdateMemberRoleParams) => Promise<UpdateMemberRoleResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for updating a member's role in a project
 *
 * @example
 * const { mutate: updateRole, isPending } = useUpdateMemberRole({
 *   onSuccess: () => {
 *     toast.success('Role updated!')
 *   }
 * })
 *
 * // Usage
 * updateRole({
 *   projectId: 'proj_123',
 *   memberId: 'user_456',
 *   data: { role: 'editor' }
 * })
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock implementation
 * - Uncomment the useMutation implementation below
 */
export function useUpdateMemberRole(
  options?: UseUpdateMemberRoleOptions
): UseUpdateMemberRoleResult {
  const queryClient = useQueryClient()

  // TODO: Uncomment when backend is ready
  // const mutation = useMutation({
  //   mutationFn: ({ projectId, memberId, data }: UseUpdateMemberRoleParams) =>
  //     updateMemberRole(projectId, memberId, data),
  //   onSuccess: (data, variables) => {
  //     // Invalidate project members
  //     queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) })
  //
  //     // Show success toast
  //     toast.success('Member role updated successfully')
  //
  //     // Call custom success handler
  //     options?.onSuccess?.(data)
  //   },
  //   onError: (error: Error) => {
  //     // Show error toast
  //     toast.error(error.message || 'Failed to update member role')
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
    mutate: async ({ projectId, memberId, data }: UseUpdateMemberRoleParams) => {
      try {
        const result = await updateMemberRole(projectId, memberId, data)
        queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
        toast.success('Member role updated successfully')
        options?.onSuccess?.(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to update member role')
        toast.error(err.message)
        options?.onError?.(err)
      }
    },
    mutateAsync: async ({ projectId, memberId, data }: UseUpdateMemberRoleParams) =>
      updateMemberRole(projectId, memberId, data),
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}
