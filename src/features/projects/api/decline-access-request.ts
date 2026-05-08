import { apiClient } from '@/lib/api-client'
import { AccessRequestActionResponseSchema, type AccessRequest, type AccessRequestActionResponse } from './types'

export async function declineAccessRequest(projectId: string, requestId: string): Promise<AccessRequest> {
  const response = await apiClient<AccessRequestActionResponse>(
    `/api/projects/${projectId}/access-requests/${requestId}/decline`,
    { method: 'POST' }
  )
  return AccessRequestActionResponseSchema.parse(response).request
}
