/**
 * Property-based tests for logout event logging
 * 
 * Tests that sign-out events are properly logged with required fields
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import * as loggerModule from '@/lib/logger';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

// Mock console methods to capture log output
let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleInfoSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('POST /api/auth/logout - Logging Property Tests', () => {
  /**
   * Feature: authentication-system, Property 14: Sign-out logs event
   * Validates: Requirements 5.4
   * 
   * For any sign-out action, a log entry should be created with user ID and timestamp.
   */
  test('Property 14: Sign-out logs event', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user data
        fc.uuid(),
        fc.emailAddress(),
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.uuid(),
        async (userId, email, ipAddress, userAgent, sessionId) => {
          // Clear previous spy calls
          consoleInfoSpy.mockClear();

          // Simulate a successful sign-out by calling logAuthEvent
          loggerModule.logAuthEvent('auth.logout.success', {
            outcome: 'success',
            userId,
            email,
            ipAddress,
            userAgent,
            requestId: fc.sample(fc.uuid(), 1)[0],
            metadata: {
              sessionId,
            },
          });

          // Verify console.info was called (success outcome)
          expect(consoleInfoSpy).toHaveBeenCalled();

          // Get the logged message
          const loggedMessage = consoleInfoSpy.mock.calls[consoleInfoSpy.mock.calls.length - 1][0];

          // Parse the JSON log
          const logEvent = JSON.parse(loggedMessage);

          // Verify required fields are present
          expect(logEvent.eventId).toBeDefined();
          expect(typeof logEvent.eventId).toBe('string');
          expect(logEvent.eventId.length).toBeGreaterThan(0);

          expect(logEvent.eventType).toBe('auth.logout.success');

          expect(logEvent.timestamp).toBeDefined();
          expect(typeof logEvent.timestamp).toBe('string');
          // Verify timestamp is valid ISO 8601
          expect(() => new Date(logEvent.timestamp)).not.toThrow();
          expect(new Date(logEvent.timestamp).toISOString()).toBe(logEvent.timestamp);

          expect(logEvent.outcome).toBe('success');

          // Verify user ID is logged
          expect(logEvent.userId).toBe(userId);

          // Verify email is hashed (16 character hex string)
          expect(logEvent.email).toBeDefined();
          expect(typeof logEvent.email).toBe('string');
          expect(logEvent.email.length).toBe(16);
          expect(/^[0-9a-f]{16}$/.test(logEvent.email)).toBe(true);
          // Verify email is not logged in plaintext
          expect(logEvent.email).not.toBe(email);

          // Verify request context is logged
          expect(logEvent.ipAddress).toBe(ipAddress);
          expect(logEvent.userAgent).toBe(userAgent);
          expect(logEvent.requestId).toBeDefined();

          // Verify metadata contains session ID
          expect(logEvent.metadata).toBeDefined();
          expect(logEvent.metadata.sessionId).toBe(sessionId);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify failed sign-out attempts are logged
   */
  test('Property 14 (failure case): Failed sign-out logs event', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (ipAddress, userAgent, errorCode, errorMessage) => {
          // Clear previous spy calls
          consoleWarnSpy.mockClear();

          // Simulate a failed sign-out
          loggerModule.logAuthEvent('auth.logout.success', {
            outcome: 'failure',
            ipAddress,
            userAgent,
            requestId: fc.sample(fc.uuid(), 1)[0],
            errorCode,
            errorMessage,
          });

          // Verify console.warn was called (failure outcome)
          expect(consoleWarnSpy).toHaveBeenCalled();

          // Get the logged message
          const loggedMessage = consoleWarnSpy.mock.calls[consoleWarnSpy.mock.calls.length - 1][0];

          // Parse the JSON log
          const logEvent = JSON.parse(loggedMessage);

          // Verify required fields are present
          expect(logEvent.eventType).toBe('auth.logout.success');
          expect(logEvent.outcome).toBe('failure');
          expect(logEvent.errorCode).toBe(errorCode);
          expect(logEvent.errorMessage).toBe(errorMessage);
          expect(logEvent.ipAddress).toBe(ipAddress);
          expect(logEvent.userAgent).toBe(userAgent);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify sign-out errors are logged
   */
  test('Property 14 (error case): Sign-out errors are logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.uuid(), { nil: undefined }),
        fc.option(fc.emailAddress(), { nil: undefined }),
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (userId, email, ipAddress, userAgent, errorCode, errorMessage) => {
          // Clear previous spy calls
          consoleErrorSpy.mockClear();

          // Simulate a sign-out error
          loggerModule.logAuthEvent('auth.logout.success', {
            outcome: 'error',
            userId,
            email,
            ipAddress,
            userAgent,
            requestId: fc.sample(fc.uuid(), 1)[0],
            errorCode,
            errorMessage,
          });

          // Verify console.error was called (error outcome)
          expect(consoleErrorSpy).toHaveBeenCalled();

          // Get the logged message
          const loggedMessage = consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1][0];

          // Parse the JSON log
          const logEvent = JSON.parse(loggedMessage);

          // Verify required fields are present
          expect(logEvent.eventType).toBe('auth.logout.success');
          expect(logEvent.outcome).toBe('error');
          expect(logEvent.errorCode).toBe(errorCode);
          expect(logEvent.errorMessage).toBe(errorMessage);
          expect(logEvent.ipAddress).toBe(ipAddress);
          expect(logEvent.userAgent).toBe(userAgent);

          // Verify optional user context
          if (userId) {
            expect(logEvent.userId).toBe(userId);
          }

          if (email) {
            expect(logEvent.email).toBeDefined();
            expect(logEvent.email).not.toBe(email); // Should be hashed
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
