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
import { logAuthEvent } from '@/lib/logger';

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
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // Get current session
    const user = await getSession();
    
    if (!user) {
      logAuthEvent('auth.logout.success', {
        outcome: 'failure',
        requestId,
        ipAddress,
        userAgent,
        errorCode: 'NOT_AUTHENTICATED',
        errorMessage: 'No active session found',
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
    
    // Delete session from database
    await deleteSession(user.sessionId);
    
    // Log successful sign-out
    logAuthEvent('auth.logout.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      requestId,
      metadata: {
        sessionId: user.sessionId,
      },
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
    logAuthEvent('auth.logout.success', {
      outcome: 'error',
      requestId,
      ipAddress,
      userAgent,
      errorCode: 'INTERNAL_SERVER_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        stack: error instanceof Error ? error.stack : undefined,
      },
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
