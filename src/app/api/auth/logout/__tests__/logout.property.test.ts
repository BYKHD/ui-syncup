/**
 * Property-based tests for POST /api/auth/logout endpoint
 * 
 * Tests session invalidation and multi-device session preservation
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { users, sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/server/auth/session';
import { hashPassword } from '@/server/auth/password';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as loggerModule from '@/lib/logger';

/**
 * Mock the Next.js cookies() function
 * This is necessary because cookies() is a Next.js server-only function
 */
let mockSessionToken: string | null = null;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'session_token' && mockSessionToken) {
        return { value: mockSessionToken };
      }
      return undefined;
    }),
  })),
}));

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

const userAgentArb = fc
  .string({ minLength: 10, maxLength: 200 })
  .filter(s => s.trim().length > 0 && !s.includes('\\'));

// Test user data
let testUserId: string;
let testUserEmail: string;

/**
 * Create a fresh test user for each test run.
 * The global vitest.setup.ts resets the in-memory DB before every test,
 * so we need to seed the user after that reset.
 */
async function createTestUser() {
  const passwordHash = await hashPassword('TestPassword123!');
  const [user] = await db
    .insert(users)
    .values({
      email: `test-logout-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      passwordHash,
      name: 'Test Logout User',
      emailVerified: true,
    })
    .returning();

  testUserId = user.id;
  testUserEmail = user.email;
}

/**
 * Cleanup: Delete all sessions before each test
 */
beforeEach(async () => {
  await createTestUser();

  // Delete all sessions for test user (defensive; tables are reset globally)
  await db.delete(sessions).where(eq(sessions.userId, testUserId));
  
  mockSessionToken = null; // Reset mock session token
});

/**
 * Helper function to create a mock NextRequest
 */
function createMockRequest(): NextRequest {
  const url = 'http://localhost:3000/api/auth/logout';
  const request = new NextRequest(url, {
    method: 'POST',
  });
  
  return request;
}

describe('POST /api/auth/logout - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 12: Sign-out invalidates session
   * Validates: Requirements 5.1
   * 
   * For any authenticated user, signing out should delete the session from
   * the database and clear the cookie.
   */
  test('Property 12: Sign-out invalidates session', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random IP addresses and user agents
        fc.ipV4(),
        userAgentArb,
        async (ipAddress, userAgent) => {
          // Create a valid session
          const sessionToken = await createSession(testUserId, ipAddress, userAgent);

          // Set mock session token for this test
          mockSessionToken = sessionToken;

          // Verify session exists in database before logout
          const [sessionBefore] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.token, sessionToken))
            .limit(1);

          expect(sessionBefore).toBeDefined();
          expect(sessionBefore.token).toBe(sessionToken);
          expect(sessionBefore.userId).toBe(testUserId);

          // Create mock request
          const request = createMockRequest();

          // Call the logout endpoint
          const response = await POST(request);

          // Verify response status is 200 OK
          expect(response.status).toBe(200);

          // Parse response body
          const body = await response.json();

          // Verify success message
          expect(body.message).toBe('Signed out successfully');

          // Verify session cookie is cleared (maxAge=0)
          const setCookieHeader = response.headers.get('set-cookie');
          expect(setCookieHeader).toBeDefined();
          expect(setCookieHeader).toContain('session_token=');
          expect(setCookieHeader).toContain('Max-Age=0');

          // Verify session is deleted from database
          const [sessionAfter] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.token, sessionToken))
            .limit(1);

          expect(sessionAfter).toBeUndefined();

          // Reset mock
          mockSessionToken = null;
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: authentication-system, Property 13: Sign-out preserves other sessions
   * Validates: Requirements 5.5
   * 
   * For any user with multiple active sessions, signing out from one session
   * should not affect the other sessions.
   */
  test('Property 13: Sign-out preserves other sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of additional sessions (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate random IP addresses and user agents for each session
        fc.array(
          fc.record({
            ipAddress: fc.ipV4(),
            userAgent: userAgentArb,
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (numOtherSessions, sessionData) => {
          // Create the session we'll sign out from
          const currentSessionToken = await createSession(
            testUserId,
            '192.168.1.1',
            'Current Device'
          );

          // Create additional sessions on other devices
          const otherSessionTokens: string[] = [];
          for (let i = 0; i < numOtherSessions; i++) {
            const data = sessionData[i % sessionData.length];
            const token = await createSession(
              testUserId,
              data.ipAddress,
              data.userAgent
            );
            otherSessionTokens.push(token);
          }

          // Verify all sessions exist before logout
          const allSessionsBefore = await db
            .select()
            .from(sessions)
            .where(eq(sessions.userId, testUserId));

          expect(allSessionsBefore.length).toBe(numOtherSessions + 1);

          // Set mock session token to current session
          mockSessionToken = currentSessionToken;

          // Create mock request
          const request = createMockRequest();

          // Call the logout endpoint
          const response = await POST(request);

          // Verify response status is 200 OK
          expect(response.status).toBe(200);

          // Verify current session is deleted
          const [currentSessionAfter] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.token, currentSessionToken))
            .limit(1);

          expect(currentSessionAfter).toBeUndefined();

          // Verify other sessions still exist
          const otherSessionsAfter = await db
            .select()
            .from(sessions)
            .where(eq(sessions.userId, testUserId));

          expect(otherSessionsAfter.length).toBe(numOtherSessions);

          // Verify each other session still exists
          for (const otherToken of otherSessionTokens) {
            const [otherSession] = await db
              .select()
              .from(sessions)
              .where(eq(sessions.token, otherToken))
              .limit(1);

            expect(otherSession).toBeDefined();
            expect(otherSession.token).toBe(otherToken);
            expect(otherSession.userId).toBe(testUserId);
          }

          // Cleanup: Delete remaining sessions
          await db.delete(sessions).where(eq(sessions.userId, testUserId));
          mockSessionToken = null;
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify that logout without session returns 401
   */
  test('Property 12 (negative case): Logout without session returns 401', async () => {
    // Ensure no session token is set
    mockSessionToken = null;

    // Create mock request
    const request = createMockRequest();

    // Call the logout endpoint
    const response = await POST(request);

    // Verify response status is 401 Unauthorized
    expect(response.status).toBe(401);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_AUTHENTICATED');
    expect(body.error.message).toBe('No active session found');
  });

  /**
   * Additional test: Verify that logout with invalid session returns 401
   */
  test('Property 12 (negative case): Logout with invalid session returns 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random invalid session tokens
        fc.string({ minLength: 10, maxLength: 100 }),
        async (invalidToken) => {
          // Set mock session token to invalid token
          mockSessionToken = invalidToken;

          // Create mock request
          const request = createMockRequest();

          // Call the logout endpoint
          const response = await POST(request);

          // Verify response status is 401 Unauthorized
          expect(response.status).toBe(401);

          // Parse response body
          const body = await response.json();

          // Verify error response
          expect(body.error).toBeDefined();
          expect(body.error.code).toBe('NOT_AUTHENTICATED');

          // Reset mock
          mockSessionToken = null;
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify that logout with expired session returns 401
   */
  test('Property 12 (negative case): Logout with expired session returns 401', async () => {
    // Create a session
    const sessionToken = await createSession(testUserId, '127.0.0.1', 'Test Agent');

    // Manually expire the session by setting expiresAt to the past
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // 1 second ago
      .where(eq(sessions.token, sessionToken));

    // Set mock session token
    mockSessionToken = sessionToken;

    // Create mock request
    const request = createMockRequest();

    // Call the logout endpoint
    const response = await POST(request);

    // Verify response status is 401 Unauthorized
    expect(response.status).toBe(401);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_AUTHENTICATED');

    // Cleanup
    await db.delete(sessions).where(eq(sessions.token, sessionToken));
    mockSessionToken = null;
  });

  /**
   * Feature: authentication-system, Property 14: Sign-out logs event
   * Validates: Requirements 5.4
   * 
   * For any sign-out action, a log entry should be created with user ID and timestamp.
   */
  test('Property 14: Sign-out logs event', async () => {
    // Spy on logAuthEvent
    const logAuthEventSpy = vi.spyOn(loggerModule, 'logAuthEvent');

    await fc.assert(
      fc.asyncProperty(
        // Generate random IP addresses and user agents
        fc.ipV4(),
        userAgentArb,
        async (ipAddress, userAgent) => {
          // Create a valid session
          const sessionToken = await createSession(testUserId, ipAddress, userAgent);

          // Set mock session token for this test
          mockSessionToken = sessionToken;

          // Clear previous spy calls
          logAuthEventSpy.mockClear();

          // Create mock request
          const request = createMockRequest();

          // Call the logout endpoint
          const response = await POST(request);

          // Verify response status is 200 OK
          expect(response.status).toBe(200);

          // Verify logAuthEvent was called
          expect(logAuthEventSpy).toHaveBeenCalled();

          // Find the success log call
          const successLogCall = logAuthEventSpy.mock.calls.find(
            call => call[0] === 'auth.logout.success' && call[1].outcome === 'success'
          );

          expect(successLogCall).toBeDefined();

          if (successLogCall) {
            const [eventType, context] = successLogCall;

            // Verify event type
            expect(eventType).toBe('auth.logout.success');

            // Verify outcome
            expect(context.outcome).toBe('success');

            // Verify user ID is logged
            expect(context.userId).toBe(testUserId);

            // Verify email is logged (will be hashed)
            expect(context.email).toBeDefined();

            // Verify request context is logged
            expect(context.requestId).toBeDefined();
            expect(typeof context.requestId).toBe('string');

            // Verify IP address and user agent are logged
            expect(context.ipAddress).toBeDefined();
            expect(context.userAgent).toBeDefined();

            // Verify metadata contains session ID
            expect(context.metadata).toBeDefined();
            expect(context.metadata?.sessionId).toBeDefined();
          }

          // Cleanup
          await db.delete(sessions).where(eq(sessions.userId, testUserId));
          mockSessionToken = null;
        }
      ),
      PROPERTY_CONFIG
    );

    // Restore spy
    logAuthEventSpy.mockRestore();
  });
});
