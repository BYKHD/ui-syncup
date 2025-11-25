/**
 * Integration tests for POST /api/auth/reset-password
 * 
 * Tests the password reset completion endpoint to ensure it correctly
 * verifies tokens, updates passwords, and invalidates sessions.
 * 
 * @module api/auth/reset-password/__tests__/route
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { db } from '@/lib/db';
import { users, sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/server/auth/password';
import { generateToken } from '@/server/auth/tokens';
import { createSession } from '@/server/auth/session';

/**
 * Test user data
 */
let testUserId: string;
let testUserEmail: string;

/**
 * Setup: Create a test user before each test
 */
beforeEach(async () => {
  testUserEmail = `test-${Date.now()}-${Math.random()}@example.com`;
  
  const [user] = await db
    .insert(users)
    .values({
      email: testUserEmail,
      emailVerified: true,
      passwordHash: await hashPassword('OldPassword123!'),
      name: 'Test User',
    })
    .returning({ id: users.id });
  
  testUserId = user.id;
});

/**
 * Cleanup: Delete test user and related data after each test
 */
afterEach(async () => {
  await db.delete(sessions).where(eq(sessions.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('POST /api/auth/reset-password', () => {
  test('should reset password with valid token', async () => {
    // Generate password reset token
    const { token } = await generateToken(testUserId, 'password_reset', 60 * 60 * 1000);

    // Create request
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    // Call endpoint
    const response = await POST(request as any);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.message).toBe('Password reset successfully. You can now sign in with your new password.');

    // Verify password was updated in database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, testUserId))
    .limit(1);

  expect(user.passwordHash).not.toBe('dummy-hash');
  expect(typeof user.passwordHash).toBe('string');
  
  // Verify we can verify the new password
  const { verifyPassword } = await import('@/server/auth/password');
  const isValid = await verifyPassword('NewPassword123!', user.passwordHash as string);
  expect(isValid).toBe(true);
});

  test('should invalidate all sessions after password reset', async () => {
    // Create multiple sessions
    await createSession(testUserId, '192.168.1.1', 'Device 1');
    await createSession(testUserId, '192.168.1.2', 'Device 2');
    await createSession(testUserId, '192.168.1.3', 'Device 3');

    // Verify sessions exist
    const sessionsBefore = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, testUserId));
    expect(sessionsBefore.length).toBe(3);

    // Generate password reset token
    const { token } = await generateToken(testUserId, 'password_reset', 60 * 60 * 1000);

    // Reset password
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);

    // Verify all sessions are invalidated
    const sessionsAfter = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, testUserId));
    expect(sessionsAfter.length).toBe(0);
  });

  test('should reject invalid token', async () => {
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'invalid-token',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error.code).toBe('INVALID_TOKEN');
    expect(data.error.message).toBe('Invalid or expired password reset token');
  });

  test('should reject expired token', async () => {
    // Generate token with 1ms expiration
    const { token } = await generateToken(testUserId, 'password_reset', 1);

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error.code).toBe('INVALID_TOKEN');
  });

  test('should reject already used token', async () => {
    // Generate token
    const { token, tokenId } = await generateToken(testUserId, 'password_reset', 60 * 60 * 1000);

    // Use token once
    const request1 = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    const response1 = await POST(request1 as any);
    expect(response1.status).toBe(200);

    // Try to use token again
    const request2 = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!',
      }),
    });

    const response2 = await POST(request2 as any);
    const data2 = await response2.json();

    expect(response2.status).toBe(410);
    expect(data2.error.code).toBe('INVALID_TOKEN');
  });

  test('should reject password that does not meet requirements', async () => {
    const { token } = await generateToken(testUserId, 'password_reset', 60 * 60 * 1000);

    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'weak',
        confirmPassword: 'weak',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject mismatched passwords', async () => {
    const { token } = await generateToken(testUserId, 'password_reset', 60 * 60 * 1000);

    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('Passwords do not match');
  });

  test('should reject missing token', async () => {
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
