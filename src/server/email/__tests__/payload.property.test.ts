/**
 * Property-based tests: Payload Parity
 *
 * Feature: smtp-fallback, Property 2: Payload Parity
 * Validates: Requirements 3.1
 *
 * Property: For any valid EmailJob structure and HTML literal,
 * dispatching via any EmailProvider implementation must submit
 * identical `to`, `subject`, and `html` parameters to the underlying
 * third-party driver (Resend SDK / Nodemailer).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock factories are hoisted to the top of the file,
// so we use vi.hoisted() to create spies that can be referenced inside them.
// ---------------------------------------------------------------------------

const { mockResendSend, mockSendMail } = vi.hoisted(() => ({
  mockResendSend: vi.fn().mockResolvedValue({ data: { id: 'r_123' }, error: null }),
  mockSendMail: vi.fn().mockResolvedValue({ messageId: 'smtp_123' }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({ sendMail: mockSendMail }),
  },
  createTransport: vi.fn().mockReturnValue({ sendMail: mockSendMail }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'resend@example.com',
    SMTP_HOST: 'mail.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user@example.com',
    SMTP_PASSWORD: 's3cr3t',
    SMTP_FROM_EMAIL: 'smtp@example.com',
    SMTP_SECURE: 'false',
  },
}));

vi.mock('@/lib/resend', () => ({
  isEmailConfigured: vi.fn().mockReturnValue(true),
  DEFAULT_SENDER: 'noreply@localhost',
  resend: null,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { ResendProvider } from '../providers/resend-provider';
import { SmtpProvider } from '../providers/smtp-provider';
import { ConsoleProvider } from '../providers/console-provider';
import type { EmailJob } from '../client';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a realistic EmailJob with random `to`, `subject` */
const emailJobArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  type: fc.constantFrom(
    'verification' as const,
    'password_reset' as const,
    'welcome' as const,
    'security_alert' as const,
  ),
  to: fc.emailAddress(),
  subject: fc.string({ minLength: 1, maxLength: 200 }),
  template: fc.constant({
    type: 'verification' as const,
    data: { name: 'Test', verificationUrl: 'https://example.com' },
  }),
  attempts: fc.nat({ max: 5 }),
  maxAttempts: fc.constant(4),
  createdAt: fc.constant(new Date().toISOString()),
  scheduledFor: fc.constant(new Date().toISOString()),
});

/** Generates an HTML string for the body */
const htmlArb = fc.string({ minLength: 1, maxLength: 2000 }).map(
  (s) => `<html><body>${s}</body></html>`,
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 2: Payload Parity (smtp-fallback)', () => {
  beforeEach(() => {
    mockResendSend.mockClear();
    mockSendMail.mockClear();
  });

  /**
   * P2a: ResendProvider passes the exact `to`, `subject`, and `html` to
   * the Resend SDK's emails.send() call.
   */
  it('P2a: ResendProvider preserves to, subject, and html', async () => {
    const resendProvider = new ResendProvider();

    await fc.assert(
      fc.asyncProperty(emailJobArb, htmlArb, async (job, html) => {
        mockResendSend.mockClear();

        await resendProvider.send(job as EmailJob, html);

        expect(mockResendSend).toHaveBeenCalledTimes(1);
        const sentPayload = mockResendSend.mock.calls[0][0];
        expect(sentPayload.to).toBe(job.to);
        expect(sentPayload.subject).toBe(job.subject);
        expect(sentPayload.html).toBe(html);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * P2b: SmtpProvider passes the exact `to`, `subject`, and `html` to
   * Nodemailer's sendMail() call.
   */
  it('P2b: SmtpProvider preserves to, subject, and html', async () => {
    const smtpProvider = new SmtpProvider();

    await fc.assert(
      fc.asyncProperty(emailJobArb, htmlArb, async (job, html) => {
        mockSendMail.mockClear();

        await smtpProvider.send(job as EmailJob, html);

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        const sentPayload = mockSendMail.mock.calls[0][0];
        expect(sentPayload.to).toBe(job.to);
        expect(sentPayload.subject).toBe(job.subject);
        expect(sentPayload.html).toBe(html);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * P2c: ConsoleProvider does not mutate the payload (no SDK to call,
   * but we verify it does not throw for any valid input).
   */
  it('P2c: ConsoleProvider accepts any valid payload without throwing', async () => {
    const consoleProvider = new ConsoleProvider();

    // Suppress console.log for cleaner test output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await fc.assert(
      fc.asyncProperty(emailJobArb, htmlArb, async (job, html) => {
        await expect(
          consoleProvider.send(job as EmailJob, html),
        ).resolves.toBeUndefined();
      }),
      { numRuns: 100 },
    );

    consoleSpy.mockRestore();
  });

  /**
   * P2d: Cross-provider parity — given the same job + html, the `to`,
   * `subject`, and `html` seen by Resend SDK and Nodemailer are identical.
   */
  it('P2d: Resend and SMTP receive identical to/subject/html for the same input', async () => {
    const resendProvider = new ResendProvider();
    const smtpProvider = new SmtpProvider();

    await fc.assert(
      fc.asyncProperty(emailJobArb, htmlArb, async (job, html) => {
        mockResendSend.mockClear();
        mockSendMail.mockClear();

        await resendProvider.send(job as EmailJob, html);
        await smtpProvider.send(job as EmailJob, html);

        const resendPayload = mockResendSend.mock.calls[0][0];
        const smtpPayload = mockSendMail.mock.calls[0][0];

        expect(resendPayload.to).toBe(smtpPayload.to);
        expect(resendPayload.subject).toBe(smtpPayload.subject);
        expect(resendPayload.html).toBe(smtpPayload.html);
      }),
      { numRuns: 100 },
    );
  });
});
