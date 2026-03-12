/**
 * Resend Invitation API Route
 * 
 * POST /api/teams/:teamId/invitations/:invitationId/resend - Resend invitation
 * 
 * @module api/teams/[teamId]/invitations/[invitationId]/resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { resendInvitation } from '@/server/teams/invitation-service';
import { hasRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

/**
 * POST /api/teams/:teamId/invitations/:invitationId/resend
 * 
 * Resend an invitation. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Success response (200):
 * {
 *   "message": "Invitation resent successfully"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Invitation not found
 * - 410: Invitation already used or cancelled
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; invitationId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId, invitationId } = await params;
  
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
    const isOwner = await hasRole(user.id, 'WORKSPACE_OWNER', 'team', teamId);
    const isAdmin = await hasRole(user.id, 'WORKSPACE_ADMIN', 'team', teamId);
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only team owners and admins can resend invitations',
          },
        },
        { status: 403 }
      );
    }
    
    // Resend invitation
    const { invitation } = await resendInvitation(invitationId, user.id);
    
    logger.info('api.teams.invitations.resend.success', {
      requestId,
      userId: user.id,
      teamId,
      invitationId,
    });
    
    return NextResponse.json(
      { invitation },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.invitations.resend.error', {
      requestId,
      teamId,
      invitationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVITATION_NOT_FOUND',
              message: 'Invitation not found',
            },
          },
          { status: 404 }
        );
      }
      
      if (error.message.includes('no longer active')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVITATION_INACTIVE',
              message: 'Invitation is no longer active',
            },
          },
          { status: 410 }
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
