import * as nodemailer from 'nodemailer';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { EmailProvider } from './index';
import type { EmailJob } from '../client';

export class SmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM_EMAIL) {
      throw new Error('Incomplete SMTP configuration');
    }

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true' || env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
      pool: true, // Use connection pooling
    });
  }

  async send(job: EmailJob, htmlContent: string): Promise<void> {
    logger.info('email.sending', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      to: job.to,
      attempt: job.attempts,
      provider: 'smtp',
    });

    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM_EMAIL as string,
        to: job.to,
        subject: job.subject,
        html: htmlContent,
      });

      logger.info('email.sent', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        emailId: info.messageId,
        attempt: job.attempts,
        provider: 'smtp',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('email.failed', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        error: errorMessage,
        attempt: job.attempts,
        provider: 'smtp',
      });
      throw new Error(`SMTP error: ${errorMessage}`);
    }
  }
}
