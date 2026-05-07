import { apiClient } from '@/lib/api-client'
import { AccessRequestActionResponseSchema, type AccessRequest, type AccessRequestActionResponse } from './types'

export async function cancelAccessRequest(projectId: string, requestId: string): Promise<AccessRequest> {
  const response = await apiClient<AccessRequestActionResponse>(
    `/api/projects/${projectId}/access-requests/${requestId}`,
    { method: 'DELETE' }
  )
  return AccessRequestActionResponseSchema.parse(response).request
}
