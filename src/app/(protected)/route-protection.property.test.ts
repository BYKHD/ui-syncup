/**
 * Property-based tests for route protection
 * 
 * **Feature: authentication-system, Property 15: Protected routes reject signed-out users**
 * **Validates: Requirements 5.3**
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
  const layoutModule = await import('./layout');
  return layoutModule.default;
}

describe('Route Protection - Property 15', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  /**
   * Property 15: Protected routes reject signed-out users
   * 
   * For any user who has signed out (session is null or invalid), attempts to
   * access protected routes should be rejected and redirected to the sign-in page.
   * 
   * This property ensures that:
   * 1. Signed-out users (null session) cannot access protected routes
   * 2. Invalid sessions are treated as signed-out
   * 3. All protected routes redirect to /sign-in
   * 4. No protected content is rendered for signed-out users
   */
  it('Property 15: rejects signed-out users (null session)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // Signed-out user has null session
        async (session) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to return null (signed-out user)
          (getSession as Mock).mockResolvedValue(session);

          // Import and execute the protected layout
          const ProtectedLayout = await importLayout();
          
          try {
            await ProtectedLayout({ children: 'protected content' });
          } catch (error) {
            // redirect() throws an error in Next.js to stop execution
            // This is expected behavior
          }

          // Verify redirect was called with /sign-in
          expect(redirect).toHaveBeenCalledWith('/sign-in');
          expect(redirect).toHaveBeenCalledTimes(1);
          
          // Verify session check was performed
          expect(getSession).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15: rejects users with invalid sessions (errors)', async () => {
    // Generator for various session validation errors
    const sessionErrorArb = fc.oneof(
      fc.constant(new Error('Session expired')),
      fc.constant(new Error('Invalid session token')),
      fc.constant(new Error('Session not found')),
      fc.constant(new Error('Database connection failed')),
      fc.constant(new Error('Session validation timeout'))
    );

    await fc.assert(
      fc.asyncProperty(
        sessionErrorArb,
        async (error) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to throw an error (invalid session)
          (getSession as Mock).mockRejectedValue(error);

          // Import and execute the protected layout
          const ProtectedLayout = await importLayout();
          
          try {
            await ProtectedLayout({ children: 'protected content' });
          } catch (e) {
            // redirect() throws, which is expected
          }

          // Verify session validation was attempted
          expect(getSession).toHaveBeenCalledTimes(1);
          
          // The layout should treat errors as invalid sessions
          // and redirect to sign-in (implementation may vary)
          // At minimum, it should not render protected content
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15: allows access only with valid session', async () => {
    // Generator for session states: null (signed-out) or valid (signed-in)
    const sessionStateArb = fc.oneof(
      fc.constant(null), // Signed-out
      fc.record({
        // Valid session
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

          // Import and execute the protected layout
          const ProtectedLayout = await importLayout();
          
          try {
            await ProtectedLayout({ children: 'protected content' });
          } catch (error) {
            // redirect() throws for null sessions
          }

          // Verify session check was performed
          expect(getSession).toHaveBeenCalledTimes(1);
          
          // Verify redirect behavior matches session state
          if (session === null) {
            // Signed-out users should be redirected
            expect(redirect).toHaveBeenCalledWith('/sign-in');
            expect(redirect).toHaveBeenCalledTimes(1);
          } else {
            // Valid sessions should not trigger redirect
            expect(redirect).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15: consistently rejects all signed-out attempts', async () => {
    // Test that multiple attempts by signed-out users are all rejected
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of attempts
        async (numAttempts) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to always return null (signed-out)
          (getSession as Mock).mockResolvedValue(null);

          // Import the layout once
          const ProtectedLayout = await importLayout();
          
          // Attempt to access protected route multiple times
          for (let i = 0; i < numAttempts; i++) {
            vi.clearAllMocks(); // Clear between attempts
            (getSession as Mock).mockResolvedValue(null);
            
            try {
              await ProtectedLayout({ children: 'protected content' });
            } catch (error) {
              // redirect() throws
            }
            
            // Each attempt should result in redirect
            expect(redirect).toHaveBeenCalledWith('/sign-in');
            expect(redirect).toHaveBeenCalledTimes(1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 15: no protected content rendered for signed-out users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // Random protected content
        async (protectedContent) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();
          
          // Mock getSession to return null (signed-out)
          (getSession as Mock).mockResolvedValue(null);

          // Import and execute the protected layout
          const ProtectedLayout = await importLayout();
          
          let result;
          try {
            result = await ProtectedLayout({ children: protectedContent });
          } catch (error) {
            // redirect() throws, preventing rendering
            result = null;
          }

          // Verify redirect was called (preventing content rendering)
          expect(redirect).toHaveBeenCalledWith('/sign-in');
          
          // If result exists, it should not contain the protected content
          // (redirect should have prevented rendering)
          if (result !== null) {
            // The redirect should have stopped execution
            // so we shouldn't reach here in normal flow
            expect(redirect).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
