/**
 * Token Encryption Utilities
 *
 * Provides encryption and decryption for sensitive token data.
 * Uses AES-256-GCM for authenticated encryption.
 *
 * @module server/auth/token-encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Encryption algorithm used for token encryption
 */
const ALGORITHM = "aes-256-gcm";

/**
 * Length of the initialization vector in bytes
 */
const IV_LENGTH = 12;

/**
 * Length of the authentication tag in bytes
 */
const AUTH_TAG_LENGTH = 16;

/**
 * Minimum key length in bytes (256 bits)
 */
const MIN_KEY_LENGTH = 32;

/**
 * Encrypts a token using AES-256-GCM
 *
 * The encrypted result includes:
 * - IV (12 bytes): Random initialization vector
 * - Ciphertext: The encrypted token
 * - Auth Tag (16 bytes): Authentication tag for integrity verification
 *
 * @param token - The plaintext token to encrypt
 * @param key - The encryption key (must be 32 bytes / 256 bits)
 * @returns Base64-encoded encrypted token (IV + ciphertext + authTag)
 * @throws Error if key is invalid or encryption fails
 *
 * @example
 * ```ts
 * const key = process.env.TOKEN_ENCRYPTION_KEY; // 32-byte key
 * const encrypted = encryptToken("my-secret-token", key);
 * ```
 */
export function encryptToken(token: string, key: string): string {
  if (!token) {
    throw new Error("Token cannot be empty");
  }

  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new Error(`Encryption key must be at least ${MIN_KEY_LENGTH} bytes`);
  }

  // Use only first 32 bytes of key
  const keyBuffer = Buffer.from(key.slice(0, MIN_KEY_LENGTH), "utf-8");

  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  // Encrypt the token
  const encrypted = Buffer.concat([
    cipher.update(token, "utf-8"),
    cipher.final(),
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

/**
 * Decrypts a token encrypted with encryptToken
 *
 * @param encryptedToken - Base64-encoded encrypted token
 * @param key - The encryption key (must match encryption key)
 * @returns The decrypted plaintext token
 * @throws Error if decryption fails or token is tampered with
 *
 * @example
 * ```ts
 * const key = process.env.TOKEN_ENCRYPTION_KEY;
 * const decrypted = decryptToken(encryptedToken, key);
 * ```
 */
export function decryptToken(encryptedToken: string, key: string): string {
  if (!encryptedToken) {
    throw new Error("Encrypted token cannot be empty");
  }

  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new Error(`Encryption key must be at least ${MIN_KEY_LENGTH} bytes`);
  }

  // Use only first 32 bytes of key
  const keyBuffer = Buffer.from(key.slice(0, MIN_KEY_LENGTH), "utf-8");

  // Decode the base64 token
  const combined = Buffer.from(encryptedToken, "base64");

  // Validate minimum length (IV + at least 1 byte + auth tag)
  if (combined.length < IV_LENGTH + 1 + AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted token format");
  }

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch (error) {
    throw new Error("Failed to decrypt token: invalid key or tampered data");
  }
}

/**
 * Checks if token encryption is available
 *
 * @returns True if encryption key is configured
 */
export function isEncryptionAvailable(): boolean {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  return !!key && key.length >= MIN_KEY_LENGTH;
}

/**
 * Safely encrypts a token if encryption is available
 *
 * @param token - The token to encrypt
 * @returns Encrypted token if key available, original token otherwise
 */
export function safeEncryptToken(token: string): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    return token;
  }
  return encryptToken(token, key);
}

/**
 * Safely decrypts a token if it appears to be encrypted
 *
 * @param token - The potentially encrypted token
 * @returns Decrypted token if encrypted, original token otherwise
 */
export function safeDecryptToken(token: string): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    return token;
  }

  // Check if token looks like base64 (encrypted)
  if (!isBase64(token)) {
    return token;
  }

  try {
    return decryptToken(token, key);
  } catch {
    // If decryption fails, return original (might not be encrypted)
    return token;
  }
}

/**
 * Checks if a string appears to be base64 encoded
 */
function isBase64(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  try {
    return Buffer.from(str, "base64").toString("base64") === str;
  } catch {
    return false;
  }
}
