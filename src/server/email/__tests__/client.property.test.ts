/**
 * Property-based tests: Provider Selection Determinism
 *
 * Feature: smtp-fallback, Property 1: Provider Selection Determinism
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * Property: For any valid combination of environment variables,
 * resolveProvider() consistently returns the highest-priority configured
 * provider (ResendProvider > SmtpProvider > ConsoleProvider/Exception).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module-under-test is imported
// ---------------------------------------------------------------------------

// Mock logger to prevent console noise
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock Resend SDK — provider constructor will call `new Resend()`
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: 'mock' }, error: null }) },
  })),
}));

// Mock nodemailer — provider constructor will call `createTransport()`
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'mock' }),
    }),
  },
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'mock' }),
  }),
}));

// We'll dynamically mock @/lib/env per test case
vi.mock('@/lib/env', () => ({
  env: {},
}));

// Mock @/lib/resend (for ConsoleProvider's DEFAULT_SENDER)
vi.mock('@/lib/resend', () => ({
  isEmailConfigured: vi.fn().mockReturnValue(false),
  DEFAULT_SENDER: 'noreply@localhost',
  resend: null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimum SMTP env set */
const SMTP_ENV = {
  SMTP_HOST: 'mail.example.com',
  SMTP_PORT: 587,
  SMTP_USER: 'user@example.com',
  SMTP_PASSWORD: 's3cr3t',
  SMTP_FROM_EMAIL: 'noreply@example.com',
  SMTP_SECURE: 'false',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// NOTE: We use constructor.name checks instead of instanceof because
// vi.resetModules() / vi.doMock() creates new module instances, making
// the provider class imported at test-file scope a different constructor
// than the one returned by the dynamically imported resolveProvider().

describe('Property 1: Provider Selection Determinism (smtp-fallback)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /**
   * P1a: When RESEND_API_KEY is present, resolveProvider() MUST return
   * a ResendProvider regardless of whether SMTP is also configured.
   */
  it('P1a: should return ResendProvider when RESEND_API_KEY is set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // whether SMTP is also configured
        async (hasSmtp) => {
          vi.resetModules();

          const mockEnv: Record<string, unknown> = {
            RESEND_API_KEY: 're_test_key_123',
            RESEND_FROM_EMAIL: 'sender@example.com',
            NODE_ENV: 'development',
          };

          if (hasSmtp) {
            Object.assign(mockEnv, SMTP_ENV);
          }

          vi.doMock('@/lib/env', () => ({ env: mockEnv }));

          const { resolveProvider } = await import('../client');
          const provider = resolveProvider();
          expect(provider.constructor.name).toBe('ResendProvider');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * P1b: When RESEND_API_KEY is absent and SMTP_HOST is present,
   * resolveProvider() MUST return SmtpProvider.
   */
  it('P1b: should return SmtpProvider when only SMTP is configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          vi.resetModules();

          const mockEnv: Record<string, unknown> = {
            NODE_ENV: 'development',
            ...SMTP_ENV,
          };

          vi.doMock('@/lib/env', () => ({ env: mockEnv }));

          const { resolveProvider } = await import('../client');
          const provider = resolveProvider();
          expect(provider.constructor.name).toBe('SmtpProvider');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * P1c: When neither Resend nor SMTP is configured and the environment
   * is NOT production-like, resolveProvider() MUST return ConsoleProvider.
   */
  it('P1c: should return ConsoleProvider in development when nothing configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('development', 'test'),
        async (nodeEnv) => {
          vi.resetModules();

          const mockEnv: Record<string, unknown> = {
            NODE_ENV: nodeEnv,
          };

          vi.doMock('@/lib/env', () => ({ env: mockEnv }));

          const { resolveProvider } = await import('../client');
          const provider = resolveProvider();
          expect(provider.constructor.name).toBe('ConsoleProvider');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * P1d: When neither Resend nor SMTP is configured and the environment
   * IS production-like, resolveProvider() MUST throw.
   */
  it('P1d: should throw in production when nothing configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { NODE_ENV: 'production' },
          { NODE_ENV: 'development', VERCEL_ENV: 'production' },
          { NODE_ENV: 'development', VERCEL_ENV: 'preview' },
        ),
        async (envFlags) => {
          vi.resetModules();

          const mockEnv: Record<string, unknown> = {
            ...envFlags,
          };

          vi.doMock('@/lib/env', () => ({ env: mockEnv }));

          const { resolveProvider } = await import('../client');
          expect(() => resolveProvider()).toThrow(
            'Email service is not configured.',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * P1e: When both Resend and SMTP are configured, Resend MUST take priority.
   * (Explicit test for Requirement 1.3)
   */
  it('P1e: should prioritize Resend over SMTP when both configured', async () => {
    vi.resetModules();

    const mockEnv: Record<string, unknown> = {
      RESEND_API_KEY: 're_test_key_123',
      RESEND_FROM_EMAIL: 'resend@example.com',
      NODE_ENV: 'production',
      ...SMTP_ENV,
    };

    vi.doMock('@/lib/env', () => ({ env: mockEnv }));

    const { resolveProvider } = await import('../client');
    const provider = resolveProvider();
    expect(provider.constructor.name).toBe('ResendProvider');
  });
});
