/**
 * GET /api/auth/verify-email
 *
 * Email verification endpoint
 *
 * Validates verification token and marks user as verified.
 * Returns JSON response with success or error message.
 *
 * @module api/auth/verify-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema';
import { verifyToken, markTokenAsUsed } from '@/server/auth/tokens';
import { logAuthEvent } from '@/lib/logger';
import { env } from '@/lib/env';
import { eq } from 'drizzle-orm';

/**
 * GET /api/auth/verify-email?token=...
 *
 * Query parameters:
 * - token: string (verification token from email)
 *
 * Success response (200):
 * {
 *   "message": "Email verified successfully! You can now sign in."
 * }
 *
 * Error responses:
 * - 400: Missing token
 * - 401: Invalid or expired token
 * - 404: User not found
 * - 410: Email already verified
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // Get token from query params
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    
    if (!token) {
      logAuthEvent('auth.verify_email.failure', {
        outcome: 'failure',
        ipAddress,
        userAgent,
        requestId,
        errorCode: 'MISSING_TOKEN',
        errorMessage: 'Verification token is missing',
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is missing.',
          },
        },
        { status: 400 }
      );
    }
    
    logAuthEvent('auth.verify_email.attempt', {
      outcome: 'success',
      ipAddress,
      userAgent,
      requestId,
    });
    
    // Verify token signature and expiration
    const verified = await verifyToken(token, 'email_verification', {
      ipAddress,
      userAgent,
      requestId,
    });
    
    if (!verified) {
      logAuthEvent('auth.verify_email.failure', {
        outcome: 'failure',
        ipAddress,
        userAgent,
        requestId,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Verification link is invalid or has expired',
        metadata: {
          reason: 'invalid_or_expired_token',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: 'This verification link is invalid or has expired.',
          },
        },
        { status: 401 }
      );
    }
    
    // Get user data
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, verified.userId))
      .limit(1);
    
    if (!user) {
      logAuthEvent('auth.verify_email.failure', {
        outcome: 'error',
        userId: verified.userId,
        ipAddress,
        userAgent,
        requestId,
        errorCode: 'USER_NOT_FOUND',
        errorMessage: 'User account not found',
        metadata: {
          reason: 'user_not_found',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found.',
          },
        },
        { status: 404 }
      );
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      logAuthEvent('auth.verify_email.success', {
        outcome: 'success',
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          alreadyVerified: true,
        },
      });
      
      // Mark token as used to prevent reuse
      await markTokenAsUsed(verified.tokenId);

      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'Your email is already verified. You can sign in now.',
          },
        },
        { status: 410 }
      );
    }
    
    // Mark user as verified
    await db
      .update(users)
      .set({ 
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    
    // Mark token as used
    await markTokenAsUsed(verified.tokenId);
    
    // Note: Default roles are NOT assigned here because the user hasn't created
    // or joined a team yet. Roles are assigned when:
    // 1. User creates a team (gets TEAM_OWNER + TEAM_MEMBER)
    // 2. User joins a team (gets role assigned by inviter)
    // 3. User is added to a project (gets project role + auto-promoted to TEAM_EDITOR if needed)
    
    logAuthEvent('auth.verify_email.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      requestId,
      metadata: {
        tokenId: verified.tokenId,
      },
    });
    
    return NextResponse.json(
      {
        message: 'Email verified successfully! You can now sign in.',
      },
      { status: 200 }
    );
    
  } catch (error) {
    // Handle errors
    logAuthEvent('auth.verify_email.failure', {
      outcome: 'error',
      ipAddress,
      userAgent,
      requestId,
      errorCode: 'INTERNAL_SERVER_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}
