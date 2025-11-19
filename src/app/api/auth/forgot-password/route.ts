/**
 * POST /api/auth/forgot-password
 * 
 * Password reset request endpoint
 * 
 * Generates a time-limited password reset token and sends it via email.
 * Always returns success to prevent email enumeration attacks.
 * Implements rate limiting to prevent abuse.
 * 
 * @module api/auth/forgot-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema';
import { forgotPasswordSchema } from '@/features/auth/utils/validators';
import { generateToken, invalidateUserTokens } from '@/server/auth/tokens';
import { enqueueEmail } from '@/server/email/queue';
import { 
  checkLimit, 
  getResetTime, 
  createRateLimitKey,
  RATE_LIMITS 
} from '@/server/auth/rate-limiter';
import { logger } from '@/lib/logger';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { env } from '@/lib/env';

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
 * POST /api/auth/forgot-password
 * 
 * Request body:
 * - email: string (valid email)
 * 
 * Success response (200):
 * {
 *   "message": "If an account exists with that email, a password reset link has been sent."
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input)
 * - 429: Too many requests (rate limit exceeded)
 * - 500: Internal server error
 * 
 * Note: Always returns success message to prevent email enumeration
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);
  
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate with Zod schema
    const validatedData = forgotPasswordSchema.parse(body);
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = validatedData.email.toLowerCase().trim();
    
    // Apply rate limiting - Email-based (3 per hour)
    const emailRateLimitKey = createRateLimitKey.passwordReset(normalizedEmail);
    const emailAllowed = await checkLimit(
      emailRateLimitKey,
      RATE_LIMITS.PASSWORD_RESET.limit,
      RATE_LIMITS.PASSWORD_RESET.windowMs
    );
    
    if (!emailAllowed) {
      const retryAfter = await getResetTime(emailRateLimitKey);
      
      logger.warn('auth.rate_limit.exceeded', {
        requestId,
        type: 'password_reset',
        email: normalizedEmail,
        retryAfter,
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many password reset requests. Please try again later.',
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
    
    logger.info('auth.reset_password.request', {
      requestId,
      email: normalizedEmail,
      ip: clientIp,
    });
    
    // Find user by email (silently fail if not found)
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    
    // If user exists, generate token and send email
    if (user) {
      try {
        // Invalidate previous password reset tokens
        await invalidateUserTokens(user.id, 'password_reset');
        
        // Generate password reset token (1 hour expiration)
        const { token, tokenId } = await generateToken(
          user.id,
          'password_reset',
          60 * 60 * 1000 // 1 hour
        );
        
        // Construct reset URL
        const resetUrl = `${env.BETTER_AUTH_URL}/reset-password?token=${token}`;
        
        // Enqueue password reset email
        await enqueueEmail({
          userId: user.id,
          tokenId,
          type: 'password_reset',
          to: user.email,
          template: {
            type: 'password_reset',
            data: {
              name: user.name,
              resetUrl,
            },
          },
        });
        
        logger.info('auth.reset_password.token_created', {
          requestId,
          userId: user.id,
          email: user.email,
          tokenId,
        });
      } catch (error) {
        // Log error but don't reveal it to user
        logger.error('auth.reset_password.error', {
          requestId,
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      // User not found - log but return success message
      logger.info('auth.reset_password.user_not_found', {
        requestId,
        email: normalizedEmail,
        ip: clientIp,
      });
    }
    
    // Always return success message (prevent email enumeration)
    return NextResponse.json(
      {
        message: 'If an account exists with that email, a password reset link has been sent.',
      },
      { status: 200 }
    );
    
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      
      if (firstError) {
        const [field, messages] = firstError;
        
        logger.info('auth.reset_password.validation_error', {
          requestId,
          field,
          message: messages?.[0],
          ip: clientIp,
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
    logger.error('auth.reset_password.error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIp,
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
