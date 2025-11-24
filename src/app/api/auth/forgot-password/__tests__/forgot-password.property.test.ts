/**
 * Property-based tests for POST /api/auth/forgot-password endpoint
 * 
 * Tests password reset token creation and time-limited expiration
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword } from '@/server/auth/password';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { clearAllLimits } from '@/server/auth/rate-limiter';
import { forgotPasswordSchema } from '@/features/auth/utils/validators';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

// Test user data
let testUserId: string;
let testUserEmail: string;

/**
 * Setup: Create a test user before all tests
 */
beforeAll(async () => {
  // Create test user
  const passwordHash = await hashPassword('TestPassword123!');
  const [user] = await db
    .insert(users)
    .values({
      email: `test-forgot-${Date.now()}@example.com`,
      passwordHash,
      name: 'Test Forgot Password User',
      emailVerified: true,
    })
    .returning();

  testUserId = user.id;
  testUserEmail = user.email;
});

/**
 * Cleanup: Delete test user and all tokens after all tests
 */
afterAll(async () => {
  // Delete all tokens for test user
  await db.delete(verificationTokens).where(eq(verificationTokens.userId, testUserId));
  
  // Delete test user
  await db.delete(users).where(eq(users.id, testUserId));
});

/**
 * Cleanup: Delete all tokens and reset rate limits before each test
 */
beforeEach(async () => {
  // Delete all tokens for test user
  await db.delete(verificationTokens).where(eq(verificationTokens.userId, testUserId));
  
  // Clear rate limits
  await clearAllLimits();
});

/**
 * Helper function to create a mock NextRequest
 */
function createMockRequest(body: any): NextRequest {
  const url = 'http://localhost:3000/api/auth/forgot-password';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  return request;
}

describe('POST /api/auth/forgot-password - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 16: Password reset creates time-limited token
   * Validates: Requirements 6.1
   * 
   * For any password reset request, a token should be created with an expiration of 1 hour.
   */
  test('Property 16: Password reset creates time-limited token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid email (use test user email)
        fc.constant(testUserEmail),
        async (email) => {
          // Record the time before making the request
          const beforeRequest = Date.now();

          // Create mock request
          const request = createMockRequest({ email });

          // Call the forgot-password endpoint
          const response = await POST(request);

          // Record the time after the request
          const afterRequest = Date.now();

          // Verify response status is 200 OK (always returns success)
          expect(response.status).toBe(200);

          // Parse response body
          const body = await response.json();

          // Verify success message (generic to prevent email enumeration)
          expect(body.message).toBe(
            'If an account exists with that email, a password reset link has been sent.'
          );

          // Verify token was created in database
          const tokens = await db
            .select()
            .from(verificationTokens)
            .where(
              and(
                eq(verificationTokens.userId, testUserId),
                eq(verificationTokens.type, 'password_reset'),
                isNull(verificationTokens.usedAt)
              )
            );

          // Should have exactly one unused password reset token
          expect(tokens.length).toBe(1);

          const token = tokens[0];

          // Verify token properties
          expect(token.userId).toBe(testUserId);
          expect(token.type).toBe('password_reset');
          expect(token.token).toBeDefined();
          expect(token.token.length).toBeGreaterThan(0);
          expect(token.usedAt).toBeNull();

          // Verify token expiration is approximately 1 hour from now
          const tokenExpiresAt = token.expiresAt.getTime();
          const expectedExpiration = beforeRequest + 60 * 60 * 1000; // 1 hour
          const maxExpiration = afterRequest + 60 * 60 * 1000; // 1 hour

          // Token expiration should be within the expected range
          // Allow for some variance due to processing time
          expect(tokenExpiresAt).toBeGreaterThanOrEqual(expectedExpiration - 1000); // -1s tolerance
          expect(tokenExpiresAt).toBeLessThanOrEqual(maxExpiration + 1000); // +1s tolerance

          // Verify token is not expired yet
          const now = Date.now();
          expect(tokenExpiresAt).toBeGreaterThan(now);

          // Verify token expiration is approximately 1 hour (3600 seconds)
          const expirationDuration = tokenExpiresAt - now;
          const oneHourMs = 60 * 60 * 1000;
          
          // Should be close to 1 hour (within 5 seconds tolerance)
          expect(expirationDuration).toBeGreaterThan(oneHourMs - 5000);
          expect(expirationDuration).toBeLessThan(oneHourMs + 5000);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify that requesting password reset invalidates previous tokens
   */
  test('Property 16 (token invalidation): New reset request invalidates previous tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of previous requests (1-3)
        fc.integer({ min: 1, max: 3 }),
        async (numPreviousRequests) => {
          // Clear any existing tokens before this test iteration
          await db.delete(verificationTokens).where(eq(verificationTokens.userId, testUserId));
          
          // Make multiple password reset requests
          for (let i = 0; i < numPreviousRequests; i++) {
            const request = createMockRequest({ email: testUserEmail });
            const response = await POST(request);
            expect(response.status).toBe(200);
            
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Verify only the last token is unused
          const unusedTokens = await db
            .select()
            .from(verificationTokens)
            .where(
              and(
                eq(verificationTokens.userId, testUserId),
                eq(verificationTokens.type, 'password_reset'),
                isNull(verificationTokens.usedAt)
              )
            );

          // Should have exactly one unused token (the most recent one)
          expect(unusedTokens.length).toBe(1);

          // Verify all tokens created in this test
          const allTokens = await db
            .select()
            .from(verificationTokens)
            .where(
              and(
                eq(verificationTokens.userId, testUserId),
                eq(verificationTokens.type, 'password_reset')
              )
            );

          // Should have all tokens (previous + current)
          expect(allTokens.length).toBe(numPreviousRequests);

          // Count used tokens (should be numPreviousRequests - 1)
          const usedTokens = allTokens.filter(t => t.usedAt !== null);
          expect(usedTokens.length).toBe(numPreviousRequests - 1);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify that password reset for non-existent email returns success
   * (prevents email enumeration)
   */
  test('Property 16 (email enumeration prevention): Non-existent email returns success', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random non-existent emails (valid format only)
        fc.tuple(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
          fc.constantFrom('example.com', 'test.com', 'demo.org', 'sample.net')
        ).map(([local, domain]) => `${local}@${domain}`),
        async (nonExistentEmail) => {
          // Skip if this is the test user email
          if (nonExistentEmail === testUserEmail) {
            return;
          }
          
          // Create mock request with non-existent email
          const request = createMockRequest({ email: nonExistentEmail });

          // Call the forgot-password endpoint
          const response = await POST(request);

          // Verify response status is 200 OK (same as existing user)
          expect(response.status).toBe(200);

          // Parse response body
          const body = await response.json();

          // Verify success message (same as existing user)
          expect(body.message).toBe(
            'If an account exists with that email, a password reset link has been sent.'
          );

          // Verify no token was created
          const tokens = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.type, 'password_reset'));

          // Should not have any tokens for non-existent user
          const tokensForNonExistentUser = tokens.filter(
            t => t.userId !== testUserId
          );
          expect(tokensForNonExistentUser.length).toBe(0);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify rate limiting (3 requests per email per hour)
   */
  test('Property 16 (rate limiting): Exceeding rate limit returns 429', async () => {
    // Make 3 requests (the limit)
    for (let i = 0; i < 3; i++) {
      const request = createMockRequest({ email: testUserEmail });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    // 4th request should be rate limited
    const request = createMockRequest({ email: testUserEmail });
    const response = await POST(request);

    // Verify response status is 429 Too Many Requests
    expect(response.status).toBe(429);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.error.message).toContain('Too many password reset requests');

    // Verify Retry-After header is present
    const retryAfter = response.headers.get('Retry-After');
    expect(retryAfter).toBeDefined();
    expect(parseInt(retryAfter!)).toBeGreaterThan(0);
  });

  /**
   * Additional test: Verify validation errors for invalid email
   */
  test('Property 16 (validation): Invalid email returns 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random invalid emails
        fc.oneof(
          fc.constant(''),
          fc.constant('not-an-email'),
          fc.constant('missing@domain'),
          fc.constant('@nodomain.com'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@'))
        ),
        async (invalidEmail) => {
          // Create mock request with invalid email
          const request = createMockRequest({ email: invalidEmail });

          // Call the forgot-password endpoint
          const response = await POST(request);

          // Verify response status is 400 Bad Request
          expect(response.status).toBe(400);

          // Parse response body
          const body = await response.json();

          // Verify error response
          expect(body.error).toBeDefined();
          expect(body.error.code).toBe('VALIDATION_ERROR');
          expect(body.error.field).toBe('email');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify email normalization (case-insensitive)
   */
  test('Property 16 (email normalization): Email is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random case variations of test email
        fc.constantFrom(
          testUserEmail.toUpperCase(),
          testUserEmail.toLowerCase(),
          testUserEmail.charAt(0).toUpperCase() + testUserEmail.slice(1).toLowerCase()
        ),
        async (emailVariation) => {
          // Clear rate limits before each iteration
          await clearAllLimits();
          
          // Clear existing tokens
          await db.delete(verificationTokens).where(eq(verificationTokens.userId, testUserId));
          
          // Create mock request with email variation
          const request = createMockRequest({ email: emailVariation });

          // Call the forgot-password endpoint
          const response = await POST(request);

          // Verify response status is 200 OK
          expect(response.status).toBe(200);

          // Verify token was created for the correct user
          const tokens = await db
            .select()
            .from(verificationTokens)
            .where(
              and(
                eq(verificationTokens.userId, testUserId),
                eq(verificationTokens.type, 'password_reset'),
                isNull(verificationTokens.usedAt)
              )
            );

          // Should have created a token for the test user
          expect(tokens.length).toBeGreaterThan(0);
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
