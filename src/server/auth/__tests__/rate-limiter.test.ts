/**
 * Property-based tests for rate limiting utilities
 * 
 * These tests use fast-check to verify correctness properties across
 * randomly generated inputs, ensuring the rate limiting implementation
 * correctly enforces limits and handles edge cases.
 * 
 * @module server/auth/__tests__/rate-limiter
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  checkLimit,
  getRemainingAttempts,
  getResetTime,
  resetLimit,
  clearAllLimits,
  createRateLimitKey,
  RATE_LIMITS,
} from '../rate-limiter';

/**
 * Property test configuration
 * Run each property 100+ times with different random inputs
 */
const PROPERTY_CONFIG = {
  numRuns: 100,
  timeout: 10000, // 10 second timeout per property
};

/**
 * Clean up rate limits before each test
 */
beforeEach(async () => {
  await clearAllLimits();
});

describe('Rate Limiter - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 33: IP-based rate limiting enforces limits
   * Validates: Requirements 11.1
   * 
   * For any IP address, when sign-in requests exceed 5 attempts per minute,
   * the rate limiter should block subsequent requests until the window resets.
   */
  test('Property 33: IP-based rate limiting enforces limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random IP addresses
        fc.ipV4(),
        async (ip) => {
          const key = createRateLimitKey.signInIp(ip);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_IP;

          // First N requests should be allowed
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs);
            expect(allowed).toBe(true);
          }

          // Next request should be blocked
          const blocked = await checkLimit(key, limit, windowMs);
          expect(blocked).toBe(false);

          // Remaining attempts should be 0
          const remaining = await getRemainingAttempts(key, limit);
          expect(remaining).toBe(0);

          // Reset time should be positive
          const resetTime = await getResetTime(key);
          expect(resetTime).toBeGreaterThan(0);

          // Clean up
          await resetLimit(key);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: authentication-system, Property 34: Email-based rate limiting enforces limits
   * Validates: Requirements 11.2
   * 
   * For any email address, when sign-in requests exceed 3 attempts per 15 minutes,
   * the rate limiter should block subsequent requests until the window resets.
   */
  test('Property 34: Email-based rate limiting enforces limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email addresses
        fc.emailAddress(),
        async (email) => {
          const key = createRateLimitKey.signInEmail(email);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_EMAIL;

          // First N requests should be allowed
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs);
            expect(allowed).toBe(true);
          }

          // Next request should be blocked
          const blocked = await checkLimit(key, limit, windowMs);
          expect(blocked).toBe(false);

          // Remaining attempts should be 0
          const remaining = await getRemainingAttempts(key, limit);
          expect(remaining).toBe(0);

          // Reset time should be positive
          const resetTime = await getResetTime(key);
          expect(resetTime).toBeGreaterThan(0);

          // Clean up
          await resetLimit(key);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: authentication-system, Property 36: Rate limit responses include retry-after header
   * Validates: Requirements 11.4
   * 
   * For any rate-limited request, the system should provide information about
   * when the limit will reset (retry-after time).
   */
  test('Property 36: Rate limit responses include retry-after information', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random keys
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }), // limit
        fc.integer({ min: 1000, max: 60000 }), // windowMs (1s to 60s)
        async (keyBase, limit, windowMs) => {
          const key = `test:${keyBase}`;

          // Exhaust the limit
          for (let i = 0; i < limit; i++) {
            await checkLimit(key, limit, windowMs);
          }

          // Check that we're rate limited
          const allowed = await checkLimit(key, limit, windowMs);
          expect(allowed).toBe(false);

          // Get reset time (should be positive and within window)
          const resetTime = await getResetTime(key);
          expect(resetTime).toBeGreaterThan(0);
          expect(resetTime).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));

          // Clean up
          await resetLimit(key);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Rate limit resets after window expires
   * 
   * For any rate limit, after the window expires, new requests should be allowed.
   */
  test('Property: Rate limit resets after window expires', async () => {
    const key = 'test:reset';
    const limit = 3;
    const windowMs = 100; // 100ms window for fast testing

    // Exhaust the limit
    for (let i = 0; i < limit; i++) {
      const allowed = await checkLimit(key, limit, windowMs);
      expect(allowed).toBe(true);
    }

    // Should be blocked
    const blocked = await checkLimit(key, limit, windowMs);
    expect(blocked).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 50));

    // Should be allowed again
    const allowedAfterReset = await checkLimit(key, limit, windowMs);
    expect(allowedAfterReset).toBe(true);

    // Clean up
    await resetLimit(key);
  });

  /**
   * Additional property: Remaining attempts decrease correctly
   * 
   * For any rate limit, remaining attempts should decrease by 1 with each request.
   */
  test('Property: Remaining attempts decrease correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }),
        async (keyBase, limit) => {
          const key = `test:${keyBase}`;
          const windowMs = 60000;

          // Check remaining attempts decrease correctly
          for (let i = 0; i < limit; i++) {
            const remaining = await getRemainingAttempts(key, limit);
            expect(remaining).toBe(limit - i);

            await checkLimit(key, limit, windowMs);
          }

          // After exhausting limit, remaining should be 0
          const finalRemaining = await getRemainingAttempts(key, limit);
          expect(finalRemaining).toBe(0);

          // Clean up
          await resetLimit(key);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Different keys are independent
   * 
   * Rate limits for different keys should not affect each other.
   */
  test('Property: Different keys are independent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        async (key1Base, key2Base, limit) => {
          // Skip if keys are the same
          fc.pre(key1Base !== key2Base);

          const key1 = `test:${key1Base}`;
          const key2 = `test:${key2Base}`;
          const windowMs = 60000;

          // Exhaust limit for key1
          for (let i = 0; i < limit; i++) {
            await checkLimit(key1, limit, windowMs);
          }

          // key1 should be blocked
          const key1Blocked = await checkLimit(key1, limit, windowMs);
          expect(key1Blocked).toBe(false);

          // key2 should still be allowed
          const key2Allowed = await checkLimit(key2, limit, windowMs);
          expect(key2Allowed).toBe(true);

          // Clean up
          await resetLimit(key1);
          await resetLimit(key2);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Email keys are case-insensitive
   * 
   * Email-based rate limits should treat emails case-insensitively.
   */
  test('Property: Email keys are case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const limit = 3;
          const windowMs = 60000;

          // Create keys with different cases
          const key1 = createRateLimitKey.signInEmail(email.toLowerCase());
          const key2 = createRateLimitKey.signInEmail(email.toUpperCase());

          // Keys should be the same
          expect(key1).toBe(key2);

          // Exhaust limit with lowercase
          for (let i = 0; i < limit; i++) {
            await checkLimit(key1, limit, windowMs);
          }

          // Uppercase should also be blocked (same key)
          const blocked = await checkLimit(key2, limit, windowMs);
          expect(blocked).toBe(false);

          // Clean up
          await resetLimit(key1);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Edge case: Zero limit
   * 
   * A limit of 0 should block all requests.
   */
  test('Edge case: Zero limit blocks all requests', async () => {
    const key = 'test:zero-limit';
    const limit = 0;
    const windowMs = 60000;

    const allowed = await checkLimit(key, limit, windowMs);
    expect(allowed).toBe(false);

    const remaining = await getRemainingAttempts(key, limit);
    expect(remaining).toBe(0);

    await resetLimit(key);
  });

  /**
   * Edge case: Very large limit
   * 
   * A very large limit should allow many requests.
   */
  test('Edge case: Very large limit allows many requests', async () => {
    const key = 'test:large-limit';
    const limit = 1000;
    const windowMs = 60000;

    // Make 100 requests (less than limit)
    for (let i = 0; i < 100; i++) {
      const allowed = await checkLimit(key, limit, windowMs);
      expect(allowed).toBe(true);
    }

    const remaining = await getRemainingAttempts(key, limit);
    expect(remaining).toBe(900);

    await resetLimit(key);
  });

  /**
   * Edge case: Very short window
   * 
   * A very short window should reset quickly.
   */
  test('Edge case: Very short window resets quickly', async () => {
    const key = 'test:short-window';
    const limit = 2;
    const windowMs = 50; // 50ms

    // Exhaust limit
    await checkLimit(key, limit, windowMs);
    await checkLimit(key, limit, windowMs);

    // Should be blocked
    const blocked = await checkLimit(key, limit, windowMs);
    expect(blocked).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 20));

    // Should be allowed again
    const allowed = await checkLimit(key, limit, windowMs);
    expect(allowed).toBe(true);

    await resetLimit(key);
  });

  /**
   * Edge case: Reset time for non-existent key
   * 
   * Getting reset time for a key that doesn't exist should return 0.
   */
  test('Edge case: Reset time for non-existent key returns 0', async () => {
    const resetTime = await getResetTime('non-existent-key');
    expect(resetTime).toBe(0);
  });

  /**
   * Edge case: Remaining attempts for non-existent key
   * 
   * Getting remaining attempts for a key that doesn't exist should return the limit.
   */
  test('Edge case: Remaining attempts for non-existent key returns limit', async () => {
    const limit = 10;
    const remaining = await getRemainingAttempts('non-existent-key', limit);
    expect(remaining).toBe(limit);
  });

  /**
   * Integration test: Password reset rate limiting
   * 
   * Verify that password reset rate limiting works as specified.
   */
  test('Integration: Password reset rate limiting (3 per hour)', async () => {
    const email = 'test@example.com';
    const key = createRateLimitKey.passwordReset(email);
    const { limit, windowMs } = RATE_LIMITS.PASSWORD_RESET;

    // First 3 requests should be allowed
    for (let i = 0; i < limit; i++) {
      const allowed = await checkLimit(key, limit, windowMs);
      expect(allowed).toBe(true);
    }

    // 4th request should be blocked
    const blocked = await checkLimit(key, limit, windowMs);
    expect(blocked).toBe(false);

    // Verify remaining attempts is 0
    const remaining = await getRemainingAttempts(key, limit);
    expect(remaining).toBe(0);

    // Verify reset time is within the window
    const resetTime = await getResetTime(key);
    expect(resetTime).toBeGreaterThan(0);
    expect(resetTime).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));

    await resetLimit(key);
  });

  /**
   * Integration test: Signup IP rate limiting
   * 
   * Verify that signup IP rate limiting works as specified.
   */
  test('Integration: Signup IP rate limiting (10 per hour)', async () => {
    const ip = '192.168.1.1';
    const key = createRateLimitKey.signupIp(ip);
    const { limit, windowMs } = RATE_LIMITS.SIGNUP_IP;

    // First 10 requests should be allowed
    for (let i = 0; i < limit; i++) {
      const allowed = await checkLimit(key, limit, windowMs);
      expect(allowed).toBe(true);
    }

    // 11th request should be blocked
    const blocked = await checkLimit(key, limit, windowMs);
    expect(blocked).toBe(false);

    await resetLimit(key);
  });
});
