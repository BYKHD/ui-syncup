/**
 * Property-based tests for token generation and verification
 * 
 * These tests use fast-check to verify correctness properties across
 * randomly generated inputs, ensuring the token implementation is
 * secure and correct for all valid inputs.
 * 
 * @module server/auth/__tests__/tokens
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  generateToken,
  verifyToken,
  markTokenAsUsed,
  invalidateUserTokens,
  type TokenType,
} from '../tokens';
import { db } from '@/lib/db';
import { verificationTokens, users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Property test configuration
 * Run each property 100+ times with different random inputs
 */
const PROPERTY_CONFIG = {
  numRuns: 100,
  timeout: 30000, // 30 second timeout per property
};

/**
 * Test user IDs for cleanup
 */
const testUserIds: string[] = [];

/**
 * Create a test user for token tests
 */
async function createTestUser(): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: 'dummy-hash',
      name: 'Test User',
      emailVerified: false,
    })
    .returning({ id: users.id });
  
  testUserIds.push(user.id);
  return user.id;
}

/**
 * Clean up test data after each test
 */
afterEach(async () => {
  // Delete all tokens for test users
  for (const userId of testUserIds) {
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
  testUserIds.length = 0;
});

describe('Token Generation and Verification - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 3: Registration creates verification token
   * Validates: Requirements 1.4
   * 
   * For any newly created user account, a verification token should be generated
   * with a valid expiration timestamp.
   */
  test('Property 3: Registration creates verification token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random expiration times (1 minute to 7 days)
        fc.integer({ min: 60_000, max: 7 * 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          // Create test user
          const userId = await createTestUser();

          // Generate token
          const result = await generateToken(userId, 'email_verification', expiresInMs);

          // Property 1: Token should be non-empty string
          expect(result.token).toBeTruthy();
          expect(typeof result.token).toBe('string');
          expect(result.token.length).toBeGreaterThan(0);

          // Property 2: Token ID should be returned
          expect(result.tokenId).toBeTruthy();
          expect(typeof result.tokenId).toBe('string');

          // Property 3: Expiration should be in the future
          expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

          // Property 4: Expiration should be approximately expiresInMs from now
          const expectedExpiration = Date.now() + expiresInMs;
          const actualExpiration = result.expiresAt.getTime();
          const timeDiff = Math.abs(actualExpiration - expectedExpiration);
          expect(timeDiff).toBeLessThan(1000); // Within 1 second

          // Property 5: Token should be verifiable
          const verified = await verifyToken(result.token, 'email_verification');
          expect(verified).not.toBeNull();
          expect(verified?.userId).toBe(userId);
          expect(verified?.tokenId).toBe(result.tokenId);

          // Property 6: Token should exist in database
          const [dbToken] = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.id, result.tokenId))
            .limit(1);
          
          expect(dbToken).toBeTruthy();
          expect(dbToken.userId).toBe(userId);
          expect(dbToken.type).toBe('email_verification');
          expect(dbToken.usedAt).toBeNull();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: authentication-system, Property 6: New verification token invalidates previous tokens
   * Validates: Requirements 2.4
   * 
   * For any user with an existing verification token, requesting a new token
   * should invalidate the previous token.
   */
  test('Property 6: New verification token invalidates previous tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random expiration times for both tokens
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs1, expiresInMs2) => {
          // Create test user
          const userId = await createTestUser();

          // Generate first token
          const token1 = await generateToken(userId, 'email_verification', expiresInMs1);

          // Verify first token works
          const verified1 = await verifyToken(token1.token, 'email_verification');
          expect(verified1).not.toBeNull();
          expect(verified1?.userId).toBe(userId);

          // Invalidate previous tokens
          await invalidateUserTokens(userId, 'email_verification');

          // Generate second token
          const token2 = await generateToken(userId, 'email_verification', expiresInMs2);

          // Property 1: First token should no longer verify (marked as used)
          const verified1After = await verifyToken(token1.token, 'email_verification');
          expect(verified1After).toBeNull();

          // Property 2: Second token should verify
          const verified2 = await verifyToken(token2.token, 'email_verification');
          expect(verified2).not.toBeNull();
          expect(verified2?.userId).toBe(userId);

          // Property 3: First token should be marked as used in database
          const [dbToken1] = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.id, token1.tokenId))
            .limit(1);
          
          expect(dbToken1.usedAt).not.toBeNull();

          // Property 4: Second token should not be marked as used
          const [dbToken2] = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.id, token2.tokenId))
            .limit(1);
          
          expect(dbToken2.usedAt).toBeNull();

          // Property 5: Tokens should be different
          expect(token1.token).not.toBe(token2.token);
          expect(token1.tokenId).not.toBe(token2.tokenId);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Token type isolation
   * 
   * Tokens of different types should not interfere with each other.
   * Invalidating email_verification tokens should not affect password_reset tokens.
   */
  test('Property: Token type isolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          const userId = await createTestUser();

          // Generate tokens of both types
          const emailToken = await generateToken(userId, 'email_verification', expiresInMs);
          const resetToken = await generateToken(userId, 'password_reset', expiresInMs);

          // Invalidate email verification tokens
          await invalidateUserTokens(userId, 'email_verification');

          // Email token should be invalidated
          const verifiedEmail = await verifyToken(emailToken.token, 'email_verification');
          expect(verifiedEmail).toBeNull();

          // Password reset token should still be valid
          const verifiedReset = await verifyToken(resetToken.token, 'password_reset');
          expect(verifiedReset).not.toBeNull();
          expect(verifiedReset?.userId).toBe(userId);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Token one-time use
   * 
   * Once a token is marked as used, it should no longer verify.
   */
  test('Property: Token one-time use', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          const userId = await createTestUser();

          // Generate token
          const result = await generateToken(userId, 'email_verification', expiresInMs);

          // Verify token works initially
          const verified1 = await verifyToken(result.token, 'email_verification');
          expect(verified1).not.toBeNull();

          // Mark token as used
          await markTokenAsUsed(result.tokenId);

          // Token should no longer verify
          const verified2 = await verifyToken(result.token, 'email_verification');
          expect(verified2).toBeNull();

          // Token should be marked as used in database
          const [dbToken] = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.id, result.tokenId))
            .limit(1);
          
          expect(dbToken.usedAt).not.toBeNull();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Token expiration
   * 
   * Expired tokens should not verify, even if they haven't been used.
   */
  test('Property: Token expiration', async () => {
    const userId = await createTestUser();

    // Generate token with very short expiration (1ms)
    const result = await generateToken(userId, 'email_verification', 1);

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    // Token should not verify after expiration
    const verified = await verifyToken(result.token, 'email_verification');
    expect(verified).toBeNull();
  });

  /**
   * Additional property: Token signature verification
   * 
   * Tampering with any part of the token should cause verification to fail.
   */
  test('Property: Token signature verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          const userId = await createTestUser();

          // Generate token
          const result = await generateToken(userId, 'email_verification', expiresInMs);

          // Token should verify normally
          const verified = await verifyToken(result.token, 'email_verification');
          expect(verified).not.toBeNull();

          // Tamper with token by changing one character
          const parts = result.token.split('.');
          const tamperedToken = parts[0] + 'X.' + parts.slice(1).join('.');

          // Tampered token should not verify
          const verifiedTampered = await verifyToken(tamperedToken, 'email_verification');
          expect(verifiedTampered).toBeNull();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Token type mismatch
   * 
   * Verifying a token with the wrong type should fail.
   */
  test('Property: Token type mismatch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          const userId = await createTestUser();

          // Generate email verification token
          const result = await generateToken(userId, 'email_verification', expiresInMs);

          // Token should verify with correct type
          const verified1 = await verifyToken(result.token, 'email_verification');
          expect(verified1).not.toBeNull();

          // Token should not verify with wrong type
          const verified2 = await verifyToken(result.token, 'password_reset');
          expect(verified2).toBeNull();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Edge case: Invalid token format
   */
  test('Edge case: Invalid token format returns null', async () => {
    const invalidTokens = [
      '',
      'invalid',
      'too.few.parts',
      'too.many.parts.here.now',
      'userId.notanumber.token.signature',
    ];

    for (const token of invalidTokens) {
      const verified = await verifyToken(token, 'email_verification');
      expect(verified).toBeNull();
    }
  });

  /**
   * Edge case: Empty user ID
   */
  test('Edge case: Empty user ID is rejected', async () => {
    await expect(generateToken('', 'email_verification', 60_000)).rejects.toThrow(
      'User ID is required'
    );
  });

  /**
   * Edge case: Zero or negative expiration
   */
  test('Edge case: Zero or negative expiration is rejected', async () => {
    // No DB setup needed here because generateToken should fail before any insert runs
    const userId = 'test-user-expiration-guard';

    await expect(generateToken(userId, 'email_verification', 0)).rejects.toThrow(
      'Expiration time must be positive'
    );

    await expect(generateToken(userId, 'email_verification', -1000)).rejects.toThrow(
      'Expiration time must be positive'
    );
  });

  /**
   * Edge case: Empty token ID for markTokenAsUsed
   */
  test('Edge case: Empty token ID is rejected', async () => {
    await expect(markTokenAsUsed('')).rejects.toThrow('Token ID is required');
  });

  /**
   * Edge case: Empty user ID for invalidateUserTokens
   */
  test('Edge case: Empty user ID for invalidation is rejected', async () => {
    await expect(invalidateUserTokens('', 'email_verification')).rejects.toThrow(
      'User ID is required'
    );
  });

  /**
   * Additional property: Multiple tokens per user
   * 
   * A user can have multiple valid tokens of different types simultaneously.
   */
  test('Property: Multiple tokens per user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          const userId = await createTestUser();

          // Generate multiple tokens of different types
          const emailToken1 = await generateToken(userId, 'email_verification', expiresInMs);
          const resetToken1 = await generateToken(userId, 'password_reset', expiresInMs);
          const resetToken2 = await generateToken(userId, 'password_reset', expiresInMs);

          // All tokens should verify
          const verified1 = await verifyToken(emailToken1.token, 'email_verification');
          expect(verified1).not.toBeNull();

          const verified2 = await verifyToken(resetToken1.token, 'password_reset');
          expect(verified2).not.toBeNull();

          const verified3 = await verifyToken(resetToken2.token, 'password_reset');
          expect(verified3).not.toBeNull();

          // All tokens should have different IDs
          expect(emailToken1.tokenId).not.toBe(resetToken1.tokenId);
          expect(emailToken1.tokenId).not.toBe(resetToken2.tokenId);
          expect(resetToken1.tokenId).not.toBe(resetToken2.tokenId);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Token uniqueness
   * 
   * Each generated token should be unique, even for the same user and type.
   */
  test('Property: Token uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60_000, max: 24 * 60 * 60_000 }),
        async (expiresInMs) => {
          const userId = await createTestUser();

          // Generate multiple tokens
          const token1 = await generateToken(userId, 'email_verification', expiresInMs);
          const token2 = await generateToken(userId, 'email_verification', expiresInMs);
          const token3 = await generateToken(userId, 'email_verification', expiresInMs);

          // All tokens should be different
          expect(token1.token).not.toBe(token2.token);
          expect(token1.token).not.toBe(token3.token);
          expect(token2.token).not.toBe(token3.token);

          // All token IDs should be different
          expect(token1.tokenId).not.toBe(token2.tokenId);
          expect(token1.tokenId).not.toBe(token3.tokenId);
          expect(token2.tokenId).not.toBe(token3.tokenId);
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
