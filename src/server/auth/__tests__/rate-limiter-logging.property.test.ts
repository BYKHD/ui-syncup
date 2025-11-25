/**
 * Property-based tests for rate limit violation logging
 * 
 * Tests that rate limit violations are properly logged with required fields
 * using property-based testing with fast-check.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { checkLimit, clearAllLimits } from '../rate-limiter';
import * as loggerModule from '@/lib/logger';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

// Mock console methods to capture log output
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

const getLastLogMessage = (spy: ReturnType<typeof vi.spyOn>) =>
  String(spy.mock.calls[spy.mock.calls.length - 1]?.[0] ?? '{}');

beforeEach(async () => {
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  // Clear all rate limits before each test
  await clearAllLimits();
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
});

describe('Rate Limiter - Logging Property Tests', () => {
  /**
   * Feature: authentication-system, Property 37: Rate limit violations are logged
   * Validates: Requirements 11.5
   * 
   * For any rate limit violation, a log entry should be created with IP address,
   * email (if provided), and timestamp.
   */
  test('Property 37: Rate limit violations are logged', async () => {
    // Spy on logAuthEvent
    const logAuthEventSpy = vi.spyOn(loggerModule, 'logAuthEvent');

    await fc.assert(
      fc.asyncProperty(
        // Generate random rate limit parameters
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 60000 }),
        fc.ipV4(),
        fc.option(fc.emailAddress(), { nil: undefined }),
        fc.uuid(),
        async (key, limit, windowMs, ipAddress, email, requestId) => {
          // Clear previous spy calls
          logAuthEventSpy.mockClear();
          consoleWarnSpy.mockClear();

          // Make requests up to the limit
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs, {
              ipAddress,
              email,
              requestId,
            });
            expect(allowed).toBe(true);
          }

          // Verify no violations logged yet
          const violationCallsBefore = logAuthEventSpy.mock.calls.filter(
            call => call[0] === 'auth.rate_limit.exceeded'
          );
          expect(violationCallsBefore.length).toBe(0);

          // Make one more request to exceed the limit
          const allowed = await checkLimit(key, limit, windowMs, {
            ipAddress,
            email,
            requestId,
          });
          expect(allowed).toBe(false);

          // Verify logAuthEvent was called for the violation
          expect(logAuthEventSpy).toHaveBeenCalled();

          // Find the rate limit violation log call
          const violationLogCall = logAuthEventSpy.mock.calls.find(
            call => call[0] === 'auth.rate_limit.exceeded'
          );

          expect(violationLogCall).toBeDefined();

          if (violationLogCall) {
            const [eventType, context] = violationLogCall;

            // Verify event type
            expect(eventType).toBe('auth.rate_limit.exceeded');

            // Verify outcome
            expect(context.outcome).toBe('failure');

            // Verify IP address is logged
            expect(context.ipAddress).toBe(ipAddress);

            // Verify email is logged if provided
            if (email) {
              expect(context.email).toBe(email);
            }

            // Verify request ID is logged
            expect(context.requestId).toBe(requestId);

            // Verify metadata contains rate limit details
            expect(context.metadata).toBeDefined();
            expect(context.metadata?.key).toBe(key);
            expect(context.metadata?.limit).toBe(limit);
            expect(context.metadata?.windowMs).toBe(windowMs);
            expect(context.metadata?.count).toBeGreaterThanOrEqual(limit);
            expect(context.metadata?.resetAt).toBeDefined();
            expect(typeof context.metadata?.resetAt).toBe('string');
            // Verify resetAt is a valid ISO 8601 timestamp
            expect(() => new Date(context.metadata?.resetAt as string)).not.toThrow();
          }

          // Verify console.warn was called (failure outcome)
          expect(consoleWarnSpy).toHaveBeenCalled();

          // Get the logged message
          const loggedMessage = getLastLogMessage(consoleWarnSpy);

          // Parse the JSON log
          const logEvent = JSON.parse(loggedMessage);

          // Verify the log event structure
          expect(logEvent.eventId).toBeDefined();
          expect(logEvent.eventType).toBe('auth.rate_limit.exceeded');
          expect(logEvent.timestamp).toBeDefined();
          expect(logEvent.outcome).toBe('failure');

          // Clean up for next iteration
          await clearAllLimits();
        }
      ),
      PROPERTY_CONFIG
    );

    // Restore spy
    logAuthEventSpy.mockRestore();
  });

  /**
   * Additional test: Verify multiple violations are logged
   */
  test('Property 37 (multiple violations): Multiple violations are logged', async () => {
    // Spy on logAuthEvent
    const logAuthEventSpy = vi.spyOn(loggerModule, 'logAuthEvent');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1000, max: 60000 }),
        fc.integer({ min: 2, max: 10 }),
        fc.ipV4(),
        async (key, limit, windowMs, extraAttempts, ipAddress) => {
          // Clear previous spy calls
          logAuthEventSpy.mockClear();

          // Make requests up to the limit
          for (let i = 0; i < limit; i++) {
            await checkLimit(key, limit, windowMs, { ipAddress });
          }

          // Make multiple requests beyond the limit
          for (let i = 0; i < extraAttempts; i++) {
            const allowed = await checkLimit(key, limit, windowMs, { ipAddress });
            expect(allowed).toBe(false);
          }

          // Verify logAuthEvent was called for each violation
          const violationCalls = logAuthEventSpy.mock.calls.filter(
            call => call[0] === 'auth.rate_limit.exceeded'
          );

          expect(violationCalls.length).toBe(extraAttempts);

          // Verify each violation log has the correct structure
          for (const call of violationCalls) {
            const [eventType, context] = call;
            expect(eventType).toBe('auth.rate_limit.exceeded');
            expect(context.outcome).toBe('failure');
            expect(context.ipAddress).toBe(ipAddress);
            expect(context.metadata?.key).toBe(key);
          }

          // Clean up
          await clearAllLimits();
        }
      ),
      PROPERTY_CONFIG
    );

    // Restore spy
    logAuthEventSpy.mockRestore();
  });

  /**
   * Additional test: Verify violations without email are logged
   */
  test('Property 37 (no email): Violations without email are logged', async () => {
    // Spy on logAuthEvent
    const logAuthEventSpy = vi.spyOn(loggerModule, 'logAuthEvent');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1000, max: 60000 }),
        fc.ipV4(),
        async (key, limit, windowMs, ipAddress) => {
          // Clear previous spy calls
          logAuthEventSpy.mockClear();

          // Make requests up to the limit
          for (let i = 0; i < limit; i++) {
            await checkLimit(key, limit, windowMs, { ipAddress });
          }

          // Make one more request to exceed the limit (without email)
          const allowed = await checkLimit(key, limit, windowMs, { ipAddress });
          expect(allowed).toBe(false);

          // Verify logAuthEvent was called
          const violationLogCall = logAuthEventSpy.mock.calls.find(
            call => call[0] === 'auth.rate_limit.exceeded'
          );

          expect(violationLogCall).toBeDefined();

          if (violationLogCall) {
            const [, context] = violationLogCall;

            // Verify IP address is logged
            expect(context.ipAddress).toBe(ipAddress);

            // Verify email is undefined (not provided)
            expect(context.email).toBeUndefined();
          }

          // Clean up
          await clearAllLimits();
        }
      ),
      PROPERTY_CONFIG
    );

    // Restore spy
    logAuthEventSpy.mockRestore();
  });

  /**
   * Additional test: Verify violations with email are logged with hashed email
   */
  test('Property 37 (with email): Violations with email log hashed email', async () => {
    // Spy on logAuthEvent
    const logAuthEventSpy = vi.spyOn(loggerModule, 'logAuthEvent');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1000, max: 60000 }),
        fc.ipV4(),
        fc.emailAddress(),
        async (key, limit, windowMs, ipAddress, email) => {
          // Clear previous spy calls
          logAuthEventSpy.mockClear();
          consoleWarnSpy.mockClear();

          // Make requests up to the limit
          for (let i = 0; i < limit; i++) {
            await checkLimit(key, limit, windowMs, { ipAddress, email });
          }

          // Make one more request to exceed the limit (with email)
          const allowed = await checkLimit(key, limit, windowMs, { ipAddress, email });
          expect(allowed).toBe(false);

          // Get the logged message
          const loggedMessage = getLastLogMessage(consoleWarnSpy);
          const logEvent = JSON.parse(loggedMessage);

          // Verify email is hashed (16 character hex string)
          expect(logEvent.email).toBeDefined();
          expect(typeof logEvent.email).toBe('string');
          expect(logEvent.email.length).toBe(16);
          expect(/^[0-9a-f]{16}$/.test(logEvent.email)).toBe(true);
          // Verify email is not logged in plaintext
          expect(logEvent.email).not.toBe(email);

          // Clean up
          await clearAllLimits();
        }
      ),
      PROPERTY_CONFIG
    );

    // Restore spy
    logAuthEventSpy.mockRestore();
  });
});
