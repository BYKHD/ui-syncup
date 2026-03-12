/**
 * Token generation and verification utilities
 * 
 * This module provides secure token generation and verification for email verification
 * and password reset flows using HMAC-SHA256 signatures.
 * 
 * Token format: {userId}.{expiresAt}.{signature}
 * - userId: UUID of the user
 * - expiresAt: Unix timestamp in milliseconds
 * - signature: HMAC-SHA256 of userId + expiresAt + type
 * 
 * @module server/auth/tokens
 */

import { createHmac, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { verificationTokens } from '@/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { env } from '@/lib/env';
import { logAuthEvent } from '@/lib/logger';

/**
 * Token types supported by the system
 */
export type TokenType = 'email_verification' | 'password_reset';

/**
 * Token generation result
 */
export interface TokenResult {
  token: string;
  tokenId: string;
  expiresAt: Date;
}

/**
 * Token verification result
 */
export interface VerifiedToken {
  userId: string;
  tokenId: string;
  type: TokenType;
}

/**
 * Generate a cryptographically secure random token string
 * 
 * @returns A random hex string (32 bytes = 64 hex characters)
 */
function generateRandomToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create HMAC-SHA256 signature for token components
 * 
 * @param userId - User ID
 * @param expiresAt - Expiration timestamp
 * @param type - Token type
 * @param tokenString - Random token string
 * @returns HMAC signature as hex string
 */
function createSignature(
  userId: string,
  expiresAt: number,
  type: TokenType,
  tokenString: string
): string {
  const data = `${userId}.${expiresAt}.${type}.${tokenString}`;
  const hmac = createHmac('sha256', env.BETTER_AUTH_SECRET);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Verify HMAC-SHA256 signature for token components
 * 
 * @param userId - User ID
 * @param expiresAt - Expiration timestamp
 * @param type - Token type
 * @param tokenString - Random token string
 * @param signature - Signature to verify
 * @returns True if signature is valid
 */
function verifySignature(
  userId: string,
  expiresAt: number,
  type: TokenType,
  tokenString: string,
  signature: string
): boolean {
  const expectedSignature = createSignature(userId, expiresAt, type, tokenString);
  
  // Use constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Generate a signed token and store it in the database
 * 
 * Creates a cryptographically secure token with HMAC-SHA256 signature,
 * stores it in the database with expiration, and returns the token string.
 * 
 * @param userId - User ID to associate with the token
 * @param type - Type of token (email_verification or password_reset)
 * @param expiresInMs - Token lifetime in milliseconds
 * @returns Promise resolving to token string and metadata
 * @throws {Error} If token generation or database insertion fails
 * 
 * @example
 * ```typescript
 * // Generate email verification token (24 hours)
 * const result = await generateToken(
 *   'user-uuid',
 *   'email_verification',
 *   24 * 60 * 60 * 1000
 * );
 * 
 * // Generate password reset token (1 hour)
 * const result = await generateToken(
 *   'user-uuid',
 *   'password_reset',
 *   60 * 60 * 1000
 * );
 * ```
 */
export async function generateToken(
  userId: string,
  type: TokenType,
  expiresInMs: number
): Promise<TokenResult> {
  if (!userId || userId.length === 0) {
    throw new Error('User ID is required');
  }
  
  if (expiresInMs <= 0) {
    throw new Error('Expiration time must be positive');
  }
  
  // Generate random token string
  const tokenString = generateRandomToken();
  
  // Calculate expiration timestamp
  const now = Date.now();
  const expiresAt = now + expiresInMs;
  
  // Create signature
  const signature = createSignature(userId, expiresAt, type, tokenString);
  
  // Combine into final token format
  const token = `${userId}.${expiresAt}.${tokenString}.${signature}`;
  
  try {
    // Store token in database
    const [result] = await db
      .insert(verificationTokens)
      .values({
        userId,
        token,
        type,
        expiresAt: new Date(expiresAt),
      })
      .returning({ id: verificationTokens.id });
    
    return {
      token,
      tokenId: result.id,
      expiresAt: new Date(expiresAt),
    };
  } catch (error) {
    throw new Error(
      `Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verify a token signature and check expiration
 * 
 * Validates the token format, verifies the HMAC signature, checks expiration,
 * and ensures the token exists in the database and hasn't been used.
 * 
 * @param token - Token string to verify
 * @param type - Expected token type
 * @param context - Optional context for logging (ipAddress, requestId)
 * @returns Promise resolving to verified token data or null if invalid
 * 
 * @example
 * ```typescript
 * const verified = await verifyToken(tokenString, 'email_verification');
 * if (verified) {
 *   // Token is valid, proceed with verification
 *   await markUserAsVerified(verified.userId);
 * } else {
 *   // Token is invalid, expired, or already used
 *   throw new Error('Invalid verification token');
 * }
 * ```
 */
export async function verifyToken(
  token: string,
  type: TokenType,
  context?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<VerifiedToken | null> {
  if (!token || token.length === 0) {
    return null;
  }
  
  // Parse token format: userId.expiresAt.tokenString.signature
  const parts = token.split('.');
  if (parts.length !== 4) {
    // Log token tampering - invalid format
    logAuthEvent('auth.token.tampered', {
      outcome: 'failure',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      errorCode: 'INVALID_TOKEN_FORMAT',
      errorMessage: 'Token format is invalid',
      metadata: {
        tokenType: type,
        reason: 'invalid_format',
      },
    });
    return null;
  }
  
  const [userId, expiresAtStr, tokenString, signature] = parts;
  
  // Validate expiration timestamp format
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) {
    return null;
  }
  
  // Check if token is expired
  const now = Date.now();
  if (now > expiresAt) {
    return null;
  }
  
  // Verify signature
  const isValidSignature = verifySignature(userId, expiresAt, type, tokenString, signature);
  if (!isValidSignature) {
    // Log token tampering - invalid signature
    logAuthEvent('auth.token.tampered', {
      outcome: 'failure',
      userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      errorCode: 'INVALID_TOKEN_SIGNATURE',
      errorMessage: 'Token signature is invalid',
      metadata: {
        tokenType: type,
        reason: 'invalid_signature',
      },
    });
    return null;
  }
  
  try {
    // Check if token exists in database and hasn't been used
    const [dbToken] = await db
      .select({
        id: verificationTokens.id,
        userId: verificationTokens.userId,
        type: verificationTokens.type,
        usedAt: verificationTokens.usedAt,
        expiresAt: verificationTokens.expiresAt,
      })
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, type)
        )
      )
      .limit(1);
    
    if (!dbToken) {
      return null;
    }
    
    // Check if token has been used
    if (dbToken.usedAt !== null) {
      return null;
    }
    
    // Double-check expiration from database
    if (new Date() > dbToken.expiresAt) {
      return null;
    }
    
    return {
      userId: dbToken.userId,
      tokenId: dbToken.id,
      type: dbToken.type as TokenType,
    };
  } catch (error) {
    // Database error - return null to prevent information leakage
    return null;
  }
}

/**
 * Mark a token as used
 * 
 * Updates the token's usedAt timestamp to prevent reuse.
 * This should be called after successfully processing a token.
 * 
 * @param tokenId - Token ID to mark as used
 * @returns Promise resolving when token is marked as used
 * @throws {Error} If database update fails
 * 
 * @example
 * ```typescript
 * const verified = await verifyToken(tokenString, 'email_verification');
 * if (verified) {
 *   await markUserAsVerified(verified.userId);
 *   await markTokenAsUsed(verified.tokenId);
 * }
 * ```
 */
export async function markTokenAsUsed(tokenId: string): Promise<void> {
  if (!tokenId || tokenId.length === 0) {
    throw new Error('Token ID is required');
  }
  
  try {
    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, tokenId));
  } catch (error) {
    throw new Error(
      `Failed to mark token as used: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Invalidate all tokens of a specific type for a user
 * 
 * Marks all unused tokens of the specified type as used.
 * This is useful when generating a new token to invalidate previous ones.
 * 
 * @param userId - User ID
 * @param type - Token type to invalidate
 * @returns Promise resolving when tokens are invalidated
 * @throws {Error} If database update fails
 * 
 * @example
 * ```typescript
 * // Invalidate previous password reset tokens before generating new one
 * await invalidateUserTokens(userId, 'password_reset');
 * const newToken = await generateToken(userId, 'password_reset', 3600000);
 * ```
 */
export async function invalidateUserTokens(
  userId: string,
  type: TokenType
): Promise<void> {
  if (!userId || userId.length === 0) {
    throw new Error('User ID is required');
  }
  
  try {
    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.type, type),
          isNull(verificationTokens.usedAt)
        )
      );
  } catch (error) {
    throw new Error(
      `Failed to invalidate tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
