/**
 * Team Members Search API Route
 * 
 * GET /api/teams/[teamId]/members/search - Search team members for autocomplete
 * 
 * @module api/teams/[teamId]/members/search
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getTeamIdCookie } from '@/server/auth/cookies';
import { hasRole } from '@/server/auth/rbac';
import { db } from '@/lib/db';
import { teamMembers } from '@/server/db/schema/team-members';
import { projectMembers } from '@/server/db/schema/project-members';
import { users } from '@/server/db/schema/users';
import { eq, and, sql, ilike, or, notInArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Zod schema for search query params
 */
const SearchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  excludeProjectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

/**
 * GET /api/teams/:teamId/members/search
 * 
 * Search team members by name or email for autocomplete.
 * Optionally excludes users who are already members of a specific project.
 * 
 * Query params:
 * - q: Search query (searches name and email)
 * - excludeProjectId: Optional project ID to exclude existing project members
 * - limit: Max results (default: 10, max: 20)
 * 
 * Success response (200):
 * {
 *   "members": [
 *     {
 *       "userId": "uuid",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "image": "avatar-url"
 *     }
 *   ]
 * }
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
            message: "You do not have permission to access this team's data",
          },
        },
        { status: 403 }
      );
    }
    
    // Check if user is a member of the team
    const isMember = await hasRole(user.id, 'TEAM_VIEWER', 'team', teamId) ||
                     await hasRole(user.id, 'TEAM_MEMBER', 'team', teamId) ||
                     await hasRole(user.id, 'TEAM_EDITOR', 'team', teamId) ||
                     await hasRole(user.id, 'TEAM_ADMIN', 'team', teamId) ||
                     await hasRole(user.id, 'TEAM_OWNER', 'team', teamId);
    
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
    const validation = SearchSchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      excludeProjectId: searchParams.get('excludeProjectId') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PARAMS',
            message: 'Invalid search parameters',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    const { q, excludeProjectId, limit } = validation.data;
    
    // Build the where condition based on search query
    const searchPattern = q ? `%${q}%` : null;
    
    const whereCondition = searchPattern
      ? and(
          eq(teamMembers.teamId, teamId),
          or(
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern)
          )
        )
      : eq(teamMembers.teamId, teamId);

    // Execute query with all conditions applied at once
    const members = await db
      .select({
        userId: teamMembers.userId,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(whereCondition)
      .limit(limit);

    // Filter out existing project members if excludeProjectId is provided
    let filteredMembers = members;
    if (excludeProjectId) {
      const existingProjectMembers = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, excludeProjectId));
      
      const existingUserIds = new Set(existingProjectMembers.map(m => m.userId));
      filteredMembers = members.filter(m => !existingUserIds.has(m.userId));
    }
    
    logger.info('api.teams.members.search.success', {
      requestId,
      userId: user.id,
      teamId,
      query: q,
      excludeProjectId,
      resultCount: filteredMembers.length,
    });
    
    return NextResponse.json(
      { members: filteredMembers },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.members.search.error', {
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
