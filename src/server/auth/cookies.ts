/**
 * Cookie management utilities for session handling
 * 
 * This module provides secure cookie operations for session management,
 * implementing security best practices including HTTP-only, Secure, and
 * SameSite attributes.
 * 
 * Security features:
 * - HTTP-only: Prevents JavaScript access to cookies
 * - Secure: Requires HTTPS in production
 * - SameSite=Lax: Prevents CSRF attacks while allowing normal navigation
 * - 7-day expiration: Balances security and user experience
 * 
 * @module server/auth/cookies
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { env, isProduction } from '@/lib/env';

/**
 * Cookie configuration constants
 */
const SESSION_COOKIE_NAME = 'session_token';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Cookie options for session cookies
 * Implements security best practices for session management
 */
const COOKIE_OPTIONS = {
  httpOnly: true,           // Prevent JavaScript access
  secure: isProduction(),   // Require HTTPS in production
  sameSite: 'lax' as const, // CSRF protection
  maxAge: SESSION_MAX_AGE,  // 7 days
  path: '/',                // Available across entire site
} as const;

/**
 * Sets a session cookie in the HTTP response
 * 
 * This function adds a session cookie to the response with secure attributes.
 * The cookie will be HTTP-only, Secure (in production), and use SameSite=Lax
 * to prevent CSRF attacks.
 * 
 * @param response - The NextResponse object to set the cookie on
 * @param sessionToken - The session token value to store
 * @returns The modified NextResponse object (for chaining)
 * 
 * @example
 * ```typescript
 * // In an API route handler
 * export async function POST(request: Request) {
 *   const session = await createSession(userId);
 *   const response = NextResponse.json({ success: true });
 *   return setSessionCookie(response, session.token);
 * }
 * ```
 */
export function setSessionCookie(
  response: NextResponse,
  sessionToken: string
): NextResponse {
  // Trim whitespace and validate
  const trimmedToken = sessionToken?.trim() ?? '';
  
  if (!trimmedToken || trimmedToken.length === 0) {
    throw new Error('Session token cannot be empty');
  }

  response.cookies.set(SESSION_COOKIE_NAME, trimmedToken, COOKIE_OPTIONS);
  
  return response;
}

/**
 * Gets the session cookie value from the current request
 * 
 * This function reads the session cookie from the incoming request.
 * It should be called from server components or API routes.
 * 
 * @returns The session token string if present, null otherwise
 * 
 * @example
 * ```typescript
 * // In a server component or API route
 * const sessionToken = getSessionCookie();
 * if (!sessionToken) {
 *   redirect('/sign-in');
 * }
 * ```
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  return sessionCookie?.value ?? null;
}

/**
 * Clears the session cookie from the HTTP response
 * 
 * This function removes the session cookie by setting it with an expired
 * date and empty value. This is used during sign-out to invalidate the
 * client-side session.
 * 
 * @param response - The NextResponse object to clear the cookie from
 * @returns The modified NextResponse object (for chaining)
 * 
 * @example
 * ```typescript
 * // In a sign-out API route
 * export async function POST(request: Request) {
 *   await deleteSession(sessionId);
 *   const response = NextResponse.json({ message: 'Signed out successfully' });
 *   return clearSessionCookie(response);
 * }
 * ```
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: 0,        // Expire immediately
    path: '/',
  });
  
  return response;
}

/**
 * Gets the session cookie name
 * Useful for testing and debugging
 * 
 * @returns The name of the session cookie
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

/**
 * Gets the session cookie max age in seconds
 * Useful for session expiration calculations
 * 
 * @returns The max age of session cookies in seconds (7 days)
 */
export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

/**
 * Gets the team ID from the cookie
 * 
 * @returns The team ID string if present, null otherwise
 */
export async function getTeamIdCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const teamIdCookie = cookieStore.get('team_id');
  
  return teamIdCookie?.value ?? null;
}
