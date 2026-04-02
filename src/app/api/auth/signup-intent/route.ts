/**
 * POST /api/auth/signup-intent
 *
 * Stores a pending callbackUrl for a sign-up in progress so it can survive
 * the email-verification round-trip even when the user opens the verification
 * email on a different device or browser.
 *
 * Called by useSignUp before authClient.signUp.email().
 * Consumed (and deleted) by sendVerificationEmail in auth.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signupIntents } from '@/server/db/schema';
import { z } from 'zod';
import { isValidRedirectURL } from '@/lib/url-validator';
import { logAuthEvent } from '@/lib/logger';
import {
  checkLimit,
  createRateLimitKey,
  RATE_LIMITS,
  getResetTime,
} from '@/server/auth/rate-limiter';

const signupIntentSchema = z.object({
  email: z.string().email().max(320),
  callbackUrl: z.string().min(1).max(2048),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const body = await request.json();
    const validated = signupIntentSchema.parse(body);

    const normalizedEmail = validated.email.toLowerCase().trim();

    // Only allow relative paths — blocks open-redirect vectors
    if (!isValidRedirectURL(validated.callbackUrl, [])) {
      return NextResponse.json(
        { error: { code: 'INVALID_CALLBACK_URL', message: 'callbackUrl must be a relative path' } },
        { status: 400 }
      );
    }

    // Rate limit by email
    const rateLimitKey = createRateLimitKey.signupIntent(normalizedEmail);
    const isAllowed = await checkLimit(
      rateLimitKey,
      RATE_LIMITS.SIGNUP_INTENT.limit,
      RATE_LIMITS.SIGNUP_INTENT.windowMs,
      { email: normalizedEmail, ipAddress, requestId }
    );

    if (!isAllowed) {
      const retryAfter = await getResetTime(rateLimitKey);
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.', retryAfter } },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      );
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db
      .insert(signupIntents)
      .values({ email: normalizedEmail, callbackUrl: validated.callbackUrl, expiresAt })
      .onConflictDoUpdate({
        target: signupIntents.email,
        set: { callbackUrl: validated.callbackUrl, expiresAt },
      });

    logAuthEvent('auth.signup_intent.stored', {
      outcome: 'success',
      email: normalizedEmail,
      ipAddress,
      requestId,
    });

    return NextResponse.json({ message: 'ok' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      );
    }

    logAuthEvent('auth.signup_intent.error', {
      outcome: 'failure',
      ipAddress,
      requestId,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
