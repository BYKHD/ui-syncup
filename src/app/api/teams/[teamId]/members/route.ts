/**
 * Team Members API Routes
 * 
 * GET /api/teams/:teamId/members - List team members
 * 
 * @module api/teams/[teamId]/members
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getTeamIdCookie } from '@/server/auth/cookies';
import { getMembersByTeam } from '@/server/teams/member-service';
import { hasRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Zod schema for pagination query params
 */
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/teams/:teamId/members
 * 
 * List team members with pagination.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * 
 * Success response (200):
 * {
 *   "members": [
 *     {
 *       "id": "uuid",
 *       "userId": "uuid",
 *       "managementRole": "WORKSPACE_OWNER",
 *       "operationalRole": "WORKSPACE_EDITOR",
 *       "joinedAt": "2024-01-01T00:00:00.000Z",
 *       ...
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "total": 50
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid pagination params
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

    // Validate team context
    const activeTeamId = await getTeamIdCookie();
    if (teamId !== activeTeamId) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: "You do not have permission to access this team's data in the current context",
          },
        },
        { status: 403 }
      );
    }
    
    // Check if user is a member of the team
    const isMember = await hasRole(user.id, 'WORKSPACE_VIEWER', 'team', teamId) ||
                     await hasRole(user.id, 'WORKSPACE_MEMBER', 'team', teamId) ||
                     await hasRole(user.id, 'WORKSPACE_EDITOR', 'team', teamId) ||
                     await hasRole(user.id, 'WORKSPACE_ADMIN', 'team', teamId) ||
                     await hasRole(user.id, 'WORKSPACE_OWNER', 'team', teamId);
    
    if (!isMember) {
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
    
    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const paginationValidation = PaginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });
    
    if (!paginationValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Invalid pagination parameters',
            details: paginationValidation.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    const { page, pageSize } = paginationValidation.data;
    
    // Get members
    const { members, total } = await getMembersByTeam(teamId, page, pageSize);
    
    logger.info('api.teams.members.list.success', {
      requestId,
      userId: user.id,
      teamId,
      page,
      pageSize,
      total,
    });
    
    return NextResponse.json(
      {
        members: members.map(member => ({
          ...member,
          joinedAt: member.joinedAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.members.list.error', {
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
