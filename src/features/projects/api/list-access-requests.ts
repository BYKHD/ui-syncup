import { apiClient } from '@/lib/api-client'
import { ListAccessRequestsResponseSchema, type AccessRequestWithRequester, type ListAccessRequestsResponse } from './types'

export async function listAccessRequests(projectId: string): Promise<AccessRequestWithRequester[]> {
  const response = await apiClient<ListAccessRequestsResponse>(`/api/projects/${projectId}/access-requests`)
  return ListAccessRequestsResponseSchema.parse(response).requests
}
