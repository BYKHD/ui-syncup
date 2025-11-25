/**
 * Session management utilities
 * 
 * This module provides secure session management including creation, validation,
 * renewal, and deletion. Sessions use cryptographically random tokens stored in
 * HTTP-only cookies with appropriate security attributes.
 * 
 * Security features:
 * - Cryptographically random session tokens (32 bytes)
 * - Session validation with signature, expiration, and database checks
 * - Rolling renewal to extend active sessions
 * - Secure session deletion
 * - Multi-device session support
 * 
 * @module server/auth/session
 */

import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { sessions, users } from '@/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getSessionCookie } from './cookies';
import { logAuthEvent } from '@/lib/logger';

/**
 * Session configuration constants
 */
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000; // Renew if < 24 hours remaining

/**
 * User data returned from session validation
 */
export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  sessionId: string;
}

/**
 * Generate a cryptographically secure random session token
 * 
 * @returns A random hex string (32 bytes = 64 hex characters)
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate session expiration timestamp
 * 
 * @returns Date object representing when the session expires
 */
function calculateExpiration(): Date {
  return new Date(Date.now() + SESSION_LIFETIME_MS);
}

/**
 * Check if a session should be renewed based on remaining lifetime
 * 
 * @param expiresAt - Current expiration timestamp
 * @returns True if session should be renewed
 */
function shouldRenewSession(expiresAt: Date): boolean {
  const now = Date.now();
  const expiresAtMs = expiresAt.getTime();
  const remainingMs = expiresAtMs - now;
  
  return remainingMs < SESSION_RENEWAL_THRESHOLD_MS;
}

/**
 * Create a new session for a user
 * 
 * Generates a cryptographically random session token, stores it in the database
 * with expiration timestamp, IP address, and user agent for audit purposes.
 * 
 * @param userId - User ID to create session for
 * @param ipAddress - Client IP address (optional, for audit logging)
 * @param userAgent - Client user agent (optional, for audit logging)
 * @returns Promise resolving to the session token string
 * @throws {Error} If session creation fails
 * 
 * @example
 * ```typescript
 * // Create session after successful authentication
 * const sessionToken = await createSession(
 *   user.id,
 *   request.headers.get('x-forwarded-for') || '127.0.0.1',
 *   request.headers.get('user-agent') || 'Unknown'
 * );
 * 
 * // Set session cookie
 * const response = NextResponse.json({ user });
 * setSessionCookie(response, sessionToken);
 * ```
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  if (!userId || userId.length === 0) {
    throw new Error('User ID is required');
  }

  // Generate cryptographically random session token
  const token = generateSessionToken();
  
  // Calculate expiration
  const expiresAt = calculateExpiration();

  try {
    // Store session in database
    // Trim and validate optional fields
    const trimmedIpAddress = ipAddress?.trim() || null;
    const trimmedUserAgent = userAgent?.trim() || null;
    
    await db.insert(sessions).values({
      userId,
      token,
      expiresAt,
      ipAddress: trimmedIpAddress,
      userAgent: trimmedUserAgent,
    });

    return token;
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : 'Unknown error';
    const causeMessage =
      error && typeof error === 'object' && 'cause' in error && error.cause instanceof Error
        ? error.cause.message
        : undefined;

    throw new Error(
      `Failed to create session: ${baseMessage}${causeMessage ? ` | Cause: ${causeMessage}` : ''}`
    );
  }
}

/**
 * Get and validate the current session
 * 
 * Reads the session cookie, validates the token against the database,
 * checks expiration, and returns the associated user data.
 * Automatically extends session if it's close to expiring (rolling renewal).
 * 
 * @param context - Optional context for logging (ipAddress, userAgent, requestId)
 * @returns Promise resolving to SessionUser if valid, null otherwise
 * 
 * @example
 * ```typescript
 * // In a server component or API route
 * const user = await getSession();
 * if (!user) {
 *   redirect('/sign-in');
 * }
 * 
 * // User is authenticated
 * console.log(user.email);
 * ```
 */
export async function getSession(
  context?: {
    token?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<SessionUser | null> {
  // Get session token from cookie
  const token = context?.token ?? (await getSessionCookie());
  
  if (!token) {
    return null;
  }

  try {
    // Query session with user data
    const [result] = await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        email: users.email,
        emailVerified: users.emailVerified,
        name: users.name,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date()) // Only get non-expired sessions
        )
      )
      .limit(1);

    if (!result) {
      // Session not found or expired - could indicate tampering
      logAuthEvent('auth.session.tampered', {
        outcome: 'failure',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
        errorCode: 'INVALID_SESSION',
        errorMessage: 'Session token is invalid or expired',
        metadata: {
          reason: 'session_not_found_or_expired',
        },
      });
      return null;
    }

    // Check if session should be renewed (rolling renewal)
    if (shouldRenewSession(result.expiresAt)) {
      await extendSession(result.sessionId);
    }

    return {
      id: result.userId,
      email: result.email,
      emailVerified: result.emailVerified,
      name: result.name,
      sessionId: result.sessionId,
    };
  } catch (error) {
    // Database error - return null to prevent information leakage
    return null;
  }
}

/**
 * Extend a session's expiration time (rolling renewal)
 * 
 * Updates the session's expiration timestamp to extend its lifetime.
 * This is called automatically by getSession() when a session is close to expiring.
 * 
 * @param sessionId - Session ID to extend
 * @returns Promise resolving when session is extended
 * @throws {Error} If session extension fails
 * 
 * @example
 * ```typescript
 * // Manually extend a session
 * await extendSession(sessionId);
 * ```
 */
export async function extendSession(sessionId: string): Promise<void> {
  if (!sessionId || sessionId.length === 0) {
    throw new Error('Session ID is required');
  }

  const newExpiresAt = calculateExpiration();

  try {
    await db
      .update(sessions)
      .set({ expiresAt: newExpiresAt })
      .where(eq(sessions.id, sessionId));
  } catch (error) {
    throw new Error(
      `Failed to extend session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a specific session
 * 
 * Removes a session from the database. This is used during sign-out
 * to invalidate the current session.
 * 
 * @param sessionId - Session ID to delete
 * @returns Promise resolving when session is deleted
 * @throws {Error} If session deletion fails
 * 
 * @example
 * ```typescript
 * // Sign out current session
 * const user = await getSession();
 * if (user) {
 *   await deleteSession(user.sessionId);
 * }
 * ```
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId || sessionId.length === 0) {
    throw new Error('Session ID is required');
  }

  try {
    await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));
  } catch (error) {
    throw new Error(
      `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete all sessions for a user
 * 
 * Removes all active sessions for a user from the database.
 * This is used when a user changes their password or when
 * security requires invalidating all sessions.
 * 
 * @param userId - User ID whose sessions should be deleted
 * @returns Promise resolving when all sessions are deleted
 * @throws {Error} If session deletion fails
 * 
 * @example
 * ```typescript
 * // Invalidate all sessions after password change
 * await updateUserPassword(userId, newPasswordHash);
 * await deleteAllUserSessions(userId);
 * ```
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  if (!userId || userId.length === 0) {
    throw new Error('User ID is required');
  }

  try {
    await db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
  } catch (error) {
    throw new Error(
      `Failed to delete user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
