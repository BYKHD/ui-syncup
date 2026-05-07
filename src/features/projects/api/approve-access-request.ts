import { apiClient } from '@/lib/api-client'
import { AccessRequestActionResponseSchema, type AccessRequest, type AccessRequestActionResponse } from './types'

export async function approveAccessRequest(projectId: string, requestId: string): Promise<AccessRequest> {
  const response = await apiClient<AccessRequestActionResponse>(
    `/api/projects/${projectId}/access-requests/${requestId}/approve`,
    { method: 'POST' }
  )
  return AccessRequestActionResponseSchema.parse(response).request
}
