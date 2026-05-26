/**
 * USE UNARCHIVE PROJECT HOOK
 * React Query mutation for restoring an archived project.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { unarchiveProject } from '../api'
import { projectKeys } from './use-project'
import type { UnarchiveProjectResponse } from '../api/types'

export interface UseUnarchiveProjectOptions {
  onSuccess?: (data: UnarchiveProjectResponse) => void
  onError?: (error: Error) => void
}

export interface UseUnarchiveProjectParams {
  projectId: string
}

export interface UseUnarchiveProjectResult {
  mutate: (params: UseUnarchiveProjectParams) => void
  mutateAsync: (params: UseUnarchiveProjectParams) => Promise<UnarchiveProjectResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

export function useUnarchiveProject(options?: UseUnarchiveProjectOptions): UseUnarchiveProjectResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ projectId }: UseUnarchiveProjectParams) => unarchiveProject(projectId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.activities(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })

      toast.success('Project restored')
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unarchive project')
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
