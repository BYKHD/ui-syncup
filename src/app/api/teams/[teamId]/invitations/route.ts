/**
 * Team Invitations API Routes
 * 
 * POST /api/teams/:teamId/invitations - Create invitation
 * GET /api/teams/:teamId/invitations - List invitations
 * 
 * @module api/teams/[teamId]/invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getTeamIdCookie } from '@/server/auth/cookies';
import { createInvitation } from '@/server/teams/invitation-service';
import { hasRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { db } from '@/lib/db';
import { teamInvitations } from '@/server/db/schema/team-invitations';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Zod schema for invitation creation
 */
const CreateInvitationSchema = z.object({
  email: z.string().email(),
  managementRole: z.enum(['WORKSPACE_ADMIN']).nullable().optional(),
  operationalRole: z.enum(['WORKSPACE_EDITOR', 'WORKSPACE_MEMBER', 'WORKSPACE_VIEWER']),
});

/**
 * POST /api/teams/:teamId/invitations
 * 
 * Create a new invitation. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "managementRole": "WORKSPACE_ADMIN" | null,
 *   "operationalRole": "WORKSPACE_EDITOR" | "WORKSPACE_MEMBER" | "WORKSPACE_VIEWER"
 * }
 * 
 * Success response (201):
 * {
 *   "invitation": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "managementRole": "WORKSPACE_ADMIN",
 *     "operationalRole": "WORKSPACE_EDITOR",
 *     "expiresAt": "2024-01-08T00:00:00.000Z",
 *     ...
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 409: User already a member
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export async function POST(
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
    
    // Check permissions (TEAM_OWNER or TEAM_ADMIN)
    const isOwner = await hasRole(user.id, 'WORKSPACE_OWNER', 'team', teamId);
    const isAdmin = await hasRole(user.id, 'WORKSPACE_ADMIN', 'team', teamId);
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only team owners and admins can send invitations',
          },
        },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = CreateInvitationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid invitation data',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    const { email, managementRole, operationalRole } = validation.data;
    
    // Check member limit before creating invitation
    const { checkMemberLimit, QuotaError } = await import('@/server/teams/resource-limits');
    try {
      await checkMemberLimit(teamId);
    } catch (error: unknown) {
      if (error instanceof QuotaError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              limit: error.limit,
              current: error.current,
            },
          },
          { status: 422 }
        );
      }
      throw error;
    }
    
    // Create invitation
    const { invitation } = await createInvitation({
      teamId,
      email,
      managementRole: managementRole ?? null,
      operationalRole,
      invitedBy: user.id,
    });
    
    logger.info('api.teams.invitations.create.success', {
      requestId,
      userId: user.id,
      teamId,
      invitationId: invitation.id,
      email,
    });
    
    return NextResponse.json(
      { invitation },
      { status: 201 }
    );
    
  } catch (error) {
    logger.error('api.teams.invitations.create.error', {
      requestId,
      teamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_INVITATIONS',
              message: error.message,
            },
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('already a member')) {
        return NextResponse.json(
          {
            error: {
              code: 'ALREADY_TEAM_MEMBER',
              message: error.message,
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
 * GET /api/teams/:teamId/invitations
 * 
 * List pending invitations for a team. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Success response (200):
 * {
 *   "invitations": [
 *     {
 *       "id": "uuid",
 *       "email": "user@example.com",
 *       "managementRole": "WORKSPACE_ADMIN",
 *       "operationalRole": "WORKSPACE_EDITOR",
 *       "expiresAt": "2024-01-08T00:00:00.000Z",
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       ...
 *     }
 *   ]
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
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

    // Check permissions (TEAM_OWNER or TEAM_ADMIN)
    const isOwner = await hasRole(user.id, 'WORKSPACE_OWNER', 'team', teamId);
    const isAdmin = await hasRole(user.id, 'WORKSPACE_ADMIN', 'team', teamId);
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only team owners and admins can view invitations',
          },
        },
        { status: 403 }
      );
    }
    
    // Get pending invitations (not used, not cancelled)
    const invitations = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, teamId),
          isNull(teamInvitations.usedAt),
          isNull(teamInvitations.cancelledAt)
        )
      );
    
    logger.info('api.teams.invitations.list.success', {
      requestId,
      userId: user.id,
      teamId,
      count: invitations.length,
    });
    
    return NextResponse.json(
      { invitations },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.invitations.list.error', {
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
