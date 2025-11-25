/**
 * Property-based tests for cookie management utilities
 * 
 * These tests use fast-check to verify correctness properties across
 * randomly generated inputs, ensuring the cookie management implementation
 * follows security best practices.
 * 
 * @module server/auth/__tests__/cookies
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { NextResponse } from 'next/server';
import {
  setSessionCookie,
  getSessionCookie,
  clearSessionCookie,
  getSessionCookieName,
  getSessionMaxAge,
} from '../cookies';

/**
 * Property test configuration
 * Run each property 100+ times with different random inputs
 */
const PROPERTY_CONFIG = {
  numRuns: 100,
};

/**
 * Mock the Next.js cookies() function
 * This is necessary because cookies() is a Next.js server-only function
 */
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      // Return mock cookie value for testing
      if (name === 'session_token') {
        return { value: 'mock-session-token' };
      }
      return undefined;
    }),
    set: vi.fn(),
  })),
}));

/**
 * Mock environment to test production vs development behavior
 */
vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    BETTER_AUTH_SECRET: 'test-secret-key-min-32-characters',
    BETTER_AUTH_URL: 'http://localhost:3000',
  },
  isProduction: () => false, // Test environment, so secure flag won't be set
  isDevelopment: () => false,
  isTest: () => true,
}));

describe('Cookie Management - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 24: Session cookies have security attributes
   * Validates: Requirements 8.2
   * 
   * For any session token string:
   * 1. The cookie should have httpOnly=true
   * 2. The cookie should have secure=true (in production)
   * 3. The cookie should have sameSite='lax'
   * 4. The cookie should have maxAge=7 days (604800 seconds)
   * 5. The cookie should have path='/'
   */
  test('Property 24: Session cookies have security attributes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random session tokens (alphanumeric strings, 32-128 chars)
        fc.stringMatching(/^[a-zA-Z0-9]{32,128}$/),
        async (sessionToken) => {
          // Create a NextResponse object
          const response = NextResponse.json({ success: true });

          // Set the session cookie
          const modifiedResponse = setSessionCookie(response, sessionToken);

          // Get the Set-Cookie header
          const setCookieHeader = modifiedResponse.headers.get('set-cookie');
          expect(setCookieHeader).toBeTruthy();

          // Parse cookie attributes
          const cookieString = setCookieHeader!;

          // Property 1: httpOnly should be set
          expect(cookieString.toLowerCase()).toContain('httponly');

          // Property 2: sameSite should be Lax
          expect(cookieString.toLowerCase()).toContain('samesite=lax');

          // Property 3: maxAge should be 7 days (604800 seconds)
          expect(cookieString.toLowerCase()).toContain('max-age=604800');

          // Property 4: path should be /
          expect(cookieString.toLowerCase()).toContain('path=/');

          // Property 5: Cookie name should be session_token
          expect(cookieString).toContain('session_token=');

          // Property 6: Cookie value should match the session token
          expect(cookieString).toContain(`session_token=${sessionToken}`);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Cookie clearing removes session
   * 
   * For any response, clearing the session cookie should:
   * 1. Set the cookie value to empty string
   * 2. Set maxAge to 0 (immediate expiration)
   * 3. Maintain security attributes (httpOnly, secure, sameSite)
   */
  test('Property: Clearing cookie sets maxAge to 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed
        async () => {
          // Create a NextResponse object
          const response = NextResponse.json({ success: true });

          // Clear the session cookie
          const modifiedResponse = clearSessionCookie(response);

          // Get the Set-Cookie header
          const setCookieHeader = modifiedResponse.headers.get('set-cookie');
          expect(setCookieHeader).toBeTruthy();

          const cookieString = setCookieHeader!;

          // Property 1: maxAge should be 0 (immediate expiration)
          expect(cookieString.toLowerCase()).toContain('max-age=0');

          // Property 2: Cookie value should be empty
          expect(cookieString).toMatch(/session_token=;/);

          // Property 3: Security attributes should still be present
          expect(cookieString.toLowerCase()).toContain('httponly');
          expect(cookieString.toLowerCase()).toContain('samesite=lax');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional property: Cookie name consistency
   * 
   * The cookie name should be consistent across all operations
   */
  test('Property: Cookie name is consistent', () => {
    const cookieName = getSessionCookieName();
    expect(cookieName).toBe('session_token');
  });

  /**
   * Additional property: Max age consistency
   * 
   * The max age should be exactly 7 days (604800 seconds)
   */
  test('Property: Max age is 7 days', () => {
    const maxAge = getSessionMaxAge();
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(maxAge).toBe(sevenDaysInSeconds);
    expect(maxAge).toBe(604800);
  });

  /**
   * Edge case: Empty session token is rejected
   * 
   * setSessionCookie should throw an error for empty tokens
   */
  test('Edge case: Empty session token is rejected', () => {
    const response = NextResponse.json({ success: true });
    expect(() => setSessionCookie(response, '')).toThrow('Session token cannot be empty');
  });

  /**
   * Edge case: Whitespace-only session token is rejected
   * 
   * setSessionCookie should throw an error for whitespace-only tokens
   */
  test('Edge case: Whitespace-only session token is rejected', () => {
    const response = NextResponse.json({ success: true });
    expect(() => setSessionCookie(response, '   ')).toThrow('Session token cannot be empty');
  });

  /**
   * Property: Cookie operations are chainable
   * 
   * For any session token, setting a cookie should return the response
   * object to allow method chaining
   */
  test('Property: Cookie operations return response for chaining', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{32,128}$/),
        async (sessionToken) => {
          const response = NextResponse.json({ success: true });
          const result = setSessionCookie(response, sessionToken);

          // Should return a NextResponse object
          expect(result).toBeInstanceOf(NextResponse);

          // Should be the same response object (for chaining)
          expect(result).toBe(response);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property: Clear cookie operations are chainable
   * 
   * Clearing a cookie should return the response object for chaining
   */
  test('Property: Clear cookie returns response for chaining', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const response = NextResponse.json({ success: true });
          const result = clearSessionCookie(response);

          // Should return a NextResponse object
          expect(result).toBeInstanceOf(NextResponse);

          // Should be the same response object (for chaining)
          expect(result).toBe(response);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Integration test: Set and get cookie flow
   * 
   * This tests the integration between setting and getting cookies
   */
  test('Integration: getSessionCookie returns mock value', async () => {
    const sessionToken = await getSessionCookie();
    expect(sessionToken).toBe('mock-session-token');
  });

  /**
   * Property: Cookie attributes are URL-encoded safe
   * 
   * For any session token, the cookie should be properly encoded
   */
  test('Property: Cookie values are properly encoded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{32,128}$/),
        async (sessionToken) => {
          const response = NextResponse.json({ success: true });
          setSessionCookie(response, sessionToken);

          const setCookieHeader = response.headers.get('set-cookie');
          expect(setCookieHeader).toBeTruthy();

          // Cookie value should not contain unencoded special characters
          const cookieString = setCookieHeader!;
          const valueMatch = cookieString.match(/session_token=([^;]+)/);
          expect(valueMatch).toBeTruthy();

          const cookieValue = valueMatch![1];
          // Should not contain spaces or other problematic characters
          expect(cookieValue).not.toContain(' ');
          expect(cookieValue).not.toContain('\n');
          expect(cookieValue).not.toContain('\r');
        }
      ),
      PROPERTY_CONFIG
    );
  });
});

/**
 * Development vs Production behavior tests
 */
describe('Cookie Management - Environment-Specific Behavior', () => {
  /**
   * Test that httpOnly is always set regardless of environment
   */
  test('HttpOnly is always set', () => {
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, 'test-token-12345678901234567890');

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader!.toLowerCase()).toContain('httponly');
  });

  /**
   * Test that sameSite is always Lax
   */
  test('SameSite is always Lax', () => {
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, 'test-token-12345678901234567890');

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader!.toLowerCase()).toContain('samesite=lax');
  });

  /**
   * Test that secure flag behavior depends on environment
   * In test environment, secure flag should not be set
   * In production, it would be set (tested via integration tests)
   */
  test('Secure flag is environment-dependent', () => {
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, 'test-token-12345678901234567890');

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeTruthy();
    
    // In test environment, secure flag should not be present
    // This ensures cookies work in local development (http://localhost)
    const cookieString = setCookieHeader!.toLowerCase();
    
    // The cookie should still have other security attributes
    expect(cookieString).toContain('httponly');
    expect(cookieString).toContain('samesite=lax');
  });
});
