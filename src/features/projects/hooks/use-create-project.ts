/**
 * USE CREATE PROJECT HOOK
 * React Query mutation for creating a new project
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProject } from '../api/create-project'
import { projectKeys } from './use-project'
import type { CreateProjectBody, CreateProjectResponse } from '../api/types'

// ============================================================================
// HOOK
// ============================================================================

export interface UseCreateProjectOptions {
  onSuccess?: (data: CreateProjectResponse) => void
  onError?: (error: Error) => void
}

export interface UseCreateProjectResult {
  mutate: (data: CreateProjectBody) => void
  mutateAsync: (data: CreateProjectBody) => Promise<CreateProjectResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Mutation hook for creating a new project
 *
 * @example
 * const { mutate: createProject, isPending } = useCreateProject({
 *   onSuccess: () => {
 *     toast.success('Project created!')
 *     router.push('/projects')
 *   }
 * })
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock implementation
 * - Uncomment the useMutation implementation below
 */
export function useCreateProject(options?: UseCreateProjectOptions): UseCreateProjectResult {
  const queryClient = useQueryClient()

  // TODO: Uncomment when backend is ready
  // const mutation = useMutation({
  //   mutationFn: createProject,
  //   onSuccess: (data) => {
  //     // Invalidate project lists to refetch
  //     queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
  //
  //     // Show success toast
  //     toast.success('Project created successfully')
  //
  //     // Call custom success handler
  //     options?.onSuccess?.(data)
  //   },
  //   onError: (error: Error) => {
  //     // Show error toast
  //     toast.error(error.message || 'Failed to create project')
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
    mutate: async (data: CreateProjectBody) => {
      try {
        const result = await createProject(data)
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
        toast.success('Project created successfully')
        options?.onSuccess?.(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to create project')
        toast.error(err.message)
        options?.onError?.(err)
      }
    },
    mutateAsync: createProject,
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }
}
