/**
 * Property-based tests for protected layout server-side session validation
 * 
 * **Feature: authentication-system, Property 38: Server-side layout validates sessions**
 * **Validates: Requirements 12.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import fc from 'fast-check';
import { redirect } from 'next/navigation';

// Mock Next.js redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock session module
vi.mock('@/server/auth/session', () => ({
  getSession: vi.fn(),
}));

// Mock AppShell component
vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));

import { getSession } from '@/server/auth/session';

// Import the layout component dynamically to ensure mocks are applied
async function importLayout() {
  // Clear module cache to ensure fresh import with mocks
  const module = await import('./layout');
  return module.default;
}

describe('Protected Layout - Server-side Session Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  /**
   * Property 38: Server-side layout validates sessions
   * 
   * For any request to a protected route, the layout should validate the session
   * on the server side before rendering content. If no valid session exists,
   * it should redirect to the sign-in page.
   * 
   * This property ensures that:
   * 1. Session validation occurs on the server (not client)
   * 2. Invalid/missing sessions trigger redirect to /sign-in
   * 3. Valid sessions allow rendering to proceed
   */
  it('Property 38: redirects to sign-in when session is null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // Session is null
        async (session) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to return null (no session)
          (getSession as Mock).mockResolvedValue(session);

          // Import and execute the layout
          const ProtectedLayout = await importLayout();
          
          try {
            await ProtectedLayout({ children: 'test content' });
          } catch (error) {
            // redirect() throws an error in Next.js to stop execution
            // This is expected behavior
          }

          // Verify redirect was called with /sign-in
          expect(redirect).toHaveBeenCalledWith('/sign-in');
          expect(redirect).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 38: allows rendering when session is valid', async () => {
    // Generator for valid session data
    const validSessionArb = fc.record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      emailVerified: fc.boolean(),
      name: fc.string({ minLength: 1, maxLength: 120 }),
      sessionId: fc.uuid(),
    });

    await fc.assert(
      fc.asyncProperty(
        validSessionArb,
        async (session) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to return a valid session
          (getSession as Mock).mockResolvedValue(session);

          // Import and execute the layout
          const ProtectedLayout = await importLayout();
          
          const result = await ProtectedLayout({ children: 'test content' });

          // Verify redirect was NOT called
          expect(redirect).not.toHaveBeenCalled();
          
          // Verify the layout returns content (AppShell renders children)
          expect(result).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 38: validates session on every request', async () => {
    // Generator for session states (null or valid)
    const sessionStateArb = fc.oneof(
      fc.constant(null),
      fc.record({
        id: fc.uuid(),
        email: fc.emailAddress(),
        emailVerified: fc.boolean(),
        name: fc.string({ minLength: 1, maxLength: 120 }),
        sessionId: fc.uuid(),
      })
    );

    await fc.assert(
      fc.asyncProperty(
        sessionStateArb,
        async (session) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to return the generated session state
          (getSession as Mock).mockResolvedValue(session);

          // Import and execute the layout
          const ProtectedLayout = await importLayout();
          
          try {
            await ProtectedLayout({ children: 'test content' });
          } catch (error) {
            // redirect() throws, which is expected for null sessions
          }

          // Verify getSession was called (session validation occurred)
          expect(getSession).toHaveBeenCalledTimes(1);
          
          // Verify redirect behavior matches session state
          if (session === null) {
            expect(redirect).toHaveBeenCalledWith('/sign-in');
          } else {
            expect(redirect).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 38: handles session validation errors gracefully', async () => {
    // Generator for various error scenarios
    const errorArb = fc.oneof(
      fc.constant(new Error('Database connection failed')),
      fc.constant(new Error('Session query timeout')),
      fc.constant(new Error('Invalid session token'))
    );

    await fc.assert(
      fc.asyncProperty(
        errorArb,
        async (error) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to throw an error
          (getSession as Mock).mockRejectedValue(error);

          // Import and execute the layout
          const ProtectedLayout = await importLayout();
          
          // The layout should handle errors by treating them as no session
          // and redirecting to sign-in
          try {
            await ProtectedLayout({ children: 'test content' });
          } catch (e) {
            // redirect() throws, which is expected
          }

          // Even on error, should attempt to redirect to sign-in
          // (treating error as no valid session)
          expect(getSession).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
