/**
 * Invitation Management API Route
 * 
 * DELETE /api/teams/:teamId/invitations/:invitationId - Cancel invitation
 * 
 * @module api/teams/[teamId]/invitations/[invitationId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { cancelInvitation } from '@/server/teams/invitation-service';
import { hasRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/teams/:teamId/invitations/:invitationId
 * 
 * Cancel an invitation. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Success response (200):
 * {
 *   "message": "Invitation cancelled successfully"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Invitation not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; invitationId: string } }
) {
  const requestId = crypto.randomUUID();
  const { teamId, invitationId } = params;
  
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
            message: 'Only team owners and admins can cancel invitations',
          },
        },
        { status: 403 }
      );
    }
    
    // Cancel invitation
    await cancelInvitation(invitationId, user.id);
    
    logger.info('api.teams.invitations.cancel.success', {
      requestId,
      userId: user.id,
      teamId,
      invitationId,
    });
    
    return NextResponse.json(
      { message: 'Invitation cancelled successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.invitations.cancel.error', {
      requestId,
      teamId,
      invitationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('not found')) {
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
