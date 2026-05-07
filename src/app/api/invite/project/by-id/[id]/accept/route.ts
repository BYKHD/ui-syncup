/**
 * Accept Project Invitation by ID API Route
 *
 * POST /api/invite/project/by-id/:id/accept - Accept invitation by ID
 *
 * Used by notification actions when authenticated user accepts from notifications.
 * Verifies user email matches invitation email for security.
 *
 * @module api/invite/project/by-id/[id]/accept
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { acceptProjectInvitationById } from '@/server/projects/invitation-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/invite/project/by-id/:id/accept
 *
 * Success response (200):
 * { "success": true, "projectId": "uuid", "projectSlug": "string", "redirectUrl": "/projects/slug" }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Email mismatch
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
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      logger.warn('api.invite.project.accept_by_id.email_not_verified', {
        requestId,
        userId: user.id,
        invitationId,
      });
      return NextResponse.json(
        { error: 'Please verify your email address before accepting this invitation.' },
        { status: 403 }
      );
    }

    const { projectId, projectSlug } = await acceptProjectInvitationById(
      invitationId,
      user.id,
      user.email
    );

    logger.info('api.invite.project.accept_by_id.success', {
      requestId,
      userId: user.id,
      invitationId,
      projectId,
    });

    return NextResponse.json(
      {
        success: true,
        projectId,
        projectSlug,
        redirectUrl: `/projects/${projectSlug}`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('api.invite.project.accept_by_id.error', {
      requestId,
      invitationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
      }
      if (error.message.includes('different email')) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 403 }
        );
      }
      if (error.message.includes('already used')) {
        return NextResponse.json(
          { error: 'This invitation has already been used' },
          { status: 410 }
        );
      }
      if (error.message.includes('cancelled')) {
        return NextResponse.json(
          { error: 'This invitation has been cancelled' },
          { status: 410 }
        );
      }
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 410 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
