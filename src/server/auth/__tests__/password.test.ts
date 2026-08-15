/**
 * Property-based tests for password hashing utilities
 * 
 * These tests use fast-check to verify correctness properties across
 * randomly generated inputs, ensuring the password hashing implementation
 * is secure and correct for all valid inputs.
 * 
 * @module server/auth/__tests__/password
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { hashPassword, verifyPassword } from '../password';

/**
 * Property test configuration
 * Run each property 100+ times with different random inputs
 * 
 * Note: Argon2 hashing is computationally expensive, so we use a lower
 * number of runs for property tests to keep test execution time reasonable.
 * The security properties still hold with fewer iterations.
 */
const PROPERTY_CONFIG = { 
  numRuns: 20, // Reduced from 100 due to Argon2 computational cost
  timeout: 30000, // 30 second timeout per property
};

describe('Password Hashing - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 23: Passwords are hashed securely
   * Validates: Requirements 8.1
   * 
   * For any valid password string:
   * 1. The hash should not equal the plaintext password
   * 2. The hash should be non-empty
   * 3. The hash should be verifiable against the original password
   * 4. The hash should start with $argon2id$ (correct algorithm)
   * 5. Different passwords should produce different hashes
   */
  test('Property 23: Passwords are hashed securely', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random passwords (1-128 characters, printable ASCII)
        fc.string({ minLength: 1, maxLength: 128 }),
        async (password) => {
          // Hash the password
          const hash = await hashPassword(password);

          // Property 1: Hash should not equal plaintext
          expect(hash).not.toBe(password);

          // Property 2: Hash should be non-empty
          expect(hash.length).toBeGreaterThan(0);

          // Property 3: Hash should be verifiable
          const isValid = await verifyPassword(password, hash);
          expect(isValid).toBe(true);

          // Property 4: Hash should use Argon2id algorithm
          expect(hash).toMatch(/^\$argon2id\$/);

          // Property 5: Wrong password should not verify
          const wrongPassword = password + 'X'; // Append character to make it different
          const isInvalid = await verifyPassword(wrongPassword, hash);
          expect(isInvalid).toBe(false);
        }
      ),
      PROPERTY_CONFIG
    );
  }, 60000); // 60 second timeout

  /**
   * Additional property: Hash uniqueness
   * 
   * For any two different passwords, their hashes should be different.
   * This ensures the hash function is deterministic but produces unique outputs.
   */
  test('Property: Different passwords produce different hashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 128 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        async (password1, password2) => {
          // Skip if passwords are the same
          fc.pre(password1 !== password2);

          const hash1 = await hashPassword(password1);
          const hash2 = await hashPassword(password2);

          // Different passwords should produce different hashes
          expect(hash1).not.toBe(hash2);
        }
      ),
      PROPERTY_CONFIG
    );
  }, 60000); // 60 second timeout

  /**
   * Additional property: Hash consistency
   * 
   * For any password, hashing it multiple times should produce different hashes
   * (due to random salt), but all hashes should verify against the original password.
   */
  test('Property: Multiple hashes of same password all verify correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 128 }),
        async (password) => {
          // Generate multiple hashes of the same password
          const hash1 = await hashPassword(password);
          const hash2 = await hashPassword(password);
          const hash3 = await hashPassword(password);

          // Hashes should be different (due to random salt)
          expect(hash1).not.toBe(hash2);
          expect(hash2).not.toBe(hash3);
          expect(hash1).not.toBe(hash3);

          // All hashes should verify against the original password
          expect(await verifyPassword(password, hash1)).toBe(true);
          expect(await verifyPassword(password, hash2)).toBe(true);
          expect(await verifyPassword(password, hash3)).toBe(true);
        }
      ),
      PROPERTY_CONFIG
    );
  }, 90000); // 90 second timeout (3 hashes per iteration)

  /**
   * Edge case: Empty password handling
   * 
   * Empty passwords should be rejected by hashPassword
   */
  test('Edge case: Empty password is rejected', async () => {
    await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
  });

  /**
   * Edge case: Invalid hash handling
   * 
   * verifyPassword should return false for invalid hashes instead of throwing
   */
  test('Edge case: Invalid hash returns false', async () => {
    const result = await verifyPassword('password', 'invalid-hash');
    expect(result).toBe(false);
  });

  /**
   * Edge case: Empty hash handling
   * 
   * verifyPassword should return false for empty hashes
   */
  test('Edge case: Empty hash returns false', async () => {
    const result = await verifyPassword('password', '');
    expect(result).toBe(false);
  });

  /**
   * Edge case: Empty password in verification
   * 
   * verifyPassword should return false for empty passwords
   */
  test('Edge case: Empty password in verification returns false', async () => {
    const hash = await hashPassword('ValidPassword123!');
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });

  /**
   * Security property: verification cost does not depend on password correctness.
   *
   * A wrong password must not be rejected faster than a correct one is accepted —
   * otherwise response time leaks whether a guess was right. Argon2id gives us this
   * for free today because both paths run the full KDF; the test exists to catch a
   * future short-circuit (a length compare, a prefix match, a negative cache) being
   * added to verifyPassword.
   *
   * On measurement: this compares MEDIANS of interleaved samples with a RATIO
   * tolerance. The previous version took one sample of each and asserted
   * |t1 - t2| < 100ms, which failed intermittently under the full suite's parallel
   * workers (observed 117ms and 292ms) purely from scheduler noise — a single
   * wall-clock sample on a loaded machine measures the scheduler, not the KDF.
   */
  test('Property: verification cost does not depend on password correctness', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);

    const SAMPLES = 7; // odd, so the median is a real observation rather than a mean
    const correctTimes: number[] = [];
    const wrongTimes: number[] = [];

    // Interleaved, so any drift in machine load over the run hits both series equally.
    for (let i = 0; i < SAMPLES; i++) {
      const startCorrect = performance.now();
      await verifyPassword(password, hash);
      correctTimes.push(performance.now() - startCorrect);

      const startWrong = performance.now();
      await verifyPassword('WrongPassword123!', hash);
      wrongTimes.push(performance.now() - startWrong);
    }

    const median = (xs: number[]) =>
      [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const correctMedian = median(correctTimes);
    const wrongMedian = median(wrongTimes);

    // 1. Neither path short-circuits. Argon2id at 64 MiB / t=3 cannot complete in
    //    single-digit milliseconds, so a cheap pre-check would surface here. Load only
    //    ever makes work slower, which makes this bound immune to scheduler noise.
    expect(correctMedian).toBeGreaterThan(5);
    expect(wrongMedian).toBeGreaterThan(5);

    // 2. Both paths cost the same order of magnitude. A genuine short-circuit gives a
    //    10-100x gap; noise on a median of 7 interleaved samples does not approach 3x.
    const ratio =
      Math.max(correctMedian, wrongMedian) / Math.min(correctMedian, wrongMedian);
    expect(ratio).toBeLessThan(3);
  }, 30000);
});
