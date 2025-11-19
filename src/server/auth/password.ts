/**
 * Password hashing utilities using Argon2id
 * 
 * This module provides secure password hashing and verification using the Argon2id
 * algorithm with appropriate security parameters.
 * 
 * Security parameters:
 * - Algorithm: Argon2id (hybrid mode, resistant to both side-channel and GPU attacks)
 * - Memory cost: 65536 KiB (64 MiB)
 * - Iterations: 3
 * - Parallelism: 1 (default)
 * 
 * @module server/auth/password
 */

import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id configuration parameters
 * These values follow OWASP recommendations for password storage
 */
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3,       // 3 iterations
  outputLen: 32,     // 32 bytes output
} as const;

/**
 * Hashes a plaintext password using Argon2id
 * 
 * @param password - The plaintext password to hash
 * @returns A promise that resolves to the hashed password string
 * @throws {Error} If password is empty or hashing fails
 * 
 * @example
 * ```typescript
 * const hash = await hashPassword('MySecurePassword123!');
 * // Returns: $argon2id$v=19$m=65536,t=3,p=1$...
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    const hashedPassword = await hash(password, ARGON2_OPTIONS);
    return hashedPassword;
  } catch (error) {
    throw new Error(
      `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verifies a plaintext password against a hashed password
 * 
 * Uses constant-time comparison to prevent timing attacks
 * 
 * @param password - The plaintext password to verify
 * @param hash - The hashed password to compare against
 * @returns A promise that resolves to true if the password matches, false otherwise
 * @throws {Error} If verification fails due to invalid hash format
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('MySecurePassword123!', storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || password.length === 0) {
    return false;
  }

  if (!hash || hash.length === 0) {
    return false;
  }

  try {
    const isValid = await verify(hash, password);
    return isValid;
  } catch (error) {
    // Invalid hash format or verification error
    // Return false instead of throwing to prevent information leakage
    return false;
  }
}
