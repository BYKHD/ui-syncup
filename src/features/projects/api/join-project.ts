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
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Mock successful join - assign 'member' role by default
  return {
    success: true,
    message: 'Successfully joined project',
    role: 'member',
  }
}
