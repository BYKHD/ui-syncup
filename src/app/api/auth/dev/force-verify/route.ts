/**
 * POST /api/auth/dev/force-verify
 *
 * Force email verification endpoint (DEV ONLY)
 *
 * Bypasses the normal email verification flow and immediately marks
 * the current user's email as verified. This is useful for testing
 * features that require verified accounts without going through the
 * email verification process.
 *
 * WARNING: This endpoint should only be available in development mode.
 * In production, use the normal verification flow via email tokens.
 *
 * @module api/auth/dev/force-verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { logAuthEvent } from '@/lib/logger';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/auth/dev/force-verify
 *
 * Request body: none (uses session cookie)
 *
 * Success response (200):
 * {
 *   "message": "Email verified successfully",
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "emailVerified": true
 *   }
 * }
 *
 * Error responses:
 * - 401: Not authenticated (no valid session)
 * - 400: Email already verified
 * - 403: Not available in production
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Check if in development mode
    if (process.env.NODE_ENV === 'production') {
      logAuthEvent('auth.force_verify.failure', {
        outcome: 'failure',
        requestId,
        ipAddress,
        userAgent,
        errorCode: 'NOT_AVAILABLE_IN_PRODUCTION',
        errorMessage: 'Force verify is only available in development mode',
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
      logAuthEvent('auth.force_verify.failure', {
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

    // Check if already verified
    if (user.emailVerified) {
      logAuthEvent('auth.force_verify.failure', {
        outcome: 'failure',
        userId: user.id,
        email: user.email,
        requestId,
        ipAddress,
        userAgent,
        errorCode: 'ALREADY_VERIFIED',
        errorMessage: 'Email is already verified',
      });

      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'Email is already verified',
          },
        },
        { status: 400 }
      );
    }

    // Update user to mark email as verified
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
      });

    // Log successful verification
    logAuthEvent('auth.force_verify.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      requestId,
      metadata: {
        method: 'force_verify',
      },
    });

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        user: updatedUser,
      },
      { status: 200 }
    );

  } catch (error) {
    // Handle errors
    logAuthEvent('auth.force_verify.error', {
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
