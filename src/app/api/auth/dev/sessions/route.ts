/**
 * GET /api/auth/dev/sessions
 *
 * List all active sessions for the current user (DEV ONLY)
 *
 * Returns all active sessions for the authenticated user, including
 * session IDs, creation times, expiration times, IP addresses, and
 * user agents. Useful for testing multi-device session management.
 *
 * WARNING: This endpoint should only be available in development mode.
 *
 * @module api/auth/dev/sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { logAuthEvent } from '@/lib/logger';
import { db } from '@/lib/db';
import { sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/auth/dev/sessions
 *
 * Request body: none (uses session cookie)
 *
 * Success response (200):
 * {
 *   "sessions": [
 *     {
 *       "id": "uuid",
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "expiresAt": "2024-01-08T00:00:00.000Z",
 *       "ipAddress": "192.168.1.1",
 *       "userAgent": "Mozilla/5.0...",
 *       "isCurrent": true
 *     }
 *   ],
 *   "total": 1
 * }
 *
 * Error responses:
 * - 401: Not authenticated (no valid session)
 * - 403: Not available in production
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Check if in development mode
    if (process.env.NODE_ENV === 'production') {
      logAuthEvent('auth.list_sessions.failure', {
        outcome: 'failure',
        requestId,
        ipAddress,
        userAgent,
        errorCode: 'NOT_AVAILABLE_IN_PRODUCTION',
        errorMessage: 'List sessions is only available in development mode',
      });

      return NextResponse.json(
        {
          error: {
            code: 'NOT_AVAILABLE_IN_PRODUCTION',
            message: 'This endpoint is only available in development mode',
          },
        },
        { status: 403 }
      );
    }

    // Get current session
    const user = await getSession();

    if (!user) {
      logAuthEvent('auth.list_sessions.failure', {
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

    // Get current session token from cookie
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get('session')?.value;

    // Get all sessions for the user
    const userSessions = await db
      .select({
        id: sessions.id,
        token: sessions.token,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id));

    // Map sessions to response format
    const sessionList = userSessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ipAddress: session.ipAddress || 'unknown',
      userAgent: session.userAgent || 'unknown',
      isCurrent: session.token === currentSessionToken,
    }));

    // Log successful listing
    logAuthEvent('auth.list_sessions.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      requestId,
      metadata: {
        sessionCount: sessionList.length,
      },
    });

    return NextResponse.json(
      {
        sessions: sessionList,
        total: sessionList.length,
      },
      { status: 200 }
    );

  } catch (error) {
    // Handle errors
    logAuthEvent('auth.list_sessions.error', {
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
