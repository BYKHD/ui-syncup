/**
 * POST /api/auth/dev/reset-rate-limit
 *
 * Reset rate limits endpoint (DEV ONLY)
 *
 * Clears all rate limit counters or specific rate limits by key.
 * Useful for testing authentication flows without waiting for rate limits to expire.
 *
 * WARNING: This endpoint should only be available in development mode.
 *
 * @module api/auth/dev/reset-rate-limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAllLimits, resetLimit } from '@/server/auth/rate-limiter';
import { logAuthEvent } from '@/lib/logger';

/**
 * POST /api/auth/dev/reset-rate-limit
 *
 * Request body (optional):
 * {
 *   "key": "signin:email:user@example.com" // Optional: reset specific key
 * }
 *
 * Success response (200):
 * {
 *   "message": "Rate limits cleared successfully",
 *   "cleared": "all" | "specific"
 * }
 *
 * Error responses:
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
      logAuthEvent('auth.reset_rate_limit.failure', {
        outcome: 'failure',
        requestId,
        ipAddress,
        userAgent,
        errorCode: 'NOT_AVAILABLE_IN_PRODUCTION',
        errorMessage: 'Reset rate limit is only available in development mode',
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

    // Parse request body (optional)
    let body: { key?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Ignore parse errors - treat as empty body
    }

    // Reset specific key or all limits
    if (body.key) {
      await resetLimit(body.key);
      
      logAuthEvent('auth.reset_rate_limit.success', {
        outcome: 'success',
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          cleared: 'specific',
          key: body.key,
        },
      });

      return NextResponse.json(
        {
          message: `Rate limit cleared for key: ${body.key}`,
          cleared: 'specific',
          key: body.key,
        },
        { status: 200 }
      );
    } else {
      await clearAllLimits();
      
      logAuthEvent('auth.reset_rate_limit.success', {
        outcome: 'success',
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          cleared: 'all',
        },
      });

      return NextResponse.json(
        {
          message: 'All rate limits cleared successfully',
          cleared: 'all',
        },
        { status: 200 }
      );
    }

  } catch (error) {
    // Handle errors
    logAuthEvent('auth.reset_rate_limit.error', {
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
