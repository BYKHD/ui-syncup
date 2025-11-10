/**
 * UPDATE PROJECT API
 * Updates an existing project's properties
 */

import {
  UpdateProjectBodySchema,
  UpdateProjectResponseSchema,
  type UpdateProjectBody,
  type UpdateProjectResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Updates a project
 *
 * @example
 * const project = await updateProject('proj_123', {
 *   name: 'Updated Project Name',
 *   description: 'New description',
 *   visibility: 'public'
 * })
 *
 * TODO: wire to PATCH /api/projects/:id
 * - Add proper error handling (404, 403, validation)
 * - Add authentication headers
 * - Configure base URL from environment
 */
export async function updateProject(
  projectId: string,
  body: UpdateProjectBody
): Promise<UpdateProjectResponse> {
  if (!projectId) {
    throw new Error('Project ID is required')
  }

  // Validate input body
  const validatedBody = UpdateProjectBodySchema.parse(body)

  // TODO: Replace with actual API call
  // const response = await fetch(`/api/projects/${projectId}`, {
  //   method: 'PATCH',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   credentials: 'include', // Include httpOnly cookies
  //   body: JSON.stringify(validatedBody),
  // })
  //
  // if (!response.ok) {
  //   if (response.status === 404) {
  //     throw new Error('Project not found')
  //   }
  //   if (response.status === 403) {
  //     throw new Error('You do not have permission to update this project')
  //   }
  //   if (response.status === 400) {
  //     const error = await response.json()
  //     throw new Error(error.message || 'Invalid project data')
  //   }
  //   throw new Error(`Failed to update project: ${response.statusText}`)
  // }
  //
  // const data = await response.json()
  // return UpdateProjectResponseSchema.parse(data)

  // Mock implementation for now
  await new Promise((resolve) => setTimeout(resolve, 800))

  throw new Error('Mock: Update not implemented - wire to real API')
}
