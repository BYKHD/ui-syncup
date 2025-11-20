/**
 * DELETE /api/auth/delete-account
 *
 * User account deletion endpoint (DEV ONLY)
 *
 * Deletes the current user's account and all associated data including:
 * - All sessions (logs out from all devices)
 * - All verification tokens
 * - All user roles
 * - User record
 *
 * WARNING: This is a destructive operation and cannot be undone.
 * This endpoint is intended for development/testing only.
 *
 * @module api/auth/delete-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteAllUserSessions } from '@/server/auth/session';
import { clearSessionCookie } from '@/server/auth/cookies';
import { logAuthEvent } from '@/lib/logger';
import { db } from '@/lib/db';
import { users, verificationTokens, userRoles } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * DELETE /api/auth/delete-account
 *
 * Request body: none (uses session cookie)
 *
 * Success response (200):
 * {
 *   "message": "Account deleted successfully"
 * }
 *
 * Error responses:
 * - 401: Not authenticated (no valid session)
 * - 500: Internal server error
 */
export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Get current session
    const user = await getSession();

    if (!user) {
      logAuthEvent('auth.delete_account.failure', {
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

    const userId = user.id;
    const userEmail = user.email;

    // Delete all user data in order (due to foreign key constraints)

    // 1. Delete all sessions
    await deleteAllUserSessions(userId);

    // 2. Delete all verification tokens
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));

    // 3. Delete all user roles
    await db.delete(userRoles).where(eq(userRoles.userId, userId));

    // 4. Delete user record
    await db.delete(users).where(eq(users.id, userId));

    // Log successful deletion
    logAuthEvent('auth.delete_account.success', {
      outcome: 'success',
      userId,
      email: userEmail,
      ipAddress,
      userAgent,
      requestId,
    });

    // Return success response with cleared cookie
    const response = NextResponse.json(
      {
        message: 'Account deleted successfully',
      },
      { status: 200 }
    );

    // Clear session cookie
    clearSessionCookie(response);

    return response;

  } catch (error) {
    // Handle errors
    logAuthEvent('auth.delete_account.error', {
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
