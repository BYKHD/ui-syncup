import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { EmailProvider } from './providers';
import { ResendProvider } from './providers/resend-provider';
import { SmtpProvider } from './providers/smtp-provider';
import { ConsoleProvider } from './providers/console-provider';
import type { EmailTemplate } from './render-template';

/**
 * Email job structure for queue processing
 */
export interface EmailJob {
  id: string;
  userId: string;
  tokenId?: string;
  type: 'verification' | 'password_reset' | 'welcome' | 'security_alert';
  to: string;
  subject: string;
  template: EmailTemplate;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledFor: string;
}

/**
 * Resolves the appropriate email provider based on current environment variables.
 *
 * Priority order:
 *   1. ResendProvider  — when RESEND_API_KEY is configured
 *   2. SmtpProvider    — when SMTP_HOST is configured (and Resend is absent)
 *   3. ConsoleProvider — development/test only fallback
 *
 * Throws in production if neither Resend nor SMTP is configured.
 *
 * @returns An EmailProvider instance ready for dispatch
 */
export function resolveProvider(): EmailProvider {
  if (env.RESEND_API_KEY) return new ResendProvider();
  if (env.SMTP_HOST) return new SmtpProvider();

  const isProdLike =
    env.NODE_ENV === 'production' ||
    env.VERCEL_ENV === 'production' ||
    env.VERCEL_ENV === 'preview';

  if (isProdLike) {
    logger.error('email.missing_config', {
      message: 'Email service is not configured in production',
    });
    throw new Error('Email service is not configured.');
  }

  return new ConsoleProvider();
}

/**
 * Send email using the resolved provider.
 *
 * The provider is selected dynamically via `resolveProvider()` on each call,
 * ensuring the system always reflects the current environment configuration.
 *
 * @param job - Email job containing recipient, subject, and template data
 * @param htmlContent - Pre-rendered HTML content for the email
 * @throws Error if email delivery fails or no provider is configured in production
 */
export async function sendEmail(job: EmailJob, htmlContent: string): Promise<void> {
  const provider = resolveProvider();
  await provider.send(job, htmlContent);
}
