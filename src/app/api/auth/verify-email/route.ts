/**
 * GET /api/auth/verify-email
 * 
 * Email verification endpoint
 * 
 * Validates verification token, marks user as verified, assigns default roles,
 * and redirects to sign-in page with success message.
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
 * Success response:
 * - Redirects to /sign-in with success message
 * 
 * Error responses:
 * - 400: Invalid or expired token
 * - 410: Token already used (email already verified)
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
      
      // Redirect to sign-in with error message
      const redirectUrl = new URL('/sign-in', env.BETTER_AUTH_URL);
      redirectUrl.searchParams.set('error', 'missing_token');
      redirectUrl.searchParams.set('message', 'Verification token is missing');
      
      return NextResponse.redirect(redirectUrl);
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
      
      // Redirect to sign-in with error message
      const redirectUrl = new URL('/sign-in', env.BETTER_AUTH_URL);
      redirectUrl.searchParams.set('error', 'invalid_token');
      redirectUrl.searchParams.set('message', 'Verification link is invalid or has expired');
      
      return NextResponse.redirect(redirectUrl);
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
      
      // Redirect to sign-in with error message
      const redirectUrl = new URL('/sign-in', env.BETTER_AUTH_URL);
      redirectUrl.searchParams.set('error', 'user_not_found');
      redirectUrl.searchParams.set('message', 'User account not found');
      
      return NextResponse.redirect(redirectUrl);
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
      
      // Redirect to sign-in with info message
      const redirectUrl = new URL('/sign-in', env.BETTER_AUTH_URL);
      redirectUrl.searchParams.set('info', 'already_verified');
      redirectUrl.searchParams.set('message', 'Your email is already verified. You can sign in now.');
      
      return NextResponse.redirect(redirectUrl);
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
    
    // Redirect to sign-in with success message
    const redirectUrl = new URL('/sign-in', env.BETTER_AUTH_URL);
    redirectUrl.searchParams.set('success', 'email_verified');
    redirectUrl.searchParams.set('message', 'Email verified successfully! You can now sign in.');
    
    return NextResponse.redirect(redirectUrl);
    
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
    
    // Redirect to sign-in with error message
    const redirectUrl = new URL('/sign-in', env.BETTER_AUTH_URL);
    redirectUrl.searchParams.set('error', 'server_error');
    redirectUrl.searchParams.set('message', 'An unexpected error occurred. Please try again later.');
    
    return NextResponse.redirect(redirectUrl);
  }
}
