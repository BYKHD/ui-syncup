/**
 * CREATE INVITATION API
 * Creates a new project invitation
 */

import { apiClient } from '@/lib/api-client'
import {
  CreateInvitationBodySchema,
  CreateInvitationResponseSchema,
  type CreateInvitationBody,
  type CreateInvitationResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Creates a new project invitation
 *
 * @example
 * const result = await createInvitation('project_123', {
 *   email: 'developer@example.com',
 *   role: 'member'
 * })
 */
export async function createInvitation(
  projectId: string,
  body: CreateInvitationBody
): Promise<CreateInvitationResponse> {
  // Validate input body
  const validatedBody = CreateInvitationBodySchema.parse(body)

  // Make API request
  const response = await apiClient<CreateInvitationResponse>(
    `/api/projects/${projectId}/invitations`,
    {
      method: 'POST',
      body: validatedBody,
    }
  )

  // Validate response
  return CreateInvitationResponseSchema.parse(response)
}
