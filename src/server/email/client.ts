import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
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
 */
export const resend = new Resend(env.RESEND_API_KEY);

/**
 * Send email using Resend API
 * 
 * @param job - Email job containing recipient, subject, and template data
 * @param htmlContent - Pre-rendered HTML content for the email
 * @throws Error if email delivery fails
 */
export async function sendEmail(job: EmailJob, htmlContent: string): Promise<void> {
  try {
    logger.info('email.sending', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      to: job.to,
      attempt: job.attempts,
    });

    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
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
