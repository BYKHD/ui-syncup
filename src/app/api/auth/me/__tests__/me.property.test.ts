/**
 * Property-based tests for GET /api/auth/me endpoint
 * 
 * Tests session validation, user data retrieval, and role fetching
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { users, sessions, userRoles } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/server/auth/session';
import { assignRole } from '@/server/auth/rbac';
import { hashPassword } from '@/server/auth/password';
import { GET } from '../route';
import { NextRequest } from 'next/server';

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
 * Create a fresh test user for each test.
 * The shared test DB is reset before every test run, so seed after the reset.
 */
async function createTestUser() {
  const passwordHash = await hashPassword('TestPassword123!');
  const [user] = await db
    .insert(users)
    .values({
      email: `test-me-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      passwordHash,
      name: 'Test User',
      emailVerified: true,
    })
    .returning();

  testUserId = user.id;
  testUserEmail = user.email;
}

/**
 * Cleanup: Delete all sessions and roles before each test
 */
beforeEach(async () => {
  await createTestUser();

  // Delete all sessions and roles for test user (defensive; tables are reset globally)
  await db.delete(sessions).where(eq(sessions.userId, testUserId));
  await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
  
  mockSessionToken = null; // Reset mock session token
});

/**
 * Helper function to create a mock NextRequest
 */
function createMockRequest(): NextRequest {
  const url = 'http://localhost:3000/api/auth/me';
  const request = new NextRequest(url, {
    method: 'GET',
  });
  
  return request;
}

describe('GET /api/auth/me - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 9: Valid session grants access
   * Validates: Requirements 4.1
   * 
   * For any authenticated user with a valid session cookie, requests to
   * protected resources should be allowed and return user data with roles.
   */
  test('Property 9: Valid session grants access', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random IP addresses and user agents
        fc.ipV4(),
        userAgentArb,
        // Generate random number of roles (0-3)
        fc.integer({ min: 0, max: 3 }),
        async (ipAddress, userAgent, roleCount) => {
          // Create a valid session
          const sessionToken = await createSession(testUserId, ipAddress, userAgent);

          // Set mock session token for this test
          mockSessionToken = sessionToken;

          // Assign random roles to user
          const roleTypes = ['TEAM_OWNER', 'TEAM_ADMIN', 'TEAM_EDITOR', 'TEAM_MEMBER'];
          const assignedRoles: string[] = [];
          
          for (let i = 0; i < roleCount; i++) {
            const role = roleTypes[i % roleTypes.length];
            // Generate a valid UUID for the resource ID
            const resourceId = crypto.randomUUID();
            
            await assignRole({
              userId: testUserId,
              role: role as any,
              resourceType: 'team',
              resourceId,
            });
            
            assignedRoles.push(role);
          }

          // Create mock request
          const request = createMockRequest();

          // Call the endpoint
          const response = await GET(request);

          // Verify response status
          expect(response.status).toBe(200);

          // Parse response body
          const body = await response.json();

          // Verify user data is returned
          expect(body.user).toBeDefined();
          expect(body.user.id).toBe(testUserId);
          expect(body.user.email).toBe(testUserEmail);
          expect(body.user.name).toBe('Test User');
          expect(body.user.emailVerified).toBe(true);

          // Verify roles are returned
          expect(body.user.roles).toBeDefined();
          expect(Array.isArray(body.user.roles)).toBe(true);
          expect(body.user.roles.length).toBe(roleCount);

          // Verify each role has required fields
          for (const role of body.user.roles) {
            expect(role.id).toBeDefined();
            expect(role.userId).toBe(testUserId);
            expect(role.role).toBeDefined();
            expect(role.resourceType).toBe('team');
            expect(role.resourceId).toBeDefined();
            expect(role.createdAt).toBeDefined();
            
            // Verify createdAt is a valid ISO string
            expect(() => new Date(role.createdAt)).not.toThrow();
          }

          // Cleanup: Delete session, roles, and reset mock
          await db.delete(sessions).where(eq(sessions.token, sessionToken));
          await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
          mockSessionToken = null;
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify that requests without valid session are rejected
   * 
   * This ensures the endpoint properly validates authentication.
   */
  test('Property 9 (negative case): Invalid session denies access', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random invalid session tokens
        fc.string({ minLength: 10, maxLength: 100 }),
        async (invalidToken) => {
          // Set mock session token to invalid token
          mockSessionToken = invalidToken;

          // Create mock request
          const request = createMockRequest();

          // Call the endpoint
          const response = await GET(request);

          // Verify response status is 401 Unauthorized
          expect(response.status).toBe(401);

          // Parse response body
          const body = await response.json();

          // Verify error response
          expect(body.error).toBeDefined();
          expect(body.error.code).toBe('UNAUTHORIZED');
          expect(body.error.message).toBeDefined();

          // Reset mock
          mockSessionToken = null;
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify that requests without session cookie are rejected
   */
  test('Property 9 (negative case): Missing session denies access', async () => {
    // Ensure no session token is set
    mockSessionToken = null;

    // Create mock request
    const request = createMockRequest();

    // Call the endpoint
    const response = await GET(request);

    // Verify response status is 401 Unauthorized
    expect(response.status).toBe(401);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Not authenticated');
  });

  /**
   * Additional test: Verify that expired sessions are rejected
   */
  test('Property 9 (negative case): Expired session denies access', async () => {
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

    // Call the endpoint
    const response = await GET(request);

    // Verify response status is 401 Unauthorized
    expect(response.status).toBe(401);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('UNAUTHORIZED');

    // Cleanup
    await db.delete(sessions).where(eq(sessions.token, sessionToken));
    mockSessionToken = null;
  });
});
