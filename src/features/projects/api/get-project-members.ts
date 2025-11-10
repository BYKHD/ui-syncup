/**
 * GET PROJECT MEMBERS API
 * Fetches all members of a project with their roles
 */

import {
  GetProjectMembersResponseSchema,
  type GetProjectMembersResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Fetches all members of a project
 *
 * @example
 * const { members } = await getProjectMembers('proj_123')
 *
 * TODO: wire to GET /api/projects/:id/members
 * - Add proper error handling (404, 403)
 * - Add authentication headers
 * - Configure base URL from environment
 * - Consider pagination for large teams
 */
export async function getProjectMembers(projectId: string): Promise<GetProjectMembersResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  // TODO: Replace with actual API call
  // const response = await fetch(`/api/projects/${projectId}/members`, {
  //   method: 'GET',
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
  //   if (response.status === 403) {
  //     throw new Error('You do not have permission to view project members')
  //   }
  //   throw new Error(`Failed to fetch project members: ${response.statusText}`)
  // }
  //
  // const data = await response.json()
  // return GetProjectMembersResponseSchema.parse(data)

  // Mock implementation for now
  await new Promise((resolve) => setTimeout(resolve, 600))

  return GetProjectMembersResponseSchema.parse({
    members: [],
  })
}
