import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { isEmailConfigured, DEFAULT_SENDER } from '@/lib/resend';
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
 * Initialize Resend client with API key
 * Returns null if API key is not configured
 */
export const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;

/**
 * Log email to console in development mode
 * Used as fallback when Resend is not configured
 */
function logEmailToConsole(job: EmailJob, htmlContent: string): void {
  const divider = '═'.repeat(60);
  
  console.log(`\n📧 ${divider}`);
  console.log('   EMAIL (Development Mode - Not Sent)');
  console.log(divider);
  console.log(`Type:    ${job.type}`);
  console.log(`To:      ${job.to}`);
  console.log(`Subject: ${job.subject}`);
  console.log(`From:    ${DEFAULT_SENDER}`);
  console.log(`Job ID:  ${job.id}`);
  console.log(divider);
  
  // Extract text content from HTML for console display
  const textPreview = htmlContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  
  if (textPreview) {
    console.log('Preview:');
    console.log(textPreview);
    if (htmlContent.length > 500) console.log('...(truncated)');
  }
  
  console.log(`${divider}\n`);
}

/**
 * Send email using Resend API
 * Falls back to console logging in development when Resend is not configured
 * 
 * @param job - Email job containing recipient, subject, and template data
 * @param htmlContent - Pre-rendered HTML content for the email
 * @throws Error if email delivery fails (only in production)
 */
export async function sendEmail(job: EmailJob, htmlContent: string): Promise<void> {
  const isProdLike =
    env.NODE_ENV === 'production' ||
    env.VERCEL_ENV === 'production' ||
    env.VERCEL_ENV === 'preview';

  // Development fallback - log to console when Resend not configured
  if (!isEmailConfigured() || !resend) {
    if (isProdLike) {
      logger.error('email.missing_config', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        to: job.to,
        message: 'Resend is not configured in production',
      });

      throw new Error('Email service is not configured.');
    }

    logEmailToConsole(job, htmlContent);

    logger.info('email.console_fallback', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      to: job.to,
      message: 'Email logged to console (Resend not configured)',
    });

    return;
  }

  try {
    logger.info('email.sending', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      to: job.to,
      attempt: job.attempts,
    });

    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL!,
      to: job.to,
      subject: job.subject,
      html: htmlContent,
    });

    if (error) {
      logger.error('email.failed', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        error: error.message,
        attempt: job.attempts,
      });
      throw new Error(`Resend error: ${error.message}`);
    }

    logger.info('email.sent', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      emailId: data?.id,
      attempt: job.attempts,
    });
  } catch (error) {
    logger.error('email.error', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      attempt: job.attempts,
    });
    throw error;
  }
}
