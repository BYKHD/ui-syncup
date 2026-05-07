import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { declineAccessRequest } from '../api'
import type { AccessRequest } from '../api'
import { projectKeys } from './use-project'

export interface UseDeclineAccessRequestParams {
  projectId: string
  requestId: string
}

export interface UseDeclineAccessRequestResult {
  mutate: (params: UseDeclineAccessRequestParams) => void
  mutateAsync: (params: UseDeclineAccessRequestParams) => Promise<AccessRequest>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

export function useDeclineAccessRequest(): UseDeclineAccessRequestResult {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ projectId, requestId }: UseDeclineAccessRequestParams) =>
      declineAccessRequest(projectId, requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.accessRequests(variables.projectId) })
      toast.success('Request declined.')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to decline request'),
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
