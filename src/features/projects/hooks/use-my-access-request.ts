import { useQuery } from '@tanstack/react-query'
import type { AccessRequest } from '../api'
import { projectKeys } from './use-project'

export interface UseMyAccessRequestResult {
  data: AccessRequest | null
  isLoading: boolean
}

export function useMyAccessRequest(projectId: string, initialData: AccessRequest | null): UseMyAccessRequestResult {
  const query = useQuery({
    queryKey: projectKeys.myAccessRequest(projectId),
    queryFn: () => Promise.resolve(initialData),
    initialData: initialData ?? undefined,
    staleTime: Infinity,
  })
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
  }
}
