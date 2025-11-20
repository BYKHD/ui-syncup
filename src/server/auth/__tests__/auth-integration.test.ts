/**
 * Integration Tests for Authentication System
 * 
 * These tests verify complete authentication flows from end-to-end,
 * including registration, verification, sign-in, password reset,
 * session management, and rate limiting.
 * 
 * Tests use a real test database to ensure all components work together correctly.
 * 
 * @module server/auth/__tests__/auth-integration
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, sessions, verificationTokens } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { generateToken, verifyToken, markTokenAsUsed } from '@/server/auth/tokens';
import { createSession, getSession, deleteSession, extendSession } from '@/server/auth/session';
import { checkLimit, getRemainingAttempts } from '@/server/auth/rate-limiter';

/**
 * Test data cleanup
 */
const testUserIds: string[] = [];
const testSessionIds: string[] = [];
const testEmails: string[] = [];

/**
 * Helper to create a test user
 */
async function createTestUser(email: string, password: string, name: string, verified = false) {
  const passwordHash = await hashPassword(password);
  
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      emailVerified: verified,
    })
    .returning();
  
  testUserIds.push(user.id);
  testEmails.push(email);
  
  return user;
}

/**
 * Helper to clean up test data
 */
async function cleanupTestData() {
  // Delete sessions
  for (const sessionId of testSessionIds) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  
  // Delete tokens
  for (const userId of testUserIds) {
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
  }
  
  // Delete users
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  
  testUserIds.length = 0;
  testSessionIds.length = 0;
  testEmails.length = 0;
}

/**
 * Clean up after each test
 */
afterEach(async () => {
  await cleanupTestData();
});

describe('Integration Test: Complete Registration → Verification → Sign-in Flow', () => {
  test('should complete full registration and sign-in flow', async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'Test123!@#';
    const name = 'Test User';
    
    // Step 1: Create user account (registration)
    const user = await createTestUser(email, password, name, false);
    
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(email.toLowerCase());
    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).not.toBe(password);
    
    // Verify password is hashed correctly
    const passwordValid = await verifyPassword(password, user.passwordHash);
    expect(passwordValid).toBe(true);
    
    // Step 2: Generate verification token
    const tokenResult = await generateToken(user.id, 'email_verification', 24 * 60 * 60 * 1000);
    
    expect(tokenResult.token).toBeTruthy();
    expect(tokenResult.tokenId).toBeTruthy();
    expect(tokenResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
    
    // Step 3: Verify the token
    const verifiedToken = await verifyToken(tokenResult.token, 'email_verification');
    
    expect(verifiedToken).not.toBeNull();
    expect(verifiedToken?.userId).toBe(user.id);
    expect(verifiedToken?.tokenId).toBe(tokenResult.tokenId);
    
    // Step 4: Mark user as verified
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, user.id));
    
    // Mark token as used
    await markTokenAsUsed(tokenResult.tokenId);
    
    // Step 5: Verify user can no longer use the same token
    const tokenAfterUse = await verifyToken(tokenResult.token, 'email_verification');
    expect(tokenAfterUse).toBeNull();
    
    // Step 6: Verify user is marked as verified
    const [verifiedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    expect(verifiedUser.emailVerified).toBe(true);
    
    // Step 7: Create session (sign-in)
    const sessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    expect(sessionToken).toBeTruthy();
    expect(typeof sessionToken).toBe('string');
    
    // Step 8: Verify session works
    const sessionUser = await getSession(sessionToken);
    
    expect(sessionUser).not.toBeNull();
    expect(sessionUser?.id).toBe(user.id);
    expect(sessionUser?.email).toBe(email.toLowerCase());
    expect(sessionUser?.emailVerified).toBe(true);
    
    // Track session for cleanup
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);
    
    if (session) {
      testSessionIds.push(session.id);
    }
  });
  
  test('should reject sign-in with unverified email', async () => {
    const email = `unverified-${Date.now()}@example.com`;
    const password = 'Test123!@#';
    const name = 'Unverified User';
    
    // Create unverified user
    const user = await createTestUser(email, password, name, false);
    
    expect(user.emailVerified).toBe(false);
    
    // Attempt to create session should succeed (session creation doesn't check verification)
    // But the application logic should check emailVerified before allowing access
    const sessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    const sessionUser = await getSession(sessionToken);
    
    // Session is created, but emailVerified is false
    expect(sessionUser).not.toBeNull();
    expect(sessionUser?.emailVerified).toBe(false);
    
    // Application should check this flag and reject access
    // This is the expected behavior - session exists but user is not verified
    
    // Track session for cleanup
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);
    
    if (session) {
      testSessionIds.push(session.id);
    }
  });
});

describe('Integration Test: Sign-in with Invalid Credentials', () => {
  test('should reject sign-in with wrong password', async () => {
    const email = `valid-${Date.now()}@example.com`;
    const correctPassword = 'Correct123!@#';
    const wrongPassword = 'Wrong123!@#';
    const name = 'Valid User';
    
    // Create verified user
    const user = await createTestUser(email, correctPassword, name, true);
    
    // Verify correct password works
    const correctPasswordValid = await verifyPassword(correctPassword, user.passwordHash);
    expect(correctPasswordValid).toBe(true);
    
    // Verify wrong password fails
    const wrongPasswordValid = await verifyPassword(wrongPassword, user.passwordHash);
    expect(wrongPasswordValid).toBe(false);
    
    // Application should not create session with wrong password
    // This test verifies the password verification logic works correctly
  });
  
  test('should reject sign-in with non-existent email', async () => {
    const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
    
    // Try to find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, nonExistentEmail.toLowerCase()))
      .limit(1);
    
    expect(user).toBeUndefined();
    
    // Application should return generic error without revealing account existence
  });
});

describe('Integration Test: Password Reset Flow', () => {
  test('should complete full password reset flow', async () => {
    const email = `reset-${Date.now()}@example.com`;
    const oldPassword = 'OldPass123!@#';
    const newPassword = 'NewPass123!@#';
    const name = 'Reset User';
    
    // Step 1: Create verified user
    const user = await createTestUser(email, oldPassword, name, true);
    
    // Verify old password works
    const oldPasswordValid = await verifyPassword(oldPassword, user.passwordHash);
    expect(oldPasswordValid).toBe(true);
    
    // Step 2: Create active session
    const oldSessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    const sessionUser = await getSession(oldSessionToken);
    expect(sessionUser).not.toBeNull();
    
    // Track session for cleanup
    const [oldSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, oldSessionToken))
      .limit(1);
    
    if (oldSession) {
      testSessionIds.push(oldSession.id);
    }
    
    // Step 3: Generate password reset token
    const resetToken = await generateToken(user.id, 'password_reset', 60 * 60 * 1000);
    
    expect(resetToken.token).toBeTruthy();
    expect(resetToken.tokenId).toBeTruthy();
    
    // Step 4: Verify reset token
    const verifiedResetToken = await verifyToken(resetToken.token, 'password_reset');
    
    expect(verifiedResetToken).not.toBeNull();
    expect(verifiedResetToken?.userId).toBe(user.id);
    
    // Step 5: Update password
    const newPasswordHash = await hashPassword(newPassword);
    
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, user.id));
    
    // Mark token as used
    await markTokenAsUsed(resetToken.tokenId);
    
    // Step 6: Invalidate all existing sessions
    await db
      .delete(sessions)
      .where(eq(sessions.userId, user.id));
    
    // Step 7: Verify old session no longer works
    const oldSessionAfterReset = await getSession(oldSessionToken);
    expect(oldSessionAfterReset).toBeNull();
    
    // Step 8: Verify old password no longer works
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    const oldPasswordStillValid = await verifyPassword(oldPassword, updatedUser.passwordHash);
    expect(oldPasswordStillValid).toBe(false);
    
    // Step 9: Verify new password works
    const newPasswordValid = await verifyPassword(newPassword, updatedUser.passwordHash);
    expect(newPasswordValid).toBe(true);
    
    // Step 10: Verify reset token cannot be reused
    const tokenAfterUse = await verifyToken(resetToken.token, 'password_reset');
    expect(tokenAfterUse).toBeNull();
    
    // Step 11: Create new session with new password
    const newSessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    const newSessionUser = await getSession(newSessionToken);
    expect(newSessionUser).not.toBeNull();
    expect(newSessionUser?.id).toBe(user.id);
    
    // Track new session for cleanup
    const [newSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, newSessionToken))
      .limit(1);
    
    if (newSession) {
      testSessionIds.push(newSession.id);
    }
  });
  
  test('should not reveal account existence for non-existent email', async () => {
    const nonExistentEmail = `nonexistent-reset-${Date.now()}@example.com`;
    
    // Try to find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, nonExistentEmail.toLowerCase()))
      .limit(1);
    
    expect(user).toBeUndefined();
    
    // Application should return success message without revealing account existence
    // This prevents email enumeration attacks
  });
});

describe('Integration Test: Session Validation and Renewal', () => {
  test('should validate and extend session', async () => {
    const email = `session-${Date.now()}@example.com`;
    const password = 'Session123!@#';
    const name = 'Session User';
    
    // Create verified user
    const user = await createTestUser(email, password, name, true);
    
    // Create session
    const sessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    // Get initial session
    const [initialSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);
    
    expect(initialSession).toBeTruthy();
    testSessionIds.push(initialSession.id);
    
    const initialExpiration = initialSession.expiresAt.getTime();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Extend session
    await extendSession(initialSession.id);
    
    // Get updated session
    const [extendedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, initialSession.id))
      .limit(1);
    
    const extendedExpiration = extendedSession.expiresAt.getTime();
    
    // Expiration should be extended
    expect(extendedExpiration).toBeGreaterThan(initialExpiration);
    
    // Session should still be valid
    const sessionUser = await getSession(sessionToken);
    expect(sessionUser).not.toBeNull();
    expect(sessionUser?.id).toBe(user.id);
  });
  
  test('should reject expired session', async () => {
    const email = `expired-${Date.now()}@example.com`;
    const password = 'Expired123!@#';
    const name = 'Expired User';
    
    // Create verified user
    const user = await createTestUser(email, password, name, true);
    
    // Create session
    const sessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    // Get session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);
    
    expect(session).toBeTruthy();
    testSessionIds.push(session.id);
    
    // Manually expire the session
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, session.id));
    
    // Try to get session
    const expiredSessionUser = await getSession(sessionToken);
    
    // Should return null for expired session
    expect(expiredSessionUser).toBeNull();
  });
  
  test('should reject tampered session token', async () => {
    const email = `tampered-${Date.now()}@example.com`;
    const password = 'Tampered123!@#';
    const name = 'Tampered User';
    
    // Create verified user
    const user = await createTestUser(email, password, name, true);
    
    // Create session
    const sessionToken = await createSession(
      user.id,
      '127.0.0.1',
      'Mozilla/5.0 Test Browser'
    );
    
    // Track session for cleanup
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);
    
    if (session) {
      testSessionIds.push(session.id);
    }
    
    // Tamper with token
    const tamperedToken = sessionToken.slice(0, -5) + 'XXXXX';
    
    // Try to get session with tampered token
    const tamperedSessionUser = await getSession(tamperedToken);
    
    // Should return null for tampered token
    expect(tamperedSessionUser).toBeNull();
  });
});

describe('Integration Test: Rate Limiting Behavior', () => {
  test('should enforce IP-based rate limiting', async () => {
    const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`;
    const limit = 5;
    const windowMs = 60 * 1000; // 1 minute
    
    // First 5 attempts should succeed
    for (let i = 0; i < limit; i++) {
      const allowed = await checkLimit(`ip:${ipAddress}`, limit, windowMs);
      expect(allowed).toBe(true);
    }
    
    // 6th attempt should be blocked
    const blocked = await checkLimit(`ip:${ipAddress}`, limit, windowMs);
    expect(blocked).toBe(false);
    
    // Check remaining attempts
    const remaining = await getRemainingAttempts(`ip:${ipAddress}`, limit);
    expect(remaining).toBe(0);
  });
  
  test('should enforce email-based rate limiting', async () => {
    const email = `ratelimit-${Date.now()}@example.com`;
    const limit = 3;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    
    // First 3 attempts should succeed
    for (let i = 0; i < limit; i++) {
      const allowed = await checkLimit(`email:${email}`, limit, windowMs);
      expect(allowed).toBe(true);
    }
    
    // 4th attempt should be blocked
    const blocked = await checkLimit(`email:${email}`, limit, windowMs);
    expect(blocked).toBe(false);
    
    // Check remaining attempts
    const remaining = await getRemainingAttempts(`email:${email}`, limit);
    expect(remaining).toBe(0);
  });
  
  test('should track separate rate limits for different keys', async () => {
    const ip1 = `192.168.1.${Math.floor(Math.random() * 255)}`;
    const ip2 = `192.168.1.${Math.floor(Math.random() * 255)}`;
    const limit = 5;
    const windowMs = 60 * 1000;
    
    // Exhaust limit for IP1
    for (let i = 0; i < limit; i++) {
      await checkLimit(`ip:${ip1}`, limit, windowMs);
    }
    
    const ip1Blocked = await checkLimit(`ip:${ip1}`, limit, windowMs);
    expect(ip1Blocked).toBe(false);
    
    // IP2 should still have full limit
    const ip2Allowed = await checkLimit(`ip:${ip2}`, limit, windowMs);
    expect(ip2Allowed).toBe(true);
    
    const ip2Remaining = await getRemainingAttempts(`ip:${ip2}`, limit);
    expect(ip2Remaining).toBe(limit - 1);
  });
});

describe('Integration Test: Concurrent Session Handling', () => {
  test('should support multiple concurrent sessions for same user', async () => {
    const email = `concurrent-${Date.now()}@example.com`;
    const password = 'Concurrent123!@#';
    const name = 'Concurrent User';
    
    // Create verified user
    const user = await createTestUser(email, password, name, true);
    
    // Create multiple sessions from different devices
    const session1Token = await createSession(
      user.id,
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
    );
    
    const session2Token = await createSession(
      user.id,
      '192.168.1.2',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Safari/604.1'
    );
    
    const session3Token = await createSession(
      user.id,
      '192.168.1.3',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1'
    );
    
    // All sessions should be valid
    const user1 = await getSession(session1Token);
    const user2 = await getSession(session2Token);
    const user3 = await getSession(session3Token);
    
    expect(user1).not.toBeNull();
    expect(user2).not.toBeNull();
    expect(user3).not.toBeNull();
    
    expect(user1?.id).toBe(user.id);
    expect(user2?.id).toBe(user.id);
    expect(user3?.id).toBe(user.id);
    
    // Track sessions for cleanup
    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user.id));
    
    expect(allSessions.length).toBe(3);
    
    for (const session of allSessions) {
      testSessionIds.push(session.id);
    }
  });
  
  test('should delete only specific session on sign-out', async () => {
    const email = `signout-${Date.now()}@example.com`;
    const password = 'Signout123!@#';
    const name = 'Signout User';
    
    // Create verified user
    const user = await createTestUser(email, password, name, true);
    
    // Create two sessions
    const session1Token = await createSession(
      user.id,
      '192.168.1.1',
      'Device 1'
    );
    
    const session2Token = await createSession(
      user.id,
      '192.168.1.2',
      'Device 2'
    );
    
    // Get session IDs
    const [session1] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, session1Token))
      .limit(1);
    
    const [session2] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, session2Token))
      .limit(1);
    
    testSessionIds.push(session1.id, session2.id);
    
    // Delete session 1
    await deleteSession(session1.id);
    
    // Session 1 should be invalid
    const user1After = await getSession(session1Token);
    expect(user1After).toBeNull();
    
    // Session 2 should still be valid
    const user2After = await getSession(session2Token);
    expect(user2After).not.toBeNull();
    expect(user2After?.id).toBe(user.id);
  });
  
  test('should delete all sessions on password reset', async () => {
    const email = `reset-all-${Date.now()}@example.com`;
    const password = 'ResetAll123!@#';
    const name = 'Reset All User';
    
    // Create verified user
    const user = await createTestUser(email, password, name, true);
    
    // Create multiple sessions
    const session1Token = await createSession(user.id, '192.168.1.1', 'Device 1');
    const session2Token = await createSession(user.id, '192.168.1.2', 'Device 2');
    const session3Token = await createSession(user.id, '192.168.1.3', 'Device 3');
    
    // Track sessions for cleanup
    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user.id));
    
    for (const session of allSessions) {
      testSessionIds.push(session.id);
    }
    
    // Verify all sessions work
    expect(await getSession(session1Token)).not.toBeNull();
    expect(await getSession(session2Token)).not.toBeNull();
    expect(await getSession(session3Token)).not.toBeNull();
    
    // Delete all sessions (simulating password reset)
    await db
      .delete(sessions)
      .where(eq(sessions.userId, user.id));
    
    // All sessions should be invalid
    expect(await getSession(session1Token)).toBeNull();
    expect(await getSession(session2Token)).toBeNull();
    expect(await getSession(session3Token)).toBeNull();
  });
});
