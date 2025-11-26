/**
 * Team Switch API Route
 * 
 * POST /api/teams/:teamId/switch - Switch active team
 * 
 * @module api/teams/[teamId]/switch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getTeam } from '@/server/teams/team-service';
import { logTeamEvent } from '@/server/teams/team-service';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema/users';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

/**
 * POST /api/teams/:teamId/switch
 * 
 * Switch the user's active team. Updates both database and cookie.
 * 
 * Success response (200):
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
 * - 401: Not authenticated
 * - 403: No access to team
 * - 404: Team not found
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = params;
  
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
    
    // Verify user has access to team
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
    
    // Update user's lastActiveTeamId in database
    await db
      .update(users)
      .set({ lastActiveTeamId: teamId })
      .where(eq(users.id, user.id));
    
    // Set team_id cookie
    const cookieStore = await cookies();
    cookieStore.set('team_id', teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    
    // Log team switch
    logTeamEvent('team.switch.success', {
      outcome: 'success',
      userId: user.id,
      teamId,
      teamName: team.name,
    });
    
    logger.info('api.teams.switch.success', {
      requestId,
      userId: user.id,
      teamId,
    });
    
    return NextResponse.json(
      { team },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.switch.error', {
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
