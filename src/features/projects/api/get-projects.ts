/**
 * GET PROJECTS API
 * Fetches a list of projects with filtering, pagination, and search
 */

import {
  GetProjectsParamsSchema,
  GetProjectsResponseSchema,
  type GetProjectsParams,
  type GetProjectsResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Fetches projects for a team with optional filters
 *
 * @example
 * const { projects, pagination } = await getProjects({
 *   teamId: 'team_123',
 *   status: 'active',
 *   page: 1,
 *   limit: 20
 * })
 *
 * TODO: wire to GET /api/projects
 * - Add proper error handling
 * - Add authentication headers
 * - Configure base URL from environment
 */
export async function getProjects(params: GetProjectsParams): Promise<GetProjectsResponse> {
  // Validate input params
  const validatedParams = GetProjectsParamsSchema.parse(params)

  // Build query string
  const queryParams = new URLSearchParams()
  queryParams.append('teamId', validatedParams.teamId)
  if (validatedParams.status) queryParams.append('status', validatedParams.status)
  if (validatedParams.visibility) queryParams.append('visibility', validatedParams.visibility)
  if (validatedParams.search) queryParams.append('search', validatedParams.search)
  queryParams.append('page', validatedParams.page.toString())
  queryParams.append('limit', validatedParams.limit.toString())

  // TODO: Replace with actual API call
  const response = await fetch(`/api/projects?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include httpOnly cookies
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`)
  }

  const data = await response.json()
  return GetProjectsResponseSchema.parse(data)
}
