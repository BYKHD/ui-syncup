/**
 * LEAVE PROJECT API
 * Current user leaves a project
 */

import { LeaveMemberResponseSchema, type LeaveMemberResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Leave a project (current user)
 *
 * @example
 * const result = await leaveProject('proj_123')
 *
 * TODO: wire to DELETE /api/projects/:projectId/members/me
 * - Add proper error handling (404, 400)
 * - Add authentication headers
 * - Configure base URL from environment
 * - Prevent owner from leaving if they're the last owner
 */
export async function leaveProject(projectId: string): Promise<LeaveMemberResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  // TODO: Replace with actual API call
  // const response = await fetch(`/api/projects/${projectId}/members/me`, {
  //   method: 'DELETE',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   credentials: 'include', // Include httpOnly cookies
  // })
  //
  // if (!response.ok) {
  //   if (response.status === 404) {
  //     throw new Error('Project not found')
  //   }
  //   if (response.status === 400) {
  //     const error = await response.json()
  //     throw new Error(error.message || 'Cannot leave project')
  //   }
  //   throw new Error(`Failed to leave project: ${response.statusText}`)
  // }
  //
  // const data = await response.json()
  // return LeaveMemberResponseSchema.parse(data)

  // Mock implementation for now
  await new Promise((resolve) => setTimeout(resolve, 800))

  return LeaveMemberResponseSchema.parse({
    success: true,
    message: 'You have left the project',
  })
}
