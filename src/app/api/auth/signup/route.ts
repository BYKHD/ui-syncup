/**
 * POST /api/auth/signup
 * 
 * User registration endpoint
 * 
 * Validates registration data, creates user account with hashed password,
 * generates email verification token, and enqueues verification email.
 * 
 * @module api/auth/signup
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema';
import { signUpSchema } from '@/features/auth/utils/validators';
import { hashPassword } from '@/server/auth/password';
import { generateToken } from '@/server/auth/tokens';
import { enqueueEmail } from '@/server/email/queue';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

/**
 * POST /api/auth/signup
 * 
 * Request body:
 * - email: string (valid email, max 320 chars)
 * - password: string (min 8 chars, uppercase, lowercase, number, special char)
 * - confirmPassword: string (must match password)
 * - name: string (min 1 char, max 120 chars)
 * 
 * Success response (201):
 * {
 *   "message": "Account created. Please check your email to verify your account."
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input)
 * - 409: Conflict (email already registered)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate with Zod schema
    const validatedData = signUpSchema.parse(body);
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = validatedData.email.toLowerCase().trim();
    
    logger.info('auth.signup.attempt', {
      requestId,
      email: normalizedEmail,
      name: validatedData.name,
    });
    
    // Check for duplicate email
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    
    if (existingUser.length > 0) {
      logger.info('auth.signup.failure', {
        requestId,
        email: normalizedEmail,
        reason: 'duplicate_email',
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists',
            field: 'email',
          },
        },
        { status: 409 }
      );
    }
    
    // Hash password with Argon2id
    const passwordHash = await hashPassword(validatedData.password);
    
    // Create user record with emailVerified=false
    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: validatedData.name.trim(),
        passwordHash,
        emailVerified: false,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });
    
    logger.info('auth.signup.user_created', {
      requestId,
      userId: newUser.id,
      email: newUser.email,
    });
    
    // Generate email verification token (24 hours)
    const tokenResult = await generateToken(
      newUser.id,
      'email_verification',
      24 * 60 * 60 * 1000 // 24 hours
    );
    
    logger.info('auth.signup.token_generated', {
      requestId,
      userId: newUser.id,
      tokenId: tokenResult.tokenId,
      expiresAt: tokenResult.expiresAt.toISOString(),
    });
    
    // Construct verification URL
    const verificationUrl = `${env.BETTER_AUTH_URL}/api/auth/verify-email?token=${encodeURIComponent(tokenResult.token)}`;
    
    // Enqueue verification email
    await enqueueEmail({
      userId: newUser.id,
      tokenId: tokenResult.tokenId,
      type: 'verification',
      to: newUser.email,
      template: {
        type: 'verification',
        data: {
          name: newUser.name,
          verificationUrl,
        },
      },
    });
    
    logger.info('auth.signup.success', {
      requestId,
      userId: newUser.id,
      email: newUser.email,
    });
    
    // Return success response
    return NextResponse.json(
      {
        message: 'Account created. Please check your email to verify your account.',
      },
      { status: 201 }
    );
    
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      
      if (firstError) {
        const [field, messages] = firstError;
        
        logger.info('auth.signup.failure', {
          requestId,
          reason: 'validation_error',
          field,
          message: messages?.[0],
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
    logger.error('auth.signup.error', {
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
