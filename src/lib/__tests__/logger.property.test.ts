/**
 * Property-based tests for authentication event logging
 * 
 * Tests that auth events are logged with required fields and proper formatting
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { logAuthEvent, type AuthEventType, type AuthEventOutcome } from '../logger';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

// Mock console methods to capture log output
let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const getLastLogMessage = (spy: ReturnType<typeof vi.spyOn>) =>
  String(spy.mock.calls[spy.mock.calls.length - 1]?.[0] ?? '{}');

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

// Arbitraries for generating test data
const authEventTypeArb = fc.constantFrom<AuthEventType>(
  'auth.signup.attempt',
  'auth.signup.success',
  'auth.signup.failure',
  'auth.login.attempt',
  'auth.login.success',
  'auth.login.failure',
  'auth.logout.success',
  'auth.verify_email.attempt',
  'auth.verify_email.success',
  'auth.verify_email.failure',
  'auth.reset_password.request',
  'auth.reset_password.success',
  'auth.reset_password.failure',
  'auth.rate_limit.exceeded',
  'auth.token.tampered',
  'auth.session.tampered',
  'auth.reauth.required',
  'auth.reauth.failure',
  'email.queued',
  'email.sent',
  'email.failed',
  'email.retry'
);

const outcomeArb = fc.constantFrom<AuthEventOutcome>('success', 'failure', 'error');

const emailArb = fc.emailAddress();

const ipAddressArb = fc.ipV4();

const userAgentArb = fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0);

const uuidArb = fc.uuid();

describe('Authentication Event Logging - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 26: Auth events are logged with required fields
   * Validates: Requirements 8.4
   * 
   * For any authentication event (sign-in, sign-up, password reset), a log entry
   * should be created with timestamp, user ID, IP address, and outcome.
   */
  test('Property 26: Auth events are logged with required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        authEventTypeArb,
        outcomeArb,
        fc.option(uuidArb, { nil: undefined }),
        fc.option(emailArb, { nil: undefined }),
        fc.option(ipAddressArb, { nil: undefined }),
        fc.option(userAgentArb, { nil: undefined }),
        fc.option(uuidArb, { nil: undefined }),
        async (eventType, outcome, userId, email, ipAddress, userAgent, requestId) => {
          // Log the auth event
          logAuthEvent(eventType, {
            outcome,
            userId,
            email,
            ipAddress,
            userAgent,
            requestId,
          });

          // Determine which console method should have been called
          const expectedSpy =
            outcome === 'error' ? consoleErrorSpy :
            outcome === 'failure' ? consoleWarnSpy :
            consoleInfoSpy;

          // Verify the appropriate console method was called
          expect(expectedSpy).toHaveBeenCalled();

          // Get the logged message
          const loggedMessage = getLastLogMessage(expectedSpy);

          // Parse the JSON log
          const logEvent = JSON.parse(loggedMessage);

          // Verify required fields are present
          expect(logEvent.eventId).toBeDefined();
          expect(typeof logEvent.eventId).toBe('string');
          expect(logEvent.eventId.length).toBeGreaterThan(0);

          expect(logEvent.eventType).toBe(eventType);

          expect(logEvent.timestamp).toBeDefined();
          expect(typeof logEvent.timestamp).toBe('string');
          // Verify timestamp is valid ISO 8601
          expect(() => new Date(logEvent.timestamp)).not.toThrow();
          expect(new Date(logEvent.timestamp).toISOString()).toBe(logEvent.timestamp);

          expect(logEvent.outcome).toBe(outcome);

          // Verify optional fields are included when provided
          if (userId) {
            expect(logEvent.userId).toBe(userId);
          }

          if (email) {
            // Email should be hashed (16 character hex string)
            expect(logEvent.email).toBeDefined();
            expect(typeof logEvent.email).toBe('string');
            expect(logEvent.email.length).toBe(16);
            expect(/^[0-9a-f]{16}$/.test(logEvent.email)).toBe(true);
            // Verify email is not logged in plaintext
            expect(logEvent.email).not.toBe(email);
          }

          if (ipAddress) {
            expect(logEvent.ipAddress).toBe(ipAddress);
          }

          if (userAgent) {
            expect(logEvent.userAgent).toBe(userAgent);
          }

          if (requestId) {
            expect(logEvent.requestId).toBe(requestId);
          }

          // Reset spies for next iteration
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          consoleErrorSpy.mockClear();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify email hashing is consistent
   */
  test('Property 26 (email hashing): Same email produces same hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        authEventTypeArb,
        emailArb,
        async (eventType, email) => {
          // Log the same email twice
          logAuthEvent(eventType, {
            outcome: 'success',
            email,
          });

          const firstLog = JSON.parse(getLastLogMessage(consoleInfoSpy));
          const firstHash = firstLog.email;

          consoleInfoSpy.mockClear();

          logAuthEvent(eventType, {
            outcome: 'success',
            email,
          });

          const secondLog = JSON.parse(getLastLogMessage(consoleInfoSpy));
          const secondHash = secondLog.email;

          // Verify hashes are identical
          expect(firstHash).toBe(secondHash);

          consoleInfoSpy.mockClear();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify email hashing is case-insensitive
   */
  test('Property 26 (email hashing): Email hashing is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        authEventTypeArb,
        emailArb,
        async (eventType, email) => {
          // Log with lowercase email
          logAuthEvent(eventType, {
            outcome: 'success',
            email: email.toLowerCase(),
          });

          const lowerLog = JSON.parse(getLastLogMessage(consoleInfoSpy));
          const lowerHash = lowerLog.email;

          consoleInfoSpy.mockClear();

          // Log with uppercase email
          logAuthEvent(eventType, {
            outcome: 'success',
            email: email.toUpperCase(),
          });

          const upperLog = JSON.parse(getLastLogMessage(consoleInfoSpy));
          const upperHash = upperLog.email;

          // Verify hashes are identical
          expect(lowerHash).toBe(upperHash);

          consoleInfoSpy.mockClear();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify error codes and messages are logged
   */
  test('Property 26 (error details): Error codes and messages are logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        authEventTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (eventType, errorCode, errorMessage) => {
          // Log event with error details
          logAuthEvent(eventType, {
            outcome: 'error',
            errorCode,
            errorMessage,
          });

          // Get the logged message
          const loggedMessage = getLastLogMessage(consoleErrorSpy);
          const logEvent = JSON.parse(loggedMessage);

          // Verify error details are present
          expect(logEvent.errorCode).toBe(errorCode);
          expect(logEvent.errorMessage).toBe(errorMessage);

          consoleErrorSpy.mockClear();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify metadata is logged
   */
  test('Property 26 (metadata): Additional metadata is logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        authEventTypeArb,
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean()
          )
        ),
        async (eventType, metadata) => {
          // Log event with metadata
          logAuthEvent(eventType, {
            outcome: 'success',
            metadata,
          });

          // Get the logged message
          const loggedMessage = getLastLogMessage(consoleInfoSpy);
          const logEvent = JSON.parse(loggedMessage);

          // Verify metadata is present
          if (Object.keys(metadata).length > 0) {
            expect(logEvent.metadata).toEqual(metadata);
          }

          consoleInfoSpy.mockClear();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Additional test: Verify log level is determined by outcome
   */
  test('Property 26 (log level): Log level matches outcome', async () => {
    await fc.assert(
      fc.asyncProperty(
        authEventTypeArb,
        outcomeArb,
        async (eventType, outcome) => {
          // Log event
          logAuthEvent(eventType, {
            outcome,
          });

          // Verify correct console method was called
          if (outcome === 'error') {
            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
          } else if (outcome === 'failure') {
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          } else {
            expect(consoleInfoSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }

          // Reset spies
          consoleInfoSpy.mockClear();
          consoleWarnSpy.mockClear();
          consoleErrorSpy.mockClear();
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
