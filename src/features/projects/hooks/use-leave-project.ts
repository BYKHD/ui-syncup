/**
 * USE LEAVE PROJECT HOOK
 * React Query mutation for current user to leave a project
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { leaveProject } from '../api/leave-project'
import { projectKeys } from './use-project'
import type { LeaveMemberResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseLeaveProjectOptions {
  onSuccess?: (data: LeaveMemberResponse) => void
  onError?: (error: Error) => void
}

export interface UseLeaveProjectResult {
  mutate: (projectId: string) => void
  mutateAsync: (projectId: string) => Promise<LeaveMemberResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for current user to leave a project
 *
 * @example
 * const { mutate: leaveProject, isPending } = useLeaveProject({
 *   onSuccess: () => {
 *     toast.success('You have left the project')
 *     router.push('/projects')
 *   }
 * })
 *
 * // Usage
 * leaveProject('proj_123')
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock implementation
 * - Uncomment the useMutation implementation below
 */
export function useLeaveProject(options?: UseLeaveProjectOptions): UseLeaveProjectResult {
  const queryClient = useQueryClient()

  // TODO: Uncomment when backend is ready
  // const mutation = useMutation({
  //   mutationFn: leaveProject,
  //   onSuccess: (data, projectId) => {
  //     // Remove project from cache
  //     queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) })
  //     queryClient.removeQueries({ queryKey: projectKeys.members(projectId) })
  //
  //     // Invalidate lists to refetch
  //     queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
  //
  //     // Show success toast
  //     toast.success('You have left the project')
  //
  //     // Call custom success handler
  //     options?.onSuccess?.(data)
  //   },
  //   onError: (error: Error) => {
  //     // Show error toast
  //     toast.error(error.message || 'Failed to leave project')
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
    mutate: async (projectId: string) => {
      try {
        const result = await leaveProject(projectId)
        queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) })
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
        toast.success('You have left the project')
        options?.onSuccess?.(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to leave project')
        toast.error(err.message)
        options?.onError?.(err)
      }
    },
    mutateAsync: leaveProject,
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}
