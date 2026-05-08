import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { approveAccessRequest } from '../api'
import type { AccessRequest } from '../api'
import { projectKeys } from './use-project'

export interface UseApproveAccessRequestParams {
  projectId: string
  requestId: string
}

export interface UseApproveAccessRequestResult {
  mutate: (params: UseApproveAccessRequestParams) => void
  mutateAsync: (params: UseApproveAccessRequestParams) => Promise<AccessRequest>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

export function useApproveAccessRequest(): UseApproveAccessRequestResult {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ projectId, requestId }: UseApproveAccessRequestParams) =>
      approveAccessRequest(projectId, requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.accessRequests(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) })
      toast.success('Access granted.')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to approve request'),
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
