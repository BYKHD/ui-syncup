/**
 * E2E Test Fixtures and Database Helpers
 * 
 * Utilities for setting up test data and managing test database state
 */

import { db } from '@/lib/db';
import { users, sessions, verificationTokens, account } from '@/server/db/schema';
import { hashPassword } from '@/server/auth/password';
import { generateToken } from '@/server/auth/tokens';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Test user fixture data
 */
export interface TestUserFixture {
  id: string;
  email: string;
  password: string;
  name: string;
  emailVerified: boolean;
}

/**
 * Create a verified test user in the database
 * This is useful for tests that need to start with an authenticated user
 */
export async function createVerifiedTestUser(
  email?: string,
  password?: string,
  name?: string
): Promise<TestUserFixture> {
  const uuid = randomUUID().slice(0, 8);
  const userData = {
    email: email || `test-${uuid}@example.com`,
    password: password || 'Test123!@#',
    name: name || `Test User ${uuid}`,
  };
  
  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user in database
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      emailVerified: true, // Pre-verified for testing
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  // Create credential account record so email/password login works
  await db.insert(account).values({
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: passwordHash,
  });

  return {
    id: user.id,
    email: user.email,
    password: userData.password,
    name: user.name,
    emailVerified: true,
  };
}

/**
 * Create an unverified test user in the database
 */
export async function createUnverifiedTestUser(
  email?: string,
  password?: string,
  name?: string
): Promise<TestUserFixture> {
  const uuid = randomUUID().slice(0, 8);
  const userData = {
    email: email || `test-${uuid}@example.com`,
    password: password || 'Test123!@#',
    name: name || `Test User ${uuid}`,
  };
  
  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user in database
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      emailVerified: false,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  // Create credential account record so email/password login works
  await db.insert(account).values({
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: passwordHash,
  });

  return {
    id: user.id,
    email: user.email,
    password: userData.password,
    name: user.name,
    emailVerified: false,
  };
}

/**
 * Create a verification token for a user
 */
export async function createVerificationToken(
  userId: string
): Promise<{ token: string; tokenId: string }> {
  return await generateToken(userId, 'email_verification', 24 * 60 * 60 * 1000);
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  userId: string
): Promise<{ token: string; tokenId: string }> {
  return await generateToken(userId, 'password_reset', 60 * 60 * 1000);
}

/**
 * Create a session for a user
 */
export async function createTestSession(
  userId: string,
  ipAddress: string = '127.0.0.1',
  userAgent: string = 'Test User Agent'
): Promise<string> {
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await db.insert(sessions).values({
    userId,
    token: sessionToken,
    expiresAt,
    ipAddress,
    userAgent,
  });
  
  return sessionToken;
}

/**
 * Delete a test user and all related data
 */
export async function deleteTestUser(userId: string): Promise<void> {
  // Cascade delete will handle sessions, tokens, and roles
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Delete a test user by email
 */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  await db.delete(users).where(eq(users.email, email));
}

/**
 * Clean up all test users (emails starting with 'test-')
 */
export async function cleanupTestUsers(): Promise<void> {
  // This is a dangerous operation - only use in test environments
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('cleanupTestUsers can only be run in test or development environments');
  }
  
  // Delete all users with test email pattern
  await db.execute(`
    DELETE FROM users 
    WHERE email LIKE 'test-%@example.com'
  `);
}

/**
 * Get user by email
 */
export async function getTestUserByEmail(email: string): Promise<TestUserFixture | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = result[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password: '', // Password not stored in plain text
    name: user.name,
    emailVerified: user.emailVerified ?? false,
  };
}

/**
 * Verify a test user's email
 */
export async function verifyTestUserEmail(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, userId));
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<any[]> {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Get verification token for a user
 */
export async function getVerificationToken(userId: string): Promise<any | null> {
  const [token] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.userId, userId))
    .limit(1);
  
  return token ?? null;
}

/**
 * Create a test user with session (fully authenticated)
 */
export async function createAuthenticatedTestUser(): Promise<{
  user: TestUserFixture;
  sessionToken: string;
}> {
  const user = await createVerifiedTestUser();
  const sessionToken = await createTestSession(user.id);
  
  return {
    user,
    sessionToken,
  };
}

/**
 * Setup test database state before tests
 */
export async function setupTestDatabase(): Promise<void> {
  // Clean up any existing test data
  await cleanupTestUsers();
}

/**
 * Teardown test database state after tests
 */
export async function teardownTestDatabase(): Promise<void> {
  // Clean up test data
  await cleanupTestUsers();
}
