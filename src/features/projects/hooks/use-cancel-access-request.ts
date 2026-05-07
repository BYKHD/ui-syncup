import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cancelAccessRequest } from '../api'
import type { AccessRequest } from '../api'
import { projectKeys } from './use-project'

export interface UseCancelAccessRequestParams {
  projectId: string
  requestId: string
}

export interface UseCancelAccessRequestResult {
  mutate: (params: UseCancelAccessRequestParams) => void
  mutateAsync: (params: UseCancelAccessRequestParams) => Promise<AccessRequest>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

export function useCancelAccessRequest(): UseCancelAccessRequestResult {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ projectId, requestId }: UseCancelAccessRequestParams) =>
      cancelAccessRequest(projectId, requestId),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(projectKeys.myAccessRequest(variables.projectId), null)
      toast.success('Request cancelled.')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to cancel request'),
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
