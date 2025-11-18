/**
 * UPDATE MEMBER ROLE API
 * Updates a project member's role (owner/editor only)
 */

import {
  UpdateMemberRoleBodySchema,
  UpdateMemberRoleResponseSchema,
  type UpdateMemberRoleBody,
  type UpdateMemberRoleResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Updates a member's role in a project
 *
 * @example
 * const result = await updateMemberRole('proj_123', 'user_456', { role: 'editor' })
 *
 * TODO: wire to PATCH /api/projects/:projectId/members/:memberId
 * - Add proper error handling (404, 403, validation)
 * - Add authentication headers
 * - Configure base URL from environment
 * - Prevent owner from removing their own owner role if they're the last owner
 */
export async function updateMemberRole(
  projectId: string,
  memberId: string,
  body: UpdateMemberRoleBody
): Promise<UpdateMemberRoleResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  if (!memberId) {
    throw new Error('Member ID is required')
  }

  // Validate input body
  const validatedBody = UpdateMemberRoleBodySchema.parse(body)

  // TODO: Replace with actual API call
  // const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
  //   method: 'PATCH',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   credentials: 'include', // Include httpOnly cookies
  //   body: JSON.stringify(validatedBody),
  // })
  //
  // if (!response.ok) {
  //   if (response.status === 404) {
  //     throw new Error('Project or member not found')
  //   }
  //   if (response.status === 403) {
  //     throw new Error('You do not have permission to update member roles')
  //   }
  //   if (response.status === 400) {
  //     const error = await response.json()
  //     throw new Error(error.message || 'Invalid role update')
  //   }
  //   throw new Error(`Failed to update member role: ${response.statusText}`)
  // }
  //
  // const data = await response.json()
  // return UpdateMemberRoleResponseSchema.parse(data)

  // Mock implementation for now
  await new Promise((resolve) => setTimeout(resolve, 600))

  throw new Error('Mock: Update not implemented - wire to real API')
}
