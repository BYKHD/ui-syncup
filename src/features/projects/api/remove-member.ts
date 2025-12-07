/**
 * REMOVE MEMBER API
 * Removes a member from a project (owner/editor only)
 */

import { RemoveMemberResponseSchema, type RemoveMemberResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Removes a member from a project
 *
 * @example
 * const result = await removeMember('proj_123', 'user_456')
 *
 * TODO: wire to DELETE /api/projects/:projectId/members/:memberId
 * - Add proper error handling (404, 403)
 * - Add authentication headers
 * - Configure base URL from environment
 * - Prevent removing the last owner
 */
export async function removeMember(
  projectId: string,
  memberId: string
): Promise<RemoveMemberResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  if (!memberId) {
    throw new Error('Member ID is required')
  }

  // TODO: Replace with actual API call
  const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include httpOnly cookies
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project or member not found')
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to remove members')
    }
    if (response.status === 400) {
      const error = await response.json()
      throw new Error(error.message || 'Cannot remove member')
    }
    throw new Error(`Failed to remove member: ${response.statusText}`)
  }

  const data = await response.json()
  return RemoveMemberResponseSchema.parse(data)
}
