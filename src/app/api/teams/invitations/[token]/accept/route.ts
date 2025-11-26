/**
 * Accept Invitation API Route
 * 
 * GET /api/teams/invitations/:token/accept - Accept invitation
 * 
 * @module api/teams/invitations/[token]/accept
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { acceptInvitation } from '@/server/teams/invitation-service';
import { logger } from '@/lib/logger';
import { redirect } from 'next/navigation';

/**
 * GET /api/teams/invitations/:token/accept
 * 
 * Accept an invitation using the token from the invitation email.
 * Redirects to the team page on success.
 * 
 * Success: Redirects to /teams/:teamId
 * 
 * Error responses:
 * - 400: Invalid token
 * - 401: Not authenticated
 * - 409: Already a member
 * - 410: Invitation expired, used, or cancelled
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const requestId = crypto.randomUUID();
  const { token } = params;
  
  try {
    // Authenticate user
    const user = await getSession();
    
    if (!user) {
      // Redirect to sign-in with return URL
      const returnUrl = encodeURIComponent(request.url);
      return NextResponse.redirect(
        new URL(`/sign-in?returnUrl=${returnUrl}`, request.url)
      );
    }
    
    // Accept invitation
    await acceptInvitation(token, user.id);
    
    logger.info('api.teams.invitations.accept.success', {
      requestId,
      userId: user.id,
    });
    
    // Redirect to teams page (or could redirect to specific team)
    return NextResponse.redirect(new URL('/teams', request.url));
    
  } catch (error) {
    logger.error('api.teams.invitations.accept.error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid invitation')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid invitation token',
            },
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('already used')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVITATION_ALREADY_USED',
              message: 'This invitation has already been used',
            },
          },
          { status: 410 }
        );
      }
      
      if (error.message.includes('cancelled')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVITATION_CANCELLED',
              message: 'This invitation has been cancelled',
            },
          },
          { status: 410 }
        );
      }
      
      if (error.message.includes('expired')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVITATION_EXPIRED',
              message: 'This invitation has expired',
            },
          },
          { status: 410 }
        );
      }
      
      if (error.message.includes('already a member')) {
        return NextResponse.json(
          {
            error: {
              code: 'ALREADY_TEAM_MEMBER',
              message: 'You are already a member of this team',
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
