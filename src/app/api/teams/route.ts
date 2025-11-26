/**
 * Team API Routes
 * 
 * POST /api/teams - Create a new team
 * GET /api/teams - List all teams for the authenticated user
 * 
 * @module api/teams
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { createTeam, getTeams } from '@/server/teams/team-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Zod schema for team creation
 */
const CreateTeamSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
});

/**
 * POST /api/teams
 * 
 * Create a new team. The authenticated user becomes TEAM_OWNER + TEAM_EDITOR.
 * 
 * Request body:
 * {
 *   "name": "Team Name",
 *   "description": "Optional description",
 *   "image": "https://example.com/image.png"
 * }
 * 
 * Success response (201):
 * {
 *   "team": {
 *     "id": "uuid",
 *     "name": "Team Name",
 *     "slug": "team-name",
 *     "planId": "free",
 *     ...
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 409: Duplicate team slug
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
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
    
    // Parse and validate request body
    const body = await request.json();
    const validation = CreateTeamSchema.safeParse(body);
    
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
    
    const { name, description, image } = validation.data;
    
    // Create team
    const team = await createTeam({
      name,
      description,
      image,
      creatorId: user.id,
    });
    
    logger.info('api.teams.create.success', {
      requestId,
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
    });
    
    return NextResponse.json(
      { team },
      { status: 201 }
    );
    
  } catch (error) {
    logger.error('api.teams.create.error', {
      requestId,
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
      
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_TEAM_SLUG',
              message: 'A team with this name already exists',
            },
          },
          { status: 409 }
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
 * GET /api/teams
 * 
 * List all teams for the authenticated user.
 * 
 * Success response (200):
 * {
 *   "teams": [
 *     {
 *       "id": "uuid",
 *       "name": "Team Name",
 *       "slug": "team-name",
 *       "planId": "free",
 *       "memberCount": 5,
 *       "myManagementRole": "TEAM_OWNER",
 *       "myOperationalRole": "TEAM_EDITOR",
 *       ...
 *     }
 *   ]
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
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
    
    // Get teams
    const teams = await getTeams(user.id);
    
    logger.info('api.teams.list.success', {
      requestId,
      userId: user.id,
      teamCount: teams.length,
    });
    
    return NextResponse.json(
      { teams },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.list.error', {
      requestId,
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
