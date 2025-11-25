/**
 * POST /api/auth/login
 * 
 * User sign-in endpoint
 * 
 * Validates credentials, checks email verification, creates session,
 * and sets HTTP-only session cookie. Implements rate limiting to
 * prevent brute force attacks.
 * 
 * @module api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema';
import { signInSchema } from '@/features/auth/utils/validators';
import { verifyPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { setSessionCookie } from '@/server/auth/cookies';
import { 
  checkLimit, 
  getResetTime, 
  createRateLimitKey,
  RATE_LIMITS 
} from '@/server/auth/rate-limiter';
import { logAuthEvent } from '@/lib/logger';
import { eq } from 'drizzle-orm';
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
 * POST /api/auth/login
 * 
 * Request body:
 * - email: string (valid email)
 * - password: string
 * 
 * Success response (200):
 * {
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "name": "User Name",
 *     "emailVerified": true
 *   }
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input)
 * - 401: Authentication error (invalid credentials)
 * - 403: Forbidden (email not verified)
 * - 429: Too many requests (rate limit exceeded)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate with Zod schema
    const validatedData = signInSchema.parse(body);
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = validatedData.email.toLowerCase().trim();
    
    // Apply rate limiting - IP-based (5 per minute)
    const ipRateLimitKey = createRateLimitKey.signInIp(clientIp);
    const ipAllowed = await checkLimit(
      ipRateLimitKey,
      RATE_LIMITS.SIGNIN_IP.limit,
      RATE_LIMITS.SIGNIN_IP.windowMs
    );
    
    if (!ipAllowed) {
      const retryAfter = await getResetTime(ipRateLimitKey);
      
      // Rate limit logging is already handled in checkLimit function
      
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many sign-in attempts. Please try again later.',
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
    
    // Apply rate limiting - Email-based (3 per 15 minutes)
    const emailRateLimitKey = createRateLimitKey.signInEmail(normalizedEmail);
    const emailAllowed = await checkLimit(
      emailRateLimitKey,
      RATE_LIMITS.SIGNIN_EMAIL.limit,
      RATE_LIMITS.SIGNIN_EMAIL.windowMs
    );
    
    if (!emailAllowed) {
      const retryAfter = await getResetTime(emailRateLimitKey);
      
      // Rate limit logging is already handled in checkLimit function
      
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many sign-in attempts for this account. Please try again later.',
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
    
    logAuthEvent('auth.login.attempt', {
      outcome: 'success',
      email: normalizedEmail,
      ipAddress: clientIp,
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
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('[Login Debug]', {
        email: user.email,
        emailVerified: user.emailVerified,
        hasPassword: !!user.passwordHash,
      });
    }
    
    // User not found or invalid password - return generic error
    if (!user) {
      logAuthEvent('auth.login.failure', {
        outcome: 'failure',
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent,
        requestId,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid email or password',
        metadata: {
          reason: 'user_not_found',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }
    
    // Verify password
    if (!user.passwordHash) {
      logAuthEvent('auth.login.failure', {
        outcome: 'failure',
        userId: user.id,
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent,
        requestId,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid email or password',
        metadata: {
          reason: 'no_password_hash',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }
    
    const isPasswordValid = await verifyPassword(
      validatedData.password,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      logAuthEvent('auth.login.failure', {
        outcome: 'failure',
        userId: user.id,
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent,
        requestId,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid email or password',
        metadata: {
          reason: 'invalid_password',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      logAuthEvent('auth.login.failure', {
        outcome: 'failure',
        userId: user.id,
        email: normalizedEmail,
        ipAddress: clientIp,
        userAgent,
        requestId,
        errorCode: 'EMAIL_NOT_VERIFIED',
        errorMessage: 'Please verify your email address before signing in',
        metadata: {
          reason: 'email_not_verified',
        },
      });
      
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before signing in',
          },
        },
        { status: 403 }
      );
    }
    
    // Create session
    const sessionToken = await createSession(user.id, clientIp, userAgent);
    
    logAuthEvent('auth.login.success', {
      outcome: 'success',
      userId: user.id,
      email: user.email,
      ipAddress: clientIp,
      userAgent,
      requestId,
    });
    
    // Return user data with session cookie
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 }
    );
    
    // Set session cookie
    setSessionCookie(response, sessionToken);
    
    return response;
    
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      
      if (firstError) {
        const [field, messages] = firstError;
        
        logAuthEvent('auth.login.failure', {
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
    logAuthEvent('auth.login.failure', {
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
