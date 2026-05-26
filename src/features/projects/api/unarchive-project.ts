/**
 * UNARCHIVE PROJECT API
 * Restores an archived project.
 */

import { UnarchiveProjectResponseSchema, type UnarchiveProjectResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

export async function unarchiveProject(projectId: string): Promise<UnarchiveProjectResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  const response = await fetch(`/api/projects/${projectId}/archive`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const message = error?.error?.message ?? error?.message

    if (message) {
      throw new Error(message)
    }

    if (response.status === 404) {
      throw new Error('Project not found')
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to unarchive this project')
    }

    throw new Error(`Failed to unarchive project: ${response.statusText}`)
  }

  const data = await response.json()
  return UnarchiveProjectResponseSchema.parse(data)
}
