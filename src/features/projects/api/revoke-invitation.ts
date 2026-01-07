/**
 * REVOKE INVITATION API
 * Revokes/cancels a pending project invitation
 */

import { apiClient } from '@/lib/api-client'
import {
  RevokeInvitationResponseSchema,
  type RevokeInvitationResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Revokes a project invitation
 *
 * @example
 * await revokeInvitation('project_123', 'invitation_456')
 */
export async function revokeInvitation(
  projectId: string,
  invitationId: string
): Promise<RevokeInvitationResponse> {
  // Make API request
  const response = await apiClient<RevokeInvitationResponse>(
    `/api/projects/${projectId}/invitations/${invitationId}`,
    {
      method: 'DELETE',
    }
  )

  // Validate response
  return RevokeInvitationResponseSchema.parse(response)
}
