/**
 * RESEND INVITATION API
 * Resends a project invitation with a new token
 */

import { apiClient } from '@/lib/api-client'
import {
  ResendInvitationResponseSchema,
  type ResendInvitationResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Resends a project invitation (generates new token and extends expiration)
 *
 * @example
 * await resendInvitation('project_123', 'invitation_456')
 */
export async function resendInvitation(
  projectId: string,
  invitationId: string
): Promise<ResendInvitationResponse> {
  // Make API request
  const response = await apiClient<ResendInvitationResponse>(
    `/api/projects/${projectId}/invitations/${invitationId}/resend`,
    {
      method: 'POST',
    }
  )

  // Validate response
  return ResendInvitationResponseSchema.parse(response)
}
