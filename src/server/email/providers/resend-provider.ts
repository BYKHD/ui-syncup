import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { EmailProvider } from './index';
import type { EmailJob } from '../client';

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async send(job: EmailJob, htmlContent: string): Promise<void> {
    logger.info('email.sending', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      to: job.to,
      attempt: job.attempts,
      provider: 'resend',
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: env.RESEND_FROM_EMAIL || 'noreply@ui-syncup.com',
        to: job.to,
        subject: job.subject,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.info('email.sent', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        emailId: data?.id,
        attempt: job.attempts,
        provider: 'resend',
      });
    } catch (error) {
      logger.error('email.failed', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: job.attempts,
        provider: 'resend',
      });
      throw new Error(`Resend error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
