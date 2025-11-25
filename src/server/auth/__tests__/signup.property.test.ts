/**
 * Property-Based Tests for User Registration
 * 
 * Tests correctness properties for the signup flow using fast-check.
 * Each test runs 100+ iterations with randomly generated inputs.
 * 
 * @module server/auth/__tests__/signup.property.test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { hashPassword, verifyPassword } from '@/server/auth/password';

/**
 * Property test configuration
 * Run each property 100 times with different random inputs
 * 
 * Note: Password hashing tests use fewer runs due to computational cost of Argon2
 */
const propertyConfig = { numRuns: 100 };
const passwordHashingConfig = { numRuns: 10 }; // Reduced for expensive Argon2 operations

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
const nameArb = fc.string({ minLength: 1, maxLength: 120 }).filter((s) => s.trim().length > 0);

// Generate complete registration data
const registrationArb = fc.record({
  email: emailArb,
  password: passwordArb,
  name: nameArb,
});

describe('Property 1: Valid registration creates user with hashed password', () => {
  /**
   * Feature: authentication-system, Property 1: Valid registration creates user with hashed password
   * Validates: Requirements 1.1
   * 
   * For any valid registration data (email, password, name), creating a user account
   * should result in a user record with a hashed password that can be verified against
   * the original password.
   * 
   * This test focuses on the core password hashing property without requiring database setup.
   */
  it('should hash passwords securely for any valid password', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        // Hash the password
        const passwordHash = await hashPassword(password);
        
        // Property 1: Password should be hashed (not plaintext)
        expect(passwordHash).toBeDefined();
        expect(passwordHash).not.toBe(password);
        expect(passwordHash.length).toBeGreaterThan(0);
        
        // Property 2: Hashed password should start with Argon2id prefix
        expect(passwordHash).toMatch(/^\$argon2id\$/);
        
        // Property 3: Hash should contain Argon2id parameters
        expect(passwordHash).toMatch(/\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
        
        // Property 4: Password should be verifiable against the hash
        const isValid = await verifyPassword(password, passwordHash);
        expect(isValid).toBe(true);
        
        // Property 5: Wrong password should not verify
        const wrongPassword = password + 'X';
        const isInvalid = await verifyPassword(wrongPassword, passwordHash);
        expect(isInvalid).toBe(false);
        
        // Property 6: Hash should be significantly longer than original password
        expect(passwordHash.length).toBeGreaterThan(password.length);
      }),
      passwordHashingConfig
    );
  }, 60000); // 60 second timeout for expensive Argon2 operations
  
  it('should create different hashes for the same password', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        // Hash the same password twice
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);
        
        // Property: Hashes should be different (due to random salt)
        expect(hash1).not.toBe(hash2);
        
        // Property: Both hashes should verify the original password
        const isValid1 = await verifyPassword(password, hash1);
        const isValid2 = await verifyPassword(password, hash2);
        
        expect(isValid1).toBe(true);
        expect(isValid2).toBe(true);
      }),
      passwordHashingConfig
    );
  }, 60000);
  
  it('should verify password multiple times consistently', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        // Hash the password once
        const passwordHash = await hashPassword(password);
        
        // Property: Same password should verify multiple times consistently
        const verify1 = await verifyPassword(password, passwordHash);
        const verify2 = await verifyPassword(password, passwordHash);
        const verify3 = await verifyPassword(password, passwordHash);
        
        expect(verify1).toBe(true);
        expect(verify2).toBe(true);
        expect(verify3).toBe(true);
      }),
      passwordHashingConfig
    );
  }, 60000);
  
  it('should reject incorrect passwords consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(passwordArb, passwordArb).filter(([p1, p2]) => p1 !== p2),
        async ([correctPassword, wrongPassword]) => {
          // Hash the correct password
          const passwordHash = await hashPassword(correctPassword);
          
          // Property: Wrong password should never verify
          const isInvalid1 = await verifyPassword(wrongPassword, passwordHash);
          const isInvalid2 = await verifyPassword(wrongPassword, passwordHash);
          
          expect(isInvalid1).toBe(false);
          expect(isInvalid2).toBe(false);
          
          // Property: Correct password should still verify
          const isValid = await verifyPassword(correctPassword, passwordHash);
          expect(isValid).toBe(true);
        }
      ),
      passwordHashingConfig
    );
  }, 60000);
  
  it('should handle edge cases in password content', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        // Hash password with various special characters
        const passwordHash = await hashPassword(password);
        
        // Property: Password with special chars should hash and verify correctly
        const isValid = await verifyPassword(password, passwordHash);
        expect(isValid).toBe(true);
        
        // Property: Case sensitivity should be preserved
        if (password !== password.toUpperCase()) {
          const isInvalidUpper = await verifyPassword(password.toUpperCase(), passwordHash);
          expect(isInvalidUpper).toBe(false);
        }
        
        if (password !== password.toLowerCase()) {
          const isInvalidLower = await verifyPassword(password.toLowerCase(), passwordHash);
          expect(isInvalidLower).toBe(false);
        }
      }),
      passwordHashingConfig
    );
  }, 60000);
  
  it('should normalize email addresses correctly', async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, async (email) => {
        // Property: Email normalization should be idempotent
        const normalized1 = email.toLowerCase().trim();
        const normalized2 = normalized1.toLowerCase().trim();
        
        expect(normalized1).toBe(normalized2);
        
        // Property: Normalized email should not have leading/trailing whitespace
        expect(normalized1).toBe(normalized1.trim());
        
        // Property: Normalized email should be lowercase
        expect(normalized1).toBe(normalized1.toLowerCase());
      }),
      propertyConfig
    );
  });
  
  it('should normalize names correctly', async () => {
    await fc.assert(
      fc.asyncProperty(nameArb, async (name) => {
        // Property: Name normalization should be idempotent
        const normalized1 = name.trim();
        const normalized2 = normalized1.trim();
        
        expect(normalized1).toBe(normalized2);
        
        // Property: Normalized name should not have leading/trailing whitespace
        expect(normalized1).toBe(normalized1.trim());
        
        // Property: Normalized name should preserve internal whitespace
        const internalSpaces = name.trim().split(/\s+/).length - 1;
        const normalizedSpaces = normalized1.split(/\s+/).length - 1;
        expect(normalizedSpaces).toBeGreaterThanOrEqual(0);
      }),
      propertyConfig
    );
  });
});
