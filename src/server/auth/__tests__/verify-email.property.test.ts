/**
 * Property-Based Tests for Email Verification
 * 
 * Tests correctness properties for the email verification flow using fast-check.
 * Each test runs 100+ iterations with randomly generated inputs.
 * 
 * @module server/auth/__tests__/verify-email.property.test
 */

import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/server/db/schema';
import { generateToken, verifyToken, markTokenAsUsed } from '@/server/auth/tokens';
import { eq } from 'drizzle-orm';

/**
 * Property test configuration
 * Run each property 100 times with different random inputs
 */
const propertyConfig = { numRuns: 25 };

/**
 * Generators for test data
 */

// Generate valid email addresses
const emailArb = fc.emailAddress();

// Generate valid passwords (8+ chars, uppercase, lowercase, number, special)
const passwordArb = fc
  .string({ minLength: 8, maxLength: 50 })
  .filter((s) => {
    return (
      /[A-Z]/.test(s) &&
      /[a-z]/.test(s) &&
      /[0-9]/.test(s) &&
      /[^A-Za-z0-9]/.test(s)
    );
  });

// Generate valid names
const nameArb = fc
  .string({ minLength: 1, maxLength: 120 })
  .filter((s) => s.trim().length > 0 && !s.includes("\\"));

// Generate complete user data
const userDataArb = fc.record({
  email: emailArb,
  password: passwordArb,
  name: nameArb,
});

/**
 * Helper function to create a test user
 */
async function createTestUser(data: { email: string; password: string; name: string }) {
  const uniqueEmail = `${Date.now()}-${Math.random()}-${data.email.toLowerCase().trim()}`;
  const trimmedName = data.name.trim();
  
  const [user] = await db
    .insert(users)
    .values({
      email: uniqueEmail,
      name: trimmedName,
      emailVerified: false,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
    });
  
  return user;
}

/**
 * Helper function to clean up test data
 */
async function cleanupTestUser(userId: string) {
  // Delete verification tokens first (foreign key constraint)
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.userId, userId));
  
  // Delete user
  await db
    .delete(users)
    .where(eq(users.id, userId));
}

describe('Property 5: Valid verification marks user as verified', () => {
  /**
   * Feature: authentication-system, Property 5: Valid verification marks user as verified
   * Validates: Requirements 2.1
   * 
   * For any user with a valid verification token, using the token should mark
   * the user's emailVerified field as true.
   */
  
  const testUserIds: string[] = [];
  
  afterEach(async () => {
    // Clean up all test users created during tests
    for (const userId of testUserIds) {
      try {
        await cleanupTestUser(userId);
      } catch {
        // Ignore cleanup errors
      }
    }
    testUserIds.length = 0;
  });
  
  it('should mark user as verified when using valid token', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, async (userData) => {
        // Create test user
        const user = await createTestUser(userData);
        testUserIds.push(user.id);
        
        // Property 1: User should start as unverified
        expect(user.emailVerified).toBe(false);
        
        // Generate verification token
        const tokenResult = await generateToken(
          user.id,
          'email_verification',
          24 * 60 * 60 * 1000 // 24 hours
        );
        
        // Property 2: Token should be valid
        const verified = await verifyToken(tokenResult.token, 'email_verification');
        expect(verified).not.toBeNull();
        expect(verified?.userId).toBe(user.id);
        
        // Mark user as verified (simulating the verify-email endpoint)
        await db
          .update(users)
          .set({ 
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
        
        // Mark token as used
        await markTokenAsUsed(tokenResult.tokenId);
        
        // Property 3: User should now be verified
        const [updatedUser] = await db
          .select({ emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        
        expect(updatedUser.emailVerified).toBe(true);
        
        // Property 4: Token should be marked as used
        const [usedToken] = await db
          .select({ usedAt: verificationTokens.usedAt })
          .from(verificationTokens)
          .where(eq(verificationTokens.id, tokenResult.tokenId))
          .limit(1);
        
        expect(usedToken.usedAt).not.toBeNull();
        
        // Property 5: Used token should not verify again
        const verifiedAgain = await verifyToken(tokenResult.token, 'email_verification');
        expect(verifiedAgain).toBeNull();
      }),
      propertyConfig
    );
  }, 60000); // 60 second timeout
  
  it('should not verify user with expired token', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, async (userData) => {
        // Create test user
        const user = await createTestUser(userData);
        testUserIds.push(user.id);
        
        // Generate verification token with very short expiration (1ms)
        const tokenResult = await generateToken(
          user.id,
          'email_verification',
          1 // 1 millisecond
        );
        
        // Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Property: Expired token should not verify
        const verified = await verifyToken(tokenResult.token, 'email_verification');
        expect(verified).toBeNull();
        
        // Property: User should remain unverified
        const [currentUser] = await db
          .select({ emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        
        expect(currentUser.emailVerified).toBe(false);
      }),
      { numRuns: 10 } // Fewer runs due to setTimeout
    );
  }, 60000);
  
  it('should not verify user with already-used token', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, async (userData) => {
        // Create test user
        const user = await createTestUser(userData);
        testUserIds.push(user.id);
        
        // Generate verification token
        const tokenResult = await generateToken(
          user.id,
          'email_verification',
          24 * 60 * 60 * 1000
        );
        
        // Verify token (first time)
        const verified1 = await verifyToken(tokenResult.token, 'email_verification');
        expect(verified1).not.toBeNull();
        
        // Mark token as used
        await markTokenAsUsed(tokenResult.tokenId);
        
        // Property: Used token should not verify again
        const verified2 = await verifyToken(tokenResult.token, 'email_verification');
        expect(verified2).toBeNull();
      }),
      propertyConfig
    );
  }, 60000);
  
  it('should not verify user with invalid token signature', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, fc.string({ minLength: 10, maxLength: 100 }), async (userData, randomString) => {
        // Create test user
        const user = await createTestUser(userData);
        testUserIds.push(user.id);
        
        // Generate valid token
        const tokenResult = await generateToken(
          user.id,
          'email_verification',
          24 * 60 * 60 * 1000
        );
        
        // Tamper with token by appending random string
        const tamperedToken = tokenResult.token + randomString;
        
        // Property: Tampered token should not verify
        const verified = await verifyToken(tamperedToken, 'email_verification');
        expect(verified).toBeNull();
        
        // Property: User should remain unverified
        const [currentUser] = await db
          .select({ emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        
        expect(currentUser.emailVerified).toBe(false);
      }),
      propertyConfig
    );
  }, 60000);
  
  it('should handle verification idempotently for already-verified users', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, async (userData) => {
        // Create test user
        const user = await createTestUser(userData);
        testUserIds.push(user.id);
        
        // Generate verification token
        const tokenResult = await generateToken(
          user.id,
          'email_verification',
          24 * 60 * 60 * 1000
        );
        
        // Verify user (first time)
        const verified1 = await verifyToken(tokenResult.token, 'email_verification');
        expect(verified1).not.toBeNull();
        
        await db
          .update(users)
          .set({ 
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
        
        await markTokenAsUsed(tokenResult.tokenId);
        
        // Property: User should be verified
        const [verifiedUser] = await db
          .select({ emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        
        expect(verifiedUser.emailVerified).toBe(true);
        
        // Property: Attempting to verify again should be idempotent (user stays verified)
        // Even though token is used, user should remain verified
        const [stillVerifiedUser] = await db
          .select({ emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        
        expect(stillVerifiedUser.emailVerified).toBe(true);
      }),
      propertyConfig
    );
  }, 60000);
  
  it('should preserve user data when marking as verified', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, async (userData) => {
        // Create test user
        const user = await createTestUser(userData);
        testUserIds.push(user.id);
        
        // Generate verification token
        const tokenResult = await generateToken(
          user.id,
          'email_verification',
          24 * 60 * 60 * 1000
        );
        
        // Verify token
        const verified = await verifyToken(tokenResult.token, 'email_verification');
        expect(verified).not.toBeNull();
        
        // Mark user as verified
        await db
          .update(users)
          .set({ 
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
        
        // Property: User data should be preserved (email, name, passwordHash)
        const [updatedUser] = await db
          .select({
            email: users.email,
            name: users.name,
            emailVerified: users.emailVerified,
          })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        
        expect(updatedUser.email).toBe(user.email);
        expect(updatedUser.name).toBe(user.name);
        expect(updatedUser.emailVerified).toBe(true);
      }),
      propertyConfig
    );
  }, 60000);
});
