/**
 * GET /api/auth/me
 * 
 * Get current authenticated user endpoint
 * 
 * Validates session from cookie, extends session expiration (rolling renewal),
 * and returns user data with roles. This endpoint is used by the client to
 * check authentication status and get user information.
 * 
 * @module api/auth/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { getUserRoles } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/me
 * 
 * No request body required (uses session cookie)
 * 
 * Success response (200):
 * {
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "name": "User Name",
 *     "emailVerified": true,
 *     "roles": [
 *       {
 *         "id": "uuid",
 *         "userId": "uuid",
 *         "role": "TEAM_OWNER",
 *         "resourceType": "team",
 *         "resourceId": "team_uuid",
 *         "createdAt": "2024-01-01T00:00:00.000Z"
 *       }
 *     ]
 *   }
 * }
 * 
 * Error responses:
 * - 401: Unauthorized (no valid session)
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Get and validate session from cookie
    // This automatically extends session if needed (rolling renewal)
    const sessionUser = await getSession();
    
    if (!sessionUser) {
      logger.info('auth.me.failure', {
        requestId,
        reason: 'no_session',
      });
      
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
    
    // Get user roles
    const roles = await getUserRoles(sessionUser.id);
    
    logger.info('auth.me.success', {
      requestId,
      userId: sessionUser.id,
      email: sessionUser.email,
      roleCount: roles.length,
    });
    
    // Return user data with roles
    return NextResponse.json(
      {
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          emailVerified: sessionUser.emailVerified,
          roles: roles.map(role => ({
            id: role.id,
            userId: role.userId,
            role: role.role,
            resourceType: role.resourceType,
            resourceId: role.resourceId,
            createdAt: role.createdAt.toISOString(),
          })),
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    // Handle errors
    logger.error('auth.me.error', {
      requestId,
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
