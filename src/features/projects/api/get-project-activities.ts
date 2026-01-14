/**
 * GET PROJECT ACTIVITIES API
 * Fetches activity log for a single project
 */

import { ListProjectActivitiesResponseSchema, type ListProjectActivitiesResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Fetches activities for a project
 *
 * @example
 * const { activities } = await getProjectActivities('proj_123')
 */
export async function getProjectActivities(projectId: string): Promise<ListProjectActivitiesResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  const response = await fetch(`/api/projects/${projectId}/activities`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project not found')
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to view activities for this project')
    }
    throw new Error(`Failed to fetch activities: ${response.statusText}`)
  }

  const data = await response.json()
  return ListProjectActivitiesResponseSchema.parse(data)
}
