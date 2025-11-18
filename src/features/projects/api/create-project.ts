/**
 * CREATE PROJECT API
 * Creates a new project in a team
 */

import {
  CreateProjectBodySchema,
  CreateProjectResponseSchema,
  type CreateProjectBody,
  type CreateProjectResponse,
} from './types'

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Creates a new project
 *
 * @example
 * const project = await createProject({
 *   teamId: 'team_123',
 *   name: 'Marketing Website',
 *   key: 'MKT',
 *   description: 'New marketing website redesign',
 *   visibility: 'private'
 * })
 *
 * TODO: wire to POST /api/projects
 * - Add proper error handling (validation, permissions, conflicts)
 * - Add authentication headers
 * - Configure base URL from environment
 */
export async function createProject(body: CreateProjectBody): Promise<CreateProjectResponse> {
  // Validate input body
  const validatedBody = CreateProjectBodySchema.parse(body)

  // TODO: Replace with actual API call
  // const response = await fetch('/api/projects', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   credentials: 'include', // Include httpOnly cookies
  //   body: JSON.stringify(validatedBody),
  // })
  //
  // if (!response.ok) {
  //   if (response.status === 400) {
  //     const error = await response.json()
  //     throw new Error(error.message || 'Invalid project data')
  //   }
  //   if (response.status === 403) {
  //     throw new Error('You do not have permission to create projects')
  //   }
  //   if (response.status === 409) {
  //     throw new Error('A project with this key already exists')
  //   }
  //   throw new Error(`Failed to create project: ${response.statusText}`)
  // }
  //
  // const data = await response.json()
  // return CreateProjectResponseSchema.parse(data)

  // Mock implementation for now
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return CreateProjectResponseSchema.parse({
    id: `proj_${Date.now()}`,
    teamId: validatedBody.teamId,
    name: validatedBody.name,
    key: validatedBody.key,
    slug: validatedBody.key.toLowerCase(),
    description: validatedBody.description || null,
    icon: validatedBody.icon || null,
    visibility: validatedBody.visibility,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}
