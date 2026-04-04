/**
 * POST /api/auth/reset-password
 * 
 * Password reset completion endpoint
 * 
 * Verifies the reset token, updates the user's password, marks the token as used,
 * and invalidates all existing sessions for security.
 * 
 * @module api/auth/reset-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, account } from '@/server/db/schema';
import { resetPasswordSchema } from '@/features/auth/utils/validators';
import { verifyToken, markTokenAsUsed } from '@/server/auth/tokens';
import { hashPassword } from '@/server/auth/password';
import { deleteAllUserSessions } from '@/server/auth/session';
import { logAuthEvent } from '@/lib/logger';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check common headers for IP address (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to localhost (for development)
  return '127.0.0.1';
}

/**
 * POST /api/auth/reset-password
 * 
 * Request body:
 * - token: string (password reset token)
 * - password: string (new password, must meet complexity requirements)
 * - confirmPassword: string (must match password)
 * 
 * Success response (200):
 * {
 *   "message": "Password reset successfully. You can now sign in with your new password."
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input or token format)
 * - 410: Gone (token already used or expired)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate with Zod schema
    const validatedData = resetPasswordSchema.parse(body);
    
    logAuthEvent('auth.reset_password.success', {
      outcome: 'success',
      ipAddress: clientIp,
      userAgent,
      requestId,
      metadata: {
        stage: 'attempt',
      },
    });
    
    // Verify token signature and expiration
    const verifiedToken = await verifyToken(
      validatedData.token,
      'password_reset',
      {
        ipAddress: clientIp,
        userAgent,
        requestId,
      }
    );
    
    if (!verifiedToken) {
      logAuthEvent('auth.reset_password.failure', {
        outcome: 'failure',
        ipAddress: clientIp,
        userAgent,
        requestId,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Invalid or expired password reset token',
        metadata: {
          reason: 'invalid_or_expired_token',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired password reset token',
          },
        },
        { status: 410 }
      );
    }
    
    // Get user data
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, verifiedToken.userId))
      .limit(1);
    
    if (!user) {
      logAuthEvent('auth.reset_password.failure', {
        outcome: 'error',
        userId: verifiedToken.userId,
        ipAddress: clientIp,
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
            message: 'User account not found',
          },
        },
        { status: 400 }
      );
    }
    
    // Hash new password
    const passwordHash = await hashPassword(validatedData.password);

    // Update the credential account record — this is what better-auth uses for login
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(and(eq(account.userId, user.id), eq(account.providerId, "credential")));
    
    // Mark token as used
    await markTokenAsUsed(verifiedToken.tokenId);
    
    // Invalidate all user sessions for security
    await deleteAllUserSessions(user.id);
    
    logAuthEvent('auth.reset_password.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress: clientIp,
      userAgent,
      requestId,
      metadata: {
        tokenId: verifiedToken.tokenId,
        sessionsInvalidated: true,
      },
    });
    
    return NextResponse.json(
      {
        message: 'Password reset successfully. You can now sign in with your new password.',
      },
      { status: 200 }
    );
    
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const firstError = Object.entries(fieldErrors)[0];
      
      if (firstError) {
        const [field, messages] = firstError;
        
        logAuthEvent('auth.reset_password.failure', {
          outcome: 'failure',
          ipAddress: clientIp,
          userAgent,
          requestId,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: messages?.[0] || 'Validation failed',
          metadata: {
            field,
            details: fieldErrors,
          },
        });
        
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: messages?.[0] || 'Validation failed',
              field,
              details: fieldErrors,
            },
          },
          { status: 400 }
        );
      }
    }
    
    // Handle other errors
    logAuthEvent('auth.reset_password.failure', {
      outcome: 'error',
      ipAddress: clientIp,
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
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}
