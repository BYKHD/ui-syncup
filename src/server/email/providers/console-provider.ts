import { logger } from '@/lib/logger';
import { DEFAULT_SENDER } from '@/lib/resend';
import type { EmailProvider } from './index';
import type { EmailJob } from '../client';

export class ConsoleProvider implements EmailProvider {
  async send(job: EmailJob, htmlContent: string): Promise<void> {
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

    logger.info('email.console_fallback', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      to: job.to,
      message: 'Email logged to console (Resend not configured)',
    });
  }
}
