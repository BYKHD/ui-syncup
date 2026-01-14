/**
 * LIST INVITATIONS API
 * Fetches all invitations for a project
 */

import { apiClient } from '@/lib/api-client'
import {
  ListInvitationsResponseSchema,
  type ListInvitationsResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Lists all invitations for a project with enriched user details
 *
 * @example
 * const result = await listInvitations('project_123')
 * console.log(result.invitations) // Array of invitations with user info
 */
export async function listInvitations(
  projectId: string
): Promise<ListInvitationsResponse> {
  // Make API request
  const response = await apiClient<ListInvitationsResponse>(
    `/api/projects/${projectId}/invitations`,
    {
      method: 'GET',
    }
  )

  // Validate response
  return ListInvitationsResponseSchema.parse(response)
}
