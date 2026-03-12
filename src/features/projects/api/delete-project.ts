/**
 * DELETE PROJECT API
 * Permanently deletes a project (owner only)
 */

import { DeleteProjectResponseSchema, type DeleteProjectResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Deletes a project (owner only)
 *
 * @example
 * const result = await deleteProject('proj_123')
 *
 * TODO: wire to DELETE /api/projects/:id
 * - Add proper error handling (404, 403)
 * - Add authentication headers
 * - Configure base URL from environment
 * - Consider soft delete (archive) vs hard delete
 */
export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  // TODO: Replace with actual API call
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
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
      throw new Error('Only project owners can delete projects')
    }
    throw new Error(`Failed to delete project: ${response.statusText}`)
  }

  const data = await response.json()
  return DeleteProjectResponseSchema.parse(data)
}
