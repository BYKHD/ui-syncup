/**
 * Session management utilities
 * 
 * This module provides session management via better-auth.
 * All session validation is now handled by better-auth's built-in
 * session API, providing a single source of truth for auth state.
 * 
 * Security features:
 * - better-auth handles session token generation
 * - Session validation via better-auth API
 * - Secure session deletion
 * - Multi-device session support
 * 
 * @module server/auth/session
 * 
 * @deprecated createSession is deprecated - use better-auth's signIn.email instead.
 * The createSession function is kept for backwards compatibility with
 * legacy routes and tests. New code should use authClient.signIn.email.
 */

import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

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
  image?: string | null;
  hasPassword?: boolean;
  sessionId: string;
  lastActiveTeamId?: string | null;
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

  // Generate cryptographically random session token (alphanumeric, 32 chars)
  // better-auth uses randomString(32) which includes A-Z, a-z, 0-9
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  // Use randomBytes to get random indices to avoid Math.random() bias if possible, 
  // but for tests Math.random is sufficient. 
  // However, let's be robust using randomBytes.
  const bytes = randomBytes(32);
  for (let i = 0; i < 32; i++) {
    token += chars[bytes[i] % chars.length];
  }
  
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
 * This function supports both better-auth OAuth sessions and custom session tokens.
 * It first tries to validate using better-auth's session API (for OAuth logins),
 * then falls back to custom session token lookup (for email/password logins).
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
  // Use better-auth's session validation for all auth methods
  // Both OAuth and email/password now use better-auth sessions
  try {
    const { auth } = await import('@/lib/auth');
    const { headers } = await import('next/headers');
    
    const headersList = await headers();
    
    // Create a new Headers object to avoid modifying the read-only headers
    const requestHeaders = new Headers(headersList);
    
    // If a token is explicitly provided (e.g. in tests), set it as a cookie
    if (context?.token) {
      requestHeaders.set('Cookie', `better-auth.session_token=${context.token}`);
    }
    
    // Convert Headers to plain object as better-auth might expect that for internal API calls
    const headersObj: Record<string, string> = {
      // Ensure Origin and Host are present for better-auth validation
      'origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'host': 'localhost:3000',
    };
    
    requestHeaders.forEach((value, key) => {
      headersObj[key] = value;
    });
    
    // Explicitly set the cookie again in the plain object to be sure
    if (context?.token) {
      headersObj['cookie'] = `better-auth.session_token=${context.token}`;
      // Also trying upper case Cookie just in case
      headersObj['Cookie'] = `better-auth.session_token=${context.token}`;
    }
    
    const betterAuthSession = await auth.api.getSession({
      headers: headersObj,
    });
    
    if (betterAuthSession?.user) {
      return {
        id: betterAuthSession.user.id,
        email: betterAuthSession.user.email,
        emailVerified: betterAuthSession.user.emailVerified,
        name: betterAuthSession.user.name,
        image: betterAuthSession.user.image ?? null,
        sessionId: betterAuthSession.session.id,
        ...(await (async () => {
          try {
            const dbUser = await db.query.users.findFirst({
              where: (users, { eq }) => eq(users.id, betterAuthSession.user.id),
              columns: { passwordHash: true, lastActiveTeamId: true },
            });
            return {
              hasPassword: !!dbUser?.passwordHash,
              lastActiveTeamId: dbUser?.lastActiveTeamId ?? null,
            };
          } catch {
            return { hasPassword: false, lastActiveTeamId: null };
          }
        })()),
      };
    }
    
    // Fallback: Check for custom session token (used by admin setup wizard)
    // This handles the case where admin account was created with createSession()
    // which sets the session_token cookie, not better-auth.session_token
    const { getSessionCookie } = await import('@/server/auth/cookies');
    const customToken = await getSessionCookie();
    
    if (customToken) {
      // Look up the session in our sessions table
      const sessionRecord = await db.query.sessions.findFirst({
        where: (s, { eq, and, gt }) => and(
          eq(s.token, customToken),
          gt(s.expiresAt, new Date())
        ),
      });
      
      if (sessionRecord) {
        // Get the user data
        const user = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, sessionRecord.userId),
        });
        
        if (user) {
          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            image: user.image ?? null,
            sessionId: sessionRecord.id,
            hasPassword: !!user.passwordHash,
            lastActiveTeamId: user.lastActiveTeamId ?? null,
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    // Log session errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[getSession] Error:', error);
    }
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
