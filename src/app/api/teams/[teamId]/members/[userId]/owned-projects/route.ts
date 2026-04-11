/**
 * GET /api/teams/:teamId/members/:userId/owned-projects
 *
 * Returns projects owned by a team member, plus eligible replacement owners.
 * Requires TEAM_OWNER or TEAM_ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { hasRole } from '@/server/auth/rbac';
import { getOwnedProjectsWithDetails } from '@/server/teams/member-service';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const { teamId, userId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const isOwner = await hasRole(user.id, 'TEAM_OWNER', 'team', teamId);
  const isAdmin = await hasRole(user.id, 'TEAM_ADMIN', 'team', teamId);
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only team owners and admins can view this' } },
      { status: 403 }
    );
  }

  try {
    const result = await getOwnedProjectsWithDetails(userId, teamId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error('api.teams.members.owned-projects.error', {
      teamId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
