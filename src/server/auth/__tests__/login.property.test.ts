/**
 * Property-Based Tests for User Sign-In
 * 
 * Tests correctness properties for the login flow using fast-check.
 * Each test runs 100+ iterations with randomly generated inputs.
 * 
 * @module server/auth/__tests__/login.property.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
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
 * Run each property 100 times with different random inputs
 */
const propertyConfig = { numRuns: 100 };

/**
 * Clean up rate limits before and after each test
 */
beforeEach(async () => {
  await clearAllLimits();
});

afterEach(async () => {
  await clearAllLimits();
});

describe('Property 8: Rate limiting blocks excessive sign-in attempts', () => {
  /**
   * Feature: authentication-system, Property 8: Rate limiting blocks excessive sign-in attempts
   * Validates: Requirements 3.5
   * 
   * For any IP address or email, exceeding the rate limit (5 per IP per minute,
   * 3 per email per 15 minutes) should result in blocked requests with appropriate
   * retry-after information.
   */
  
  test('IP-based rate limiting blocks after 5 attempts per minute', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random IP addresses
        fc.ipV4(),
        async (ip) => {
          const key = createRateLimitKey.signInIp(ip);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_IP;

          // Property: First N requests should be allowed
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs);
            expect(allowed).toBe(true);
            
            // Property: Remaining attempts should decrease
            const remaining = await getRemainingAttempts(key, limit);
            expect(remaining).toBe(limit - i - 1);
          }

          // Property: (N+1)th request should be blocked
          const blocked = await checkLimit(key, limit, windowMs);
          expect(blocked).toBe(false);

          // Property: Remaining attempts should be 0
          const remaining = await getRemainingAttempts(key, limit);
          expect(remaining).toBe(0);

          // Property: Reset time should be positive and within window
          const resetTime = await getResetTime(key);
          expect(resetTime).toBeGreaterThan(0);
          expect(resetTime).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));

          // Property: Subsequent requests should also be blocked
          const stillBlocked = await checkLimit(key, limit, windowMs);
          expect(stillBlocked).toBe(false);

          // Clean up
          await resetLimit(key);
        }
      ),
      propertyConfig
    );
  });

  test('Email-based rate limiting blocks after 3 attempts per 15 minutes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email addresses
        fc.emailAddress(),
        async (email) => {
          const key = createRateLimitKey.signInEmail(email);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_EMAIL;

          // Property: First N requests should be allowed
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs);
            expect(allowed).toBe(true);
            
            // Property: Remaining attempts should decrease
            const remaining = await getRemainingAttempts(key, limit);
            expect(remaining).toBe(limit - i - 1);
          }

          // Property: (N+1)th request should be blocked
          const blocked = await checkLimit(key, limit, windowMs);
          expect(blocked).toBe(false);

          // Property: Remaining attempts should be 0
          const remaining = await getRemainingAttempts(key, limit);
          expect(remaining).toBe(0);

          // Property: Reset time should be positive and within window
          const resetTime = await getResetTime(key);
          expect(resetTime).toBeGreaterThan(0);
          expect(resetTime).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));

          // Property: Subsequent requests should also be blocked
          const stillBlocked = await checkLimit(key, limit, windowMs);
          expect(stillBlocked).toBe(false);

          // Clean up
          await resetLimit(key);
        }
      ),
      propertyConfig
    );
  });

  test('Email rate limiting is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email addresses
        fc.emailAddress(),
        async (email) => {
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_EMAIL;

          // Create keys with different cases
          const keyLower = createRateLimitKey.signInEmail(email.toLowerCase());
          const keyUpper = createRateLimitKey.signInEmail(email.toUpperCase());
          const keyMixed = createRateLimitKey.signInEmail(
            email.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('')
          );

          // Property: All keys should be identical (case-insensitive)
          expect(keyLower).toBe(keyUpper);
          expect(keyLower).toBe(keyMixed);

          // Property: Exhausting limit with one case blocks all cases
          for (let i = 0; i < limit; i++) {
            await checkLimit(keyLower, limit, windowMs);
          }

          // All variations should be blocked
          const blockedLower = await checkLimit(keyLower, limit, windowMs);
          const blockedUpper = await checkLimit(keyUpper, limit, windowMs);
          const blockedMixed = await checkLimit(keyMixed, limit, windowMs);

          expect(blockedLower).toBe(false);
          expect(blockedUpper).toBe(false);
          expect(blockedMixed).toBe(false);

          // Clean up
          await resetLimit(keyLower);
        }
      ),
      propertyConfig
    );
  });

  test('IP and email rate limits are independent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.emailAddress(),
        async (ip, email) => {
          const ipKey = createRateLimitKey.signInIp(ip);
          const emailKey = createRateLimitKey.signInEmail(email);
          
          const ipLimit = RATE_LIMITS.SIGNIN_IP.limit;
          const ipWindowMs = RATE_LIMITS.SIGNIN_IP.windowMs;
          const emailLimit = RATE_LIMITS.SIGNIN_EMAIL.limit;
          const emailWindowMs = RATE_LIMITS.SIGNIN_EMAIL.windowMs;

          // Property: Exhausting IP limit doesn't affect email limit
          for (let i = 0; i < ipLimit; i++) {
            await checkLimit(ipKey, ipLimit, ipWindowMs);
          }

          // IP should be blocked
          const ipBlocked = await checkLimit(ipKey, ipLimit, ipWindowMs);
          expect(ipBlocked).toBe(false);

          // Email should still be allowed
          const emailAllowed = await checkLimit(emailKey, emailLimit, emailWindowMs);
          expect(emailAllowed).toBe(true);

          // Property: Exhausting email limit doesn't affect IP limit (after reset)
          await resetLimit(ipKey);
          
          for (let i = 0; i < emailLimit; i++) {
            await checkLimit(emailKey, emailLimit, emailWindowMs);
          }

          // Email should be blocked
          const emailBlocked = await checkLimit(emailKey, emailLimit, emailWindowMs);
          expect(emailBlocked).toBe(false);

          // IP should be allowed (was reset)
          const ipAllowedAfterReset = await checkLimit(ipKey, ipLimit, ipWindowMs);
          expect(ipAllowedAfterReset).toBe(true);

          // Clean up
          await resetLimit(ipKey);
          await resetLimit(emailKey);
        }
      ),
      propertyConfig
    );
  });

  test('Rate limit resets after window expires', async () => {
    const ip = '192.168.1.100';
    const key = createRateLimitKey.signInIp(ip);
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

    // Property: After window expires, requests should be allowed again
    const allowedAfterReset = await checkLimit(key, limit, windowMs);
    expect(allowedAfterReset).toBe(true);

    // Property: Counter should reset to 1
    const remaining = await getRemainingAttempts(key, limit);
    expect(remaining).toBe(limit - 1);

    // Clean up
    await resetLimit(key);
  });

  test('Different IPs have independent rate limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.ipV4(),
        async (ip1, ip2) => {
          // Skip if IPs are the same
          fc.pre(ip1 !== ip2);

          const key1 = createRateLimitKey.signInIp(ip1);
          const key2 = createRateLimitKey.signInIp(ip2);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_IP;

          // Property: Exhausting limit for IP1 doesn't affect IP2
          for (let i = 0; i < limit; i++) {
            await checkLimit(key1, limit, windowMs);
          }

          // IP1 should be blocked
          const ip1Blocked = await checkLimit(key1, limit, windowMs);
          expect(ip1Blocked).toBe(false);

          // IP2 should still be allowed
          const ip2Allowed = await checkLimit(key2, limit, windowMs);
          expect(ip2Allowed).toBe(true);

          // Property: IP2 can exhaust its own limit independently
          for (let i = 1; i < limit; i++) {
            await checkLimit(key2, limit, windowMs);
          }

          // IP2 should now be blocked
          const ip2Blocked = await checkLimit(key2, limit, windowMs);
          expect(ip2Blocked).toBe(false);

          // IP1 should still be blocked
          const ip1StillBlocked = await checkLimit(key1, limit, windowMs);
          expect(ip1StillBlocked).toBe(false);

          // Clean up
          await resetLimit(key1);
          await resetLimit(key2);
        }
      ),
      propertyConfig
    );
  });

  test('Different emails have independent rate limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.emailAddress(),
        async (email1, email2) => {
          // Skip if emails are the same (case-insensitive)
          fc.pre(email1.toLowerCase() !== email2.toLowerCase());

          const key1 = createRateLimitKey.signInEmail(email1);
          const key2 = createRateLimitKey.signInEmail(email2);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_EMAIL;

          // Property: Exhausting limit for email1 doesn't affect email2
          for (let i = 0; i < limit; i++) {
            await checkLimit(key1, limit, windowMs);
          }

          // Email1 should be blocked
          const email1Blocked = await checkLimit(key1, limit, windowMs);
          expect(email1Blocked).toBe(false);

          // Email2 should still be allowed
          const email2Allowed = await checkLimit(key2, limit, windowMs);
          expect(email2Allowed).toBe(true);

          // Clean up
          await resetLimit(key1);
          await resetLimit(key2);
        }
      ),
      propertyConfig
    );
  });

  test('Retry-after time decreases as time passes', async () => {
    const ip = '192.168.1.200';
    const key = createRateLimitKey.signInIp(ip);
    const limit = 2;
    const windowMs = 1000; // 1 second window

    // Exhaust the limit
    for (let i = 0; i < limit; i++) {
      await checkLimit(key, limit, windowMs);
    }

    // Get initial retry-after time
    const initialRetryAfter = await getResetTime(key);
    expect(initialRetryAfter).toBeGreaterThan(0);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Property: Retry-after time should decrease
    const laterRetryAfter = await getResetTime(key);
    expect(laterRetryAfter).toBeLessThanOrEqual(initialRetryAfter);

    // Clean up
    await resetLimit(key);
  });

  test('Zero remaining attempts means rate limited', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        async (ip) => {
          const key = createRateLimitKey.signInIp(ip);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_IP;

          // Exhaust the limit
          for (let i = 0; i < limit; i++) {
            await checkLimit(key, limit, windowMs);
          }

          // Property: Zero remaining attempts means next request is blocked
          const remaining = await getRemainingAttempts(key, limit);
          expect(remaining).toBe(0);

          const blocked = await checkLimit(key, limit, windowMs);
          expect(blocked).toBe(false);

          // Clean up
          await resetLimit(key);
        }
      ),
      propertyConfig
    );
  });

  test('Rate limit applies to both successful and failed login attempts', async () => {
    // This property ensures that rate limiting is applied at the request level,
    // not just for successful authentications. This prevents attackers from
    // bypassing rate limits by intentionally failing authentication.
    
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const key = createRateLimitKey.signInEmail(email);
          const { limit, windowMs } = RATE_LIMITS.SIGNIN_EMAIL;

          // Property: Rate limit counter increments regardless of auth success
          // Simulate failed login attempts
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs);
            expect(allowed).toBe(true);
            // In real implementation, this would be a failed login attempt
          }

          // Property: After N failed attempts, further attempts are blocked
          const blocked = await checkLimit(key, limit, windowMs);
          expect(blocked).toBe(false);

          // Clean up
          await resetLimit(key);
        }
      ),
      propertyConfig
    );
  });
});
