/**
 * ARCHIVE PROJECT API
 * Archives a completed project.
 */

import { ArchiveProjectResponseSchema, type ArchiveProjectResponse } from './types'

// ============================================================================
// API CALLER
// ============================================================================

export async function archiveProject(projectId: string): Promise<ArchiveProjectResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  const response = await fetch(`/api/projects/${projectId}/archive`, {
    method: 'POST',
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
      throw new Error('You do not have permission to archive this project')
    }

    throw new Error(`Failed to archive project: ${response.statusText}`)
  }

  const data = await response.json()
  return ArchiveProjectResponseSchema.parse(data)
}
