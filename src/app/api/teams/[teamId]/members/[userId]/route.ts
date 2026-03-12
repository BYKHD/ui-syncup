/**
 * Team Member Management API Routes
 * 
 * PATCH /api/teams/:teamId/members/:userId - Update member roles
 * DELETE /api/teams/:teamId/members/:userId - Remove member
 * 
 * @module api/teams/[teamId]/members/[userId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { updateMemberRoles, removeMember } from '@/server/teams/member-service';
import { hasRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logAdminAction, createChange, filterChanges } from '@/server/audit';
import { db } from '@/lib/db';
import { teamMembers } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Zod schema for member role update
 */
const UpdateMemberRolesSchema = z.object({
  managementRole: z.enum(['WORKSPACE_OWNER', 'WORKSPACE_ADMIN']).nullable().optional(),
  operationalRole: z.enum(['WORKSPACE_EDITOR', 'WORKSPACE_MEMBER', 'WORKSPACE_VIEWER']).optional(),
});

/**
 * PATCH /api/teams/:teamId/members/:userId
 * 
 * Update a member's roles. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Request body:
 * {
 *   "managementRole": "WORKSPACE_ADMIN" | null,
 *   "operationalRole": "WORKSPACE_EDITOR" | "WORKSPACE_MEMBER" | "WORKSPACE_VIEWER"
 * }
 * 
 * Success response (200):
 * {
 *   "member": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "managementRole": "WORKSPACE_ADMIN",
 *     "operationalRole": "WORKSPACE_EDITOR",
 *     ...
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Member not found
 * - 409: Member owns projects (cannot demote)
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId, userId } = await params;
  
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
            message: 'Only team owners and admins can update member roles',
          },
        },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateMemberRolesSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid role data',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    // Get current member roles for audit log
    const currentMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    // Update member roles
    const member = await updateMemberRoles(teamId, userId, validation.data, user.id);

    // Audit log role changes
    if (currentMember) {
      const changes = filterChanges([
        createChange('managementRole', currentMember.managementRole, member.managementRole),
        createChange('operationalRole', currentMember.operationalRole, member.operationalRole),
      ]);

      if (changes.length > 0) {
        logAdminAction('member.role.changed', {
          userId: user.id,
          userEmail: user.email,
          resourceType: 'team',
          resourceId: teamId,
          metadata: {
            targetUserId: userId,
          },
          changes,
        });
      }
    }
    
    logger.info('api.teams.members.update.success', {
      requestId,
      userId: user.id,
      teamId,
      targetUserId: userId,
    });
    
    return NextResponse.json(
      { member },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.members.update.error', {
      requestId,
      teamId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Management roles require')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_ROLE_COMBINATION',
              message: error.message,
            },
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('owns projects')) {
        return NextResponse.json(
          {
            error: {
              code: 'MEMBER_OWNS_PROJECTS',
              message: error.message,
            },
          },
          { status: 409 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: {
              code: 'MEMBER_NOT_FOUND',
              message: 'Member not found',
            },
          },
          { status: 404 }
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
 * DELETE /api/teams/:teamId/members/:userId
 * 
 * Remove a member from the team. Requires TEAM_OWNER or TEAM_ADMIN role.
 * 
 * Success response (200):
 * {
 *   "message": "Member removed successfully"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Member not found
 * - 409: Member owns projects (cannot remove)
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId, userId } = await params;
  
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
            message: 'Only team owners and admins can remove members',
          },
        },
        { status: 403 }
      );
    }
    
    // Remove member
    await removeMember(teamId, userId, user.id);
    
    // Audit log removal
    logAdminAction('member.removed', {
      userId: user.id,
      userEmail: user.email,
      resourceType: 'team',
      resourceId: teamId,
      metadata: {
        removedUserId: userId,
      },
    });
    
    logger.info('api.teams.members.remove.success', {
      requestId,
      userId: user.id,
      teamId,
      removedUserId: userId,
    });
    
    return NextResponse.json(
      { message: 'Member removed successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.members.remove.error', {
      requestId,
      teamId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('owns projects')) {
        return NextResponse.json(
          {
            error: {
              code: 'MEMBER_OWNS_PROJECTS',
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
