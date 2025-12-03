/**
 * JOIN PROJECT API
 * Mock implementation for joining a public project
 */

import { z } from 'zod'

// ============================================================================
// RESPONSE SCHEMA
// ============================================================================

export const JoinProjectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  role: z.enum(['owner', 'editor', 'member', 'viewer']),
})

export type JoinProjectResponse = z.infer<typeof JoinProjectResponseSchema>

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Mock function to join a project
 * In production, this would call POST /api/projects/:projectId/join
 */
export async function joinProject(projectId: string): Promise<JoinProjectResponse> {
  const response = await fetch(`/api/projects/${projectId}/join`, {
    method: 'POST',
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
      throw new Error('Cannot join private project')
    }
    if (response.status === 409) {
      throw new Error('You are already a member of this project')
    }
    throw new Error(`Failed to join project: ${response.statusText}`)
  }

  const data = await response.json()
  return JoinProjectResponseSchema.parse(data)
}
