import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { joinProject } from '../api'
import { projectKeys } from './use-project'

interface UseJoinProjectOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useJoinProject(options?: UseJoinProjectOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: joinProject,
    onSuccess: (data, projectId) => {
      // Invalidate project detail and members
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })

      // Show success message
      toast.success(data.message)

      // Call optional success callback
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      const message = error instanceof Error ? error.message : 'Failed to join project'
      toast.error(message)
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
