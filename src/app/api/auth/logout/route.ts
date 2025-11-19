/**
 * POST /api/auth/logout
 * 
 * User sign-out endpoint
 * 
 * Invalidates the current session by deleting it from the database
 * and clearing the session cookie. This only affects the current
 * session - other sessions on different devices remain active.
 * 
 * @module api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/server/auth/session';
import { clearSessionCookie } from '@/server/auth/cookies';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/logout
 * 
 * Request body: none (uses session cookie)
 * 
 * Success response (200):
 * {
 *   "message": "Signed out successfully"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated (no valid session)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Get current session
    const user = await getSession();
    
    if (!user) {
      logger.info('auth.logout.failure', {
        requestId,
        reason: 'no_session',
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'No active session found',
          },
        },
        { status: 401 }
      );
    }
    
    logger.info('auth.logout.attempt', {
      requestId,
      userId: user.id,
      sessionId: user.sessionId,
    });
    
    // Delete session from database
    await deleteSession(user.sessionId);
    
    logger.info('auth.logout.success', {
      requestId,
      userId: user.id,
      sessionId: user.sessionId,
    });
    
    // Return success response with cleared cookie
    const response = NextResponse.json(
      {
        message: 'Signed out successfully',
      },
      { status: 200 }
    );
    
    // Clear session cookie
    clearSessionCookie(response);
    
    return response;
    
  } catch (error) {
    // Handle errors
    logger.error('auth.logout.error', {
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
