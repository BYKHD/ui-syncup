/**
 * Accept Team Invitation by ID API Route
 * 
 * POST /api/teams/invitations/by-id/:id/accept - Accept invitation by ID
 * 
 * Used by notification actions when authenticated user accepts from notifications.
 * Verifies user email matches invitation email for security.
 * 
 * @module api/teams/invitations/by-id/[id]/accept
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { acceptInvitationById } from '@/server/teams/invitation-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/teams/invitations/by-id/:id/accept
 * 
 * Accept a team invitation by its ID.
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "teamId": "uuid"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Email mismatch (invitation for different user)
 * - 404: Invitation not found
 * - 410: Invitation expired, used, or cancelled
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: invitationId } = await params;
  
  try {
    // Authenticate user
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Accept invitation by ID
    const { teamId, teamSlug } = await acceptInvitationById(invitationId, user.id, user.email);
    
    logger.info('api.teams.invitations.accept_by_id.success', {
      requestId,
      userId: user.id,
      invitationId,
      teamId,
    });
    
    return NextResponse.json(
      { success: true, teamId, teamSlug },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.invitations.accept_by_id.error', {
      requestId,
      invitationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
      }
      if (error.message.includes('different email')) {
        return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 });
      }
      if (error.message.includes('already used')) {
        return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 });
      }
      if (error.message.includes('cancelled')) {
        return NextResponse.json({ error: 'This invitation has been cancelled' }, { status: 410 });
      }
      if (error.message.includes('expired')) {
        return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
      }
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
