/**
 * Team Ownership Transfer API Route
 * 
 * POST /api/teams/:teamId/transfer-ownership - Transfer team ownership
 * 
 * @module api/teams/[teamId]/transfer-ownership
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { hasRole } from '@/server/auth/rbac';
import { transferOwnership } from '@/server/teams/team-service';
import { verifyPassword } from '@/server/auth/password';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema/users';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Zod schema for ownership transfer
 * Requires password for re-authentication (Requirement 6.1)
 */
const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
  password: z.string().min(1, 'Password is required for re-authentication'),
});

/**
 * POST /api/teams/:teamId/transfer-ownership
 * 
 * Transfer team ownership to another member. Requires TEAM_OWNER role.
 * 
 * Request body:
 * {
 *   "newOwnerId": "uuid",
 *   "password": "string" // Required for re-authentication (Requirement 6.1)
 * }
 * 
 * Success response (200):
 * {
 *   "message": "Ownership transferred successfully"
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated or invalid password
 * - 403: Not team owner
 * - 404: Team or new owner not found
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
    
    // Check permissions (TEAM_OWNER only)
    const isOwner = await hasRole(user.id, 'WORKSPACE_OWNER', 'team', teamId);
    
    if (!isOwner) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_TEAM_OWNER',
            message: 'Only team owners can transfer ownership',
          },
        },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = TransferOwnershipSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid transfer data',
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }
    
    const { newOwnerId, password } = validation.data;
    
    // Re-authenticate user (Requirement 6.1)
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
    
    if (!userRecord || !userRecord.passwordHash) {
      logger.warn('api.teams.transfer_ownership.no_password', {
        requestId,
        userId: user.id,
        teamId,
      });
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Invalid password',
          },
        },
        { status: 401 }
      );
    }
    
    const isPasswordValid = await verifyPassword(password, userRecord.passwordHash);
    
    if (!isPasswordValid) {
      logger.warn('api.teams.transfer_ownership.invalid_password', {
        requestId,
        userId: user.id,
        teamId,
      });
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Invalid password. Please verify your password and try again.',
          },
        },
        { status: 401 }
      );
    }
    
    // Perform ownership transfer
    await transferOwnership(teamId, user.id, newOwnerId);
    
    logger.info('api.teams.transfer_ownership.success', {
      requestId,
      userId: user.id,
      teamId,
      newOwnerId,
    });
    
    return NextResponse.json(
      {
        message: 'Ownership transferred successfully',
      },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error('api.teams.transfer_ownership.error', {
      requestId,
      teamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific business logic errors
    if (errorMessage.includes("Target user must be a Team Admin")) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TARGET_ROLE',
            message: errorMessage,
          },
        },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes("Target user is not a member")) {
      return NextResponse.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: errorMessage,
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
