/**
 * USE ARCHIVE PROJECT HOOK
 * React Query mutation for archiving a completed project.
 */

import confetti from 'canvas-confetti'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { archiveProject } from '../api'
import { projectKeys } from './use-project'
import type { ArchiveProjectResponse } from '../api/types'

export interface UseArchiveProjectOptions {
  onSuccess?: (data: ArchiveProjectResponse) => void
  onError?: (error: Error) => void
}

export interface UseArchiveProjectParams {
  projectId: string
  projectName: string
}

export interface UseArchiveProjectResult {
  mutate: (params: UseArchiveProjectParams) => void
  mutateAsync: (params: UseArchiveProjectParams) => Promise<ArchiveProjectResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

export function useArchiveProject(options?: UseArchiveProjectOptions): UseArchiveProjectResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ projectId }: UseArchiveProjectParams) => archiveProject(projectId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.activities(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.4 },
      })

      toast.success(`🎉 ${variables.projectName} is a wrap! All issues resolved.`)
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive project')
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
