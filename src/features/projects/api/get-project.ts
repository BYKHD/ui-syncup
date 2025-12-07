/**
 * GET PROJECT API
 * Fetches a single project by ID with stats and user permissions
 */

import { GetProjectResponseSchema, type GetProjectResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Fetches a single project with stats and user role
 *
 * @example
 * const project = await getProject('proj_123')
 *
 * TODO: wire to GET /api/projects/:id
 * - Add proper error handling (404, 403)
 * - Add authentication headers
 * - Configure base URL from environment
 */
export async function getProject(projectId: string): Promise<GetProjectResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  // TODO: Replace with actual API call
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include httpOnly cookies
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project not found')
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to view this project')
    }
    throw new Error(`Failed to fetch project: ${response.statusText}`)
  }

  const data = await response.json()
  return GetProjectResponseSchema.parse(data)
}
