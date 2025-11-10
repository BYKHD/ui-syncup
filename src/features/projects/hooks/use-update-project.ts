/**
 * USE UPDATE PROJECT HOOK
 * React Query mutation for updating a project
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateProject } from '../api/update-project'
import { projectKeys } from './use-project'
import type { UpdateProjectBody, UpdateProjectResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseUpdateProjectOptions {
  onSuccess?: (data: UpdateProjectResponse) => void
  onError?: (error: Error) => void
}

export interface UseUpdateProjectParams {
  projectId: string
  data: UpdateProjectBody
}

export interface UseUpdateProjectResult {
  mutate: (params: UseUpdateProjectParams) => void
  mutateAsync: (params: UseUpdateProjectParams) => Promise<UpdateProjectResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for updating a project
 *
 * @example
 * const { mutate: updateProject, isPending } = useUpdateProject({
 *   onSuccess: () => {
 *     toast.success('Project updated!')
 *   }
 * })
 *
 * // Usage
 * updateProject({
 *   projectId: 'proj_123',
 *   data: { name: 'New Name', visibility: 'public' }
 * })
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock implementation
 * - Uncomment the useMutation implementation below
 */
export function useUpdateProject(options?: UseUpdateProjectOptions): UseUpdateProjectResult {
  const queryClient = useQueryClient()

  // TODO: Uncomment when backend is ready
  // const mutation = useMutation({
  //   mutationFn: ({ projectId, data }: UseUpdateProjectParams) => updateProject(projectId, data),
  //   onSuccess: (data, variables) => {
  //     // Invalidate specific project and lists
  //     queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
  //     queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
  //
  //     // Show success toast
  //     toast.success('Project updated successfully')
  //
  //     // Call custom success handler
  //     options?.onSuccess?.(data)
  //   },
  //   onError: (error: Error) => {
  //     // Show error toast
  //     toast.error(error.message || 'Failed to update project')
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
    mutate: async ({ projectId, data }: UseUpdateProjectParams) => {
      try {
        const result = await updateProject(projectId, data)
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
        toast.success('Project updated successfully')
        options?.onSuccess?.(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to update project')
        toast.error(err.message)
        options?.onError?.(err)
      }
    },
    mutateAsync: async ({ projectId, data }: UseUpdateProjectParams) =>
      updateProject(projectId, data),
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}
