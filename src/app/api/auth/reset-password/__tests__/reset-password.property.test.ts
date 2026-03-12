/**
 * Property-based tests for POST /api/auth/reset-password endpoint
 * 
 * Tests password reset functionality and session invalidation
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { users, sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/server/auth/session';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { generateToken } from '@/server/auth/tokens';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 30,
  verbose: false,
};

const PROPERTY_TIMEOUT = 60000;

const userAgentArb = fc
  .string({ minLength: 10, maxLength: 200 })
  .filter((s) => s.trim().length > 0 && !s.includes("\\"));

const ensurePasswordHash = (hash: string | null) => {
  expect(typeof hash).toBe('string');
  return hash as string;
};

// Test user data
let testUserId: string;
let testUserEmail: string;
let testUserPasswordHash: string;

/**
 * Create a fresh test user for each test to align with the global DB reset.
 */
async function createTestUser() {
  testUserPasswordHash = await hashPassword('OldPassword123!');
  const [user] = await db
    .insert(users)
    .values({
      email: `test-reset-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      passwordHash: testUserPasswordHash,
      name: 'Test Reset User',
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

  // Delete all sessions for test user
  await db.delete(sessions).where(eq(sessions.userId, testUserId));
});

/**
 * Helper function to create a mock NextRequest
 */
function createMockRequest(body: unknown): NextRequest {
  const url = 'http://localhost:3000/api/auth/reset-password';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  return request;
}

/**
 * Generator for valid passwords that meet security requirements
 */
const validPasswordArb = fc
  .string({ minLength: 8, maxLength: 50 })
  .filter(s => {
    // Must contain uppercase, lowercase, number, and special character
    return (
      /[A-Z]/.test(s) &&
      /[a-z]/.test(s) &&
      /[0-9]/.test(s) &&
      /[^A-Za-z0-9]/.test(s)
    );
  })
  .map(s => {
    // Ensure it meets all requirements by adding required characters if needed
    let password = s;
    if (!/[A-Z]/.test(password)) password = 'A' + password;
    if (!/[a-z]/.test(password)) password = 'a' + password;
    if (!/[0-9]/.test(password)) password = '1' + password;
    if (!/[^A-Za-z0-9]/.test(password)) password = '!' + password;
    return password;
  });

describe('POST /api/auth/reset-password - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 17: Password reset invalidates all sessions
   * Validates: Requirements 6.2
   * 
   * For any user who resets their password, all existing sessions should be invalidated.
   */
  test('Property 17: Password reset invalidates all sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of sessions (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate valid new password
        validPasswordArb,
        // Generate random IP addresses and user agents for sessions
        fc.array(
          fc.record({
            ipAddress: fc.ipV4(),
            userAgent: userAgentArb,
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (numSessions, newPassword, sessionData) => {
          // Generate password reset token
          const { token } = await generateToken(
            testUserId,
            'password_reset',
            60 * 60 * 1000 // 1 hour
          );

          // Create multiple active sessions for the user
          const sessionTokens: string[] = [];
          for (let i = 0; i < numSessions; i++) {
            const data = sessionData[i % sessionData.length];
            const sessionToken = await createSession(
              testUserId,
              data.ipAddress,
              data.userAgent
            );
            sessionTokens.push(sessionToken);
          }

          // Verify all sessions exist before password reset
          const sessionsBefore = await db
            .select()
            .from(sessions)
            .where(eq(sessions.userId, testUserId));

          expect(sessionsBefore.length).toBe(numSessions);

          // Create request body
          const requestBody = {
            token,
            password: newPassword,
            confirmPassword: newPassword,
          };

          // Create mock request
          const request = createMockRequest(requestBody);

          // Call the reset password endpoint
          const response = await POST(request);

          // Verify response status is 200 OK
          expect(response.status).toBe(200);

          // Parse response body
          const body = await response.json();

          // Verify success message
          expect(body.message).toBe('Password reset successfully. You can now sign in with your new password.');

          // Verify all sessions are deleted from database
          const sessionsAfter = await db
            .select()
            .from(sessions)
            .where(eq(sessions.userId, testUserId));

          expect(sessionsAfter.length).toBe(0);

          // Verify each session token no longer exists
          for (const sessionToken of sessionTokens) {
            const [session] = await db
              .select()
              .from(sessions)
              .where(eq(sessions.token, sessionToken))
              .limit(1);

            expect(session).toBeUndefined();
          }

          // Verify password was actually changed
          const [updatedUser] = await db
            .select()
            .from(users)
          .where(eq(users.id, testUserId))
          .limit(1);

        expect(updatedUser).toBeDefined();
        const updatedHash = ensurePasswordHash(updatedUser.passwordHash);
        expect(updatedHash).not.toBe(testUserPasswordHash);

        // Verify new password works
        const isNewPasswordValid = await verifyPassword(newPassword, updatedHash);
        expect(isNewPasswordValid).toBe(true);

        // Verify old password no longer works
        const isOldPasswordValid = await verifyPassword('OldPassword123!', updatedHash);
        expect(isOldPasswordValid).toBe(false);
      }
    ),
    PROPERTY_CONFIG
  );
  }, { timeout: PROPERTY_TIMEOUT });

  /**
   * Additional test: Verify password reset with valid token updates password
   */
  test('Property 17 (positive case): Valid token updates password', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        async (newPassword) => {
          // Generate password reset token
          const { token } = await generateToken(
            testUserId,
            'password_reset',
            60 * 60 * 1000 // 1 hour
          );

          // Create request body
          const requestBody = {
            token,
            password: newPassword,
            confirmPassword: newPassword,
          };

          // Create mock request
          const request = createMockRequest(requestBody);

          // Call the reset password endpoint
          const response = await POST(request);

          // Verify response status is 200 OK
          expect(response.status).toBe(200);

          // Verify password was changed
        const [updatedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, testUserId))
          .limit(1);

        const updatedHash = ensurePasswordHash(updatedUser.passwordHash);
        const isNewPasswordValid = await verifyPassword(newPassword, updatedHash);
        expect(isNewPasswordValid).toBe(true);
      }
    ),
    PROPERTY_CONFIG
  );
  }, { timeout: PROPERTY_TIMEOUT });

  /**
   * Additional test: Verify password reset with invalid token returns 400
   */
  test('Property 17 (negative case): Invalid token returns 410', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random invalid tokens
        fc.string({ minLength: 10, maxLength: 100 }),
        validPasswordArb,
        async (invalidToken, newPassword) => {
          // Create request body with invalid token
          const requestBody = {
            token: invalidToken,
            password: newPassword,
            confirmPassword: newPassword,
          };

          // Create mock request
          const request = createMockRequest(requestBody);

          // Call the reset password endpoint
          const response = await POST(request);

          // Verify response status is 410 Gone for invalid tokens
          expect(response.status).toBe(410);

          // Parse response body
          const body = await response.json();

          // Verify error response
          expect(body.error).toBeDefined();
          expect(body.error.code).toBe('INVALID_TOKEN');
          expect(body.error.message).toBe('Invalid or expired password reset token');

          // Verify password was NOT changed
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, testUserId))
            .limit(1);

          expect(user.passwordHash).toBe(testUserPasswordHash);
        }
      ),
      PROPERTY_CONFIG
    );
  }, { timeout: PROPERTY_TIMEOUT });

  /**
   * Additional test: Verify password reset with expired token returns 400
   */
  test('Property 17 (negative case): Expired token returns 410', async () => {
    // Use a single test case instead of property-based for timing-sensitive test
    // Generate password reset token with very short expiration
    const { token } = await generateToken(
      testUserId,
      'password_reset',
      1 // 1 millisecond
    );

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create request body
    const requestBody = {
      token,
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    // Create mock request
    const request = createMockRequest(requestBody);

    // Call the reset password endpoint
    const response = await POST(request);

    // Verify response status is 410 Gone
    expect(response.status).toBe(410);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('INVALID_TOKEN');

    // Verify password was NOT changed
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.passwordHash).toBe(testUserPasswordHash);
  });

  /**
   * Additional test: Verify password reset with mismatched passwords returns 400
   */
  test('Property 17 (negative case): Mismatched passwords return 400', async () => {
    // Use specific test cases instead of property-based for this validation test
    const testCases = [
      ['ValidPass123!', 'DifferentPass456!'],
      ['MyPassword1!', 'YourPassword2@'],
      ['Test123!@#', 'Best456$%^'],
    ];

    for (const [password1, password2] of testCases) {
      // Get current password hash before test
      const [userBefore] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);
      
      const passwordHashBefore = ensurePasswordHash(userBefore.passwordHash);

      // Generate password reset token
      const { token } = await generateToken(
        testUserId,
        'password_reset',
        60 * 60 * 1000
      );

      // Create request body with mismatched passwords
      const requestBody = {
        token,
        password: password1,
        confirmPassword: password2,
      };

      // Create mock request
      const request = createMockRequest(requestBody);

      // Call the reset password endpoint
      const response = await POST(request);

      // Verify response status is 400 Bad Request
      expect(response.status).toBe(400);

      // Parse response body
      const body = await response.json();

      // Verify error response
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');

      // Verify password was NOT changed
      const [userAfter] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(userAfter.passwordHash).toBe(passwordHashBefore);
    }
  });

  /**
   * Additional test: Verify password reset with weak password returns 400
   */
  test('Property 17 (negative case): Weak password returns 400', async () => {
    // Test specific weak password cases
    const weakPasswords = [
      'short', // Too short
      'alllowercase123!', // No uppercase
      'ALLUPPERCASE123!', // No lowercase
      'NoNumbers!', // No number
      'NoSpecialChar123', // No special char
    ];

    for (const weakPassword of weakPasswords) {
      // Get current password hash before test
      const [userBefore] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);
      
      const passwordHashBefore = ensurePasswordHash(userBefore.passwordHash);

      // Generate password reset token
      const { token } = await generateToken(
        testUserId,
        'password_reset',
        60 * 60 * 1000
      );

      // Create request body with weak password
      const requestBody = {
        token,
        password: weakPassword,
        confirmPassword: weakPassword,
      };

      // Create mock request
      const request = createMockRequest(requestBody);

      // Call the reset password endpoint
      const response = await POST(request);

      // Verify response status is 400 Bad Request
      expect(response.status).toBe(400);

      // Parse response body
      const body = await response.json();

      // Verify error response
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');

      // Verify password was NOT changed
      const [userAfter] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(userAfter.passwordHash).toBe(passwordHashBefore);
    }
  });
});
