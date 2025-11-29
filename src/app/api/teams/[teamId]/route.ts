/**
 * Team Detail API Routes
 * 
 * GET /api/teams/:teamId - Get team details
 * PATCH /api/teams/:teamId - Update team settings
 * DELETE /api/teams/:teamId - Soft delete team
 * 
 * @module api/teams/[teamId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getTeam, updateTeam, softDeleteTeam } from '@/server/teams/team-service';
import { hasRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Zod schema for team update
 */
const UpdateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

/**
 * GET /api/teams/:teamId
 * 
 * Get team details with member information.
 * 
 * Success response (200):
 * {
 *   "team": {
 *     "id": "uuid",
 *     "name": "Team Name",
 *     "slug": "team-name",
 *     "description": "Team description",
 *     "image": "https://example.com/image.png",
 *     "planId": "free",
 *     "billableSeats": 3,
 *     "memberCount": 5,
 *     "myManagementRole": "TEAM_OWNER",
 *     "myOperationalRole": "TEAM_EDITOR",
 *     ...
 *   }
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: No access to team
 * - 404: Team not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = await params;
  
  try {
    // Authenticate user
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 }
      );
    }
    
    // Get team
    const team = await getTeam(teamId, user.id);
    
    if (!team) {
      return NextResponse.json(
        {
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team not found or you do not have access',
          },
        },
        { status: 404 }
      );
    }
    
    logger.info('api.teams.get.success', {
      requestId,
      userId: user.id,
      teamId,
    });
    
    return NextResponse.json(
      { team },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.get.error', {
      requestId,
      teamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/:teamId
 * 
 * Update team settings. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Request body:
 * {
 *   "name": "New Team Name",
 *   "description": "New description",
 *   "image": "https://example.com/new-image.png"
 * }
 * 
 * Success response (200):
 * {
 *   "team": {
 *     "id": "uuid",
 *     "name": "New Team Name",
 *     "slug": "new-team-name",
 *     ...
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Team not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = await params;
  
  try {
    // Authenticate user
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 }
      );
    }
    
    // Check permissions (TEAM_OWNER or TEAM_ADMIN)
    const isOwner = await hasRole(user.id, 'TEAM_OWNER', 'team', teamId);
    const isAdmin = await hasRole(user.id, 'TEAM_ADMIN', 'team', teamId);
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only team owners and admins can update team settings',
          },
        },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTeamSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid team data',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    // Update team
    const updateData = {
      ...validation.data,
      description: validation.data.description === null ? undefined : validation.data.description,
      image: validation.data.image === null ? undefined : validation.data.image,
    };
    const team = await updateTeam(teamId, updateData, user.id);
    
    logger.info('api.teams.update.success', {
      requestId,
      userId: user.id,
      teamId,
    });
    
    return NextResponse.json(
      { team },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.update.error', {
      requestId,
      teamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid team name')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_TEAM_NAME',
              message: error.message,
            },
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: {
              code: 'TEAM_NOT_FOUND',
              message: 'Team not found',
            },
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/:teamId
 * 
 * Soft delete a team. Requires TEAM_OWNER role.
 * Team is marked as deleted with 30-day retention period.
 * 
 * Success response (200):
 * {
 *   "message": "Team deleted successfully"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Not team owner
 * - 404: Team not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = await params;
  
  try {
    // Authenticate user
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 }
      );
    }
    
    // Check permissions (TEAM_OWNER only)
    const isOwner = await hasRole(user.id, 'TEAM_OWNER', 'team', teamId);
    
    if (!isOwner) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_TEAM_OWNER',
            message: 'Only team owners can delete teams',
          },
        },
        { status: 403 }
      );
    }
    
    // Soft delete team
    await softDeleteTeam(teamId, user.id);
    
    logger.info('api.teams.delete.success', {
      requestId,
      userId: user.id,
      teamId,
    });
    
    return NextResponse.json(
      { message: 'Team deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.delete.error', {
      requestId,
      teamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team not found',
          },
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}
