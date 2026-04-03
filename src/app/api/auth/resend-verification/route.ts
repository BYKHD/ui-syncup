/**
 * POST /api/auth/resend-verification
 *
 * Resend email verification endpoint
 *
 * Allows users to request a new verification email if they didn't receive
 * the original one or if it expired. Rate limited to prevent abuse.
 *
 * @module api/auth/resend-verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, signupIntents } from '@/server/db/schema';
import { z } from 'zod';
import { generateToken, invalidateUserTokens } from '@/server/auth/tokens';
import { enqueueEmail } from '@/server/email/queue';
import { logAuthEvent } from '@/lib/logger';
import { env } from '@/lib/env';
import { validateEmailUrl } from '@/lib/url-validator';
import { eq } from 'drizzle-orm';
import {
  checkLimit,
  createRateLimitKey,
  RATE_LIMITS,
  getResetTime
} from '@/server/auth/rate-limiter';

/**
 * Request body validation schema
 */
const resendVerificationSchema = z.object({
  email: z.string().email().max(320),
});

/**
 * POST /api/auth/resend-verification
 *
 * Request body:
 * - email: string (valid email)
 *
 * Success response (200):
 * {
 *   "message": "If an unverified account exists with this email, a verification link has been sent."
 * }
 *
 * Error responses:
 * - 400: Validation error (invalid email format)
 * - 429: Too many requests (rate limit exceeded)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = resendVerificationSchema.parse(body);

    // Normalize email
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Rate limiting: 3 requests per email per hour
    const rateLimitKey = createRateLimitKey.resendVerification(normalizedEmail);
    const isAllowed = await checkLimit(
      rateLimitKey,
      RATE_LIMITS.RESEND_VERIFICATION.limit,
      RATE_LIMITS.RESEND_VERIFICATION.windowMs,
      {
        email: normalizedEmail,
        ipAddress,
        requestId,
      }
    );

    if (!isAllowed) {
      const retryAfter = await getResetTime(rateLimitKey);

      logAuthEvent('auth.resend_verification.rate_limited', {
        outcome: 'failure',
        email: normalizedEmail,
        ipAddress,
        userAgent,
        requestId,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        errorMessage: 'Too many resend verification requests',
        metadata: {
          retryAfter,
        },
      });

      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    logAuthEvent('auth.resend_verification.attempt', {
      outcome: 'success',
      email: normalizedEmail,
      ipAddress,
      userAgent,
      requestId,
    });

    // Find user by email
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Security: Don't reveal if user exists or if email is already verified
    // Always return success response to prevent email enumeration
    if (!user) {
      logAuthEvent('auth.resend_verification.user_not_found', {
        outcome: 'success',
        email: normalizedEmail,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          reason: 'user_not_found',
        },
      });

      return NextResponse.json({
        message: 'If an unverified account exists with this email, a verification link has been sent.',
      });
    }

    if (user.emailVerified) {
      logAuthEvent('auth.resend_verification.already_verified', {
        outcome: 'success',
        userId: user.id,
        email: normalizedEmail,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          reason: 'already_verified',
        },
      });

      return NextResponse.json({
        message: 'If an unverified account exists with this email, a verification link has been sent.',
      });
    }

    // Invalidate all existing email verification tokens for this user
    await invalidateUserTokens(user.id, 'email_verification');

    // Generate new email verification token (24 hours)
    const tokenResult = await generateToken(
      user.id,
      'email_verification',
      24 * 60 * 60 * 1000 // 24 hours
    );

    // Construct verification URL, embedding callbackUrl if a signup intent exists
    let verificationUrl = `${env.BETTER_AUTH_URL}/verify-email-confirm?token=${encodeURIComponent(tokenResult.token)}`;

    const [intent] = await db
      .select({ callbackUrl: signupIntents.callbackUrl })
      .from(signupIntents)
      .where(eq(signupIntents.email, normalizedEmail))
      .limit(1);

    if (intent?.callbackUrl) {
      verificationUrl += `&callbackUrl=${encodeURIComponent(intent.callbackUrl)}`;
      await db.delete(signupIntents).where(eq(signupIntents.email, normalizedEmail));
    }

    // Validate URL before sending (prevents localhost URLs in production)
    validateEmailUrl(verificationUrl, 'resend-verification-email');

    // Enqueue verification email
    await enqueueEmail({
      userId: user.id,
      tokenId: tokenResult.tokenId,
      type: 'verification',
      to: user.email,
      template: {
        type: 'verification',
        data: {
          name: user.name,
          verificationUrl,
        },
      },
    });

    logAuthEvent('auth.resend_verification.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      requestId,
      metadata: {
        tokenId: tokenResult.tokenId,
      },
    });

    return NextResponse.json({
      message: 'If an unverified account exists with this email, a verification link has been sent.',
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      logAuthEvent('auth.resend_verification.validation_error', {
        outcome: 'failure',
        ipAddress,
        userAgent,
        requestId,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid request data',
        metadata: {
          errors: error.issues,
        },
      });

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    logAuthEvent('auth.resend_verification.error', {
      outcome: 'failure',
      ipAddress,
      userAgent,
      requestId,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
