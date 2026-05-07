import { apiClient } from '@/lib/api-client'
import {
  CreateAccessRequestBodySchema,
  CreateAccessRequestResponseSchema,
  type CreateAccessRequestBody,
  type CreateAccessRequestResponse,
} from './types'

export async function createAccessRequest(
  projectId: string,
  body: CreateAccessRequestBody
): Promise<CreateAccessRequestResponse> {
  const validatedBody = CreateAccessRequestBodySchema.parse(body)
  const response = await apiClient<CreateAccessRequestResponse>(
    `/api/projects/${projectId}/access-requests`,
    { method: 'POST', body: validatedBody }
  )
  return CreateAccessRequestResponseSchema.parse(response)
}
