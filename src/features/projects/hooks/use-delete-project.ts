/**
 * USE DELETE PROJECT HOOK
 * React Query mutation for deleting a project
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteProject } from '../api/delete-project'
import { projectKeys } from './use-project'
import type { DeleteProjectResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseDeleteProjectOptions {
  onSuccess?: (data: DeleteProjectResponse) => void
  onError?: (error: Error) => void
}

export interface UseDeleteProjectResult {
  mutate: (projectId: string) => void
  mutateAsync: (projectId: string) => Promise<DeleteProjectResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for deleting a project (owner only)
 *
 * @example
 * const { mutate: deleteProject, isPending } = useDeleteProject({
 *   onSuccess: () => {
 *     toast.success('Project deleted!')
 *     router.push('/projects')
 *   }
 * })
 *
 * // Usage
 * deleteProject('proj_123')
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock implementation
 * - Uncomment the useMutation implementation below
 */
export function useDeleteProject(options?: UseDeleteProjectOptions): UseDeleteProjectResult {
  const queryClient = useQueryClient()

  // TODO: Uncomment when backend is ready
  // const mutation = useMutation({
  //   mutationFn: deleteProject,
  //   onSuccess: (data, projectId) => {
  //     // Remove from cache
  //     queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) })
  //     queryClient.removeQueries({ queryKey: projectKeys.members(projectId) })
  //
  //     // Invalidate lists to refetch
  //     queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
  //
  //     // Show success toast
  //     toast.success('Project deleted successfully')
  //
  //     // Call custom success handler
  //     options?.onSuccess?.(data)
  //   },
  //   onError: (error: Error) => {
  //     // Show error toast
  //     toast.error(error.message || 'Failed to delete project')
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
        const result = await deleteProject(projectId)
        queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) })
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
        toast.success('Project deleted successfully')
        options?.onSuccess?.(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to delete project')
        toast.error(err.message)
        options?.onError?.(err)
      }
    },
    mutateAsync: deleteProject,
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}
