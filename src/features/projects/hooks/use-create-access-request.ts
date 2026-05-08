import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createAccessRequest } from '../api'
import type { CreateAccessRequestResponse, CreateAccessRequestBody } from '../api'
import { projectKeys } from './use-project'

export interface UseCreateAccessRequestOptions {
  onSuccess?: (data: CreateAccessRequestResponse) => void
  onError?: (error: Error) => void
}

export interface UseCreateAccessRequestParams {
  projectId: string
  body: CreateAccessRequestBody
}

export interface UseCreateAccessRequestResult {
  mutate: (params: UseCreateAccessRequestParams) => void
  mutateAsync: (params: UseCreateAccessRequestParams) => Promise<CreateAccessRequestResponse>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

export function useCreateAccessRequest(options?: UseCreateAccessRequestOptions): UseCreateAccessRequestResult {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ projectId, body }: UseCreateAccessRequestParams) => createAccessRequest(projectId, body),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(projectKeys.myAccessRequest(variables.projectId), data.request)
      toast.success("Request sent — we'll email you when it's reviewed.")
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      const message = error.message || 'Failed to send request'
      if (message.includes('ALREADY_MEMBER')) {
        toast.error("You're already a member of this project.")
      } else if (message.includes('REQUEST_PENDING')) {
        toast.error('You already have a pending request for this project.')
      } else if (message.includes('COOLDOWN_ACTIVE')) {
        toast.error('Please wait before requesting access again.')
      } else {
        toast.error(message)
      }
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
