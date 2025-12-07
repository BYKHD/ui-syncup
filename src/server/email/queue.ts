/**
 * Email Queue System
 * 
 * Provides reliable, asynchronous email delivery with:
 * - Idempotency (userId + tokenId prevents duplicates)
 * - Retry logic with exponential backoff (30s, 5m, 30m)
 * - Failure logging and alerting
 * 
 * @module server/email/queue
 */

import { db } from '@/lib/db';
import { emailJobs } from '@/server/db/schema';
import { logger } from '@/lib/logger';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import type { EmailTemplate } from './render-template';
import { renderTemplate, getEmailSubject } from './render-template';
import { sendEmail } from './client';

/**
 * Email job structure for queue processing
 */
export interface EmailJobInput {
  userId: string;
  tokenId?: string;
  type: 'verification' | 'password_reset' | 'welcome' | 'security_alert' | 'team_invitation' | 'ownership_transfer';
  to: string;
  template: EmailTemplate;
}

/**
 * Calculate backoff delay based on attempt number
 * - Attempt 1: 30 seconds
 * - Attempt 2: 5 minutes
 * - Attempt 3: 30 minutes
 */
function calculateBackoff(attempts: number): number {
  switch (attempts) {
    case 1:
      return 30 * 1000; // 30 seconds
    case 2:
      return 5 * 60 * 1000; // 5 minutes
    case 3:
      return 30 * 60 * 1000; // 30 minutes
    default:
      return 30 * 1000; // Default to 30 seconds
  }
}

/**
 * Enqueue email for delivery with idempotency
 * 
 * Idempotency key: userId + tokenId (or userId + type for non-token emails)
 * Duplicate submissions are silently ignored (no-op)
 * 
 * @param job - Email job input
 * @returns Promise<void>
 */
export async function enqueueEmail(job: EmailJobInput): Promise<void> {
  try {
    // Check for existing pending/processing job with same idempotency key
    const existingJob = await db
      .select()
      .from(emailJobs)
      .where(
        and(
          eq(emailJobs.userId, job.userId),
          job.tokenId 
            ? eq(emailJobs.tokenId, job.tokenId)
            : and(
                eq(emailJobs.type, job.type),
                isNull(emailJobs.tokenId)
              ),
          or(
            eq(emailJobs.status, 'pending'),
            eq(emailJobs.status, 'processing')
          )
        )
      )
      .limit(1);

    // Idempotency: ignore duplicate submissions
    if (existingJob.length > 0) {
      logger.info('email.queued.duplicate', {
        userId: job.userId,
        tokenId: job.tokenId,
        type: job.type,
        existingJobId: existingJob[0].id,
      });
      return;
    }

    // Get subject from template
    const subject = getEmailSubject(job.template);

    // Create new email job
    const [newJob] = await db
      .insert(emailJobs)
      .values({
        userId: job.userId,
        tokenId: job.tokenId || null,
        type: job.type,
        to: job.to,
        subject,
        template: job.template.type,
        data: job.template.data as any,
        attempts: 0,
        maxAttempts: 3,
        status: 'pending',
        scheduledFor: new Date(),
      })
      .returning();

    logger.info('email.queued', {
      jobId: newJob.id,
      userId: job.userId,
      tokenId: job.tokenId,
      type: job.type,
      to: job.to,
    });
  } catch (error) {
    logger.error('email.queue.error', {
      userId: job.userId,
      type: job.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Process a single email job
 * 
 * @param job - Email job from database
 * @returns Promise<boolean> - true if successful, false if should retry
 */
async function processJob(job: typeof emailJobs.$inferSelect): Promise<boolean> {
  try {
    // Mark as processing
    await db
      .update(emailJobs)
      .set({
        status: 'processing',
        attempts: job.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(emailJobs.id, job.id));

    // Reconstruct template from stored data
    const template: EmailTemplate = {
      type: job.template as any,
      data: job.data as any,
    };

    // Render template to HTML
    const htmlContent = await renderTemplate(template);

    // Send email
    await sendEmail(
      {
        id: job.id,
        userId: job.userId,
        tokenId: job.tokenId || undefined,
        type: job.type as any,
        to: job.to,
        subject: job.subject,
        template,
        attempts: job.attempts + 1,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt.toISOString(),
        scheduledFor: job.scheduledFor.toISOString(),
      },
      htmlContent
    );

    // Mark as completed
    await db
      .update(emailJobs)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(emailJobs.id, job.id));

    logger.info('email.processed', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      attempts: job.attempts + 1,
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const newAttempts = job.attempts + 1;

    logger.error('email.processing.error', {
      jobId: job.id,
      userId: job.userId,
      type: job.type,
      attempts: newAttempts,
      error: errorMessage,
    });

    // Check if we should retry
    if (newAttempts < job.maxAttempts) {
      // Schedule retry with backoff
      const delay = calculateBackoff(newAttempts);
      const scheduledFor = new Date(Date.now() + delay);

      await db
        .update(emailJobs)
        .set({
          status: 'pending',
          attempts: newAttempts,
          lastError: errorMessage,
          scheduledFor,
          updatedAt: new Date(),
        })
        .where(eq(emailJobs.id, job.id));

      logger.info('email.retry.scheduled', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        attempts: newAttempts,
        scheduledFor: scheduledFor.toISOString(),
        delayMs: delay,
      });

      return false;
    } else {
      // Max retries reached, mark as failed
      await db
        .update(emailJobs)
        .set({
          status: 'failed',
          lastError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(emailJobs.id, job.id));

      logger.error('email.failed.max_retries', {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        attempts: newAttempts,
        error: errorMessage,
      });

      // Alert monitoring system
      logger.error('email.alert.delivery_failed', {
        severity: 'critical',
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        to: job.to,
        attempts: newAttempts,
        error: errorMessage,
      });

      return false;
    }
  }
}

/**
 * Process email queue
 * 
 * Fetches pending jobs that are scheduled to run and processes them.
 * Should be called periodically by a background worker.
 * 
 * @returns Promise<void>
 */
export async function processEmailQueue(): Promise<void> {
  try {
    // Fetch pending jobs that are ready to process
    const jobs = await db
      .select()
      .from(emailJobs)
      .where(
        and(
          eq(emailJobs.status, 'pending'),
          lte(emailJobs.scheduledFor, new Date())
        )
      )
      .limit(10); // Process up to 10 jobs at a time

    if (jobs.length === 0) {
      return;
    }

    logger.info('email.queue.processing', {
      count: jobs.length,
    });

    // Process jobs sequentially to avoid overwhelming the email service
    for (const job of jobs) {
      await processJob(job);
    }

    logger.info('email.queue.processed', {
      count: jobs.length,
    });
  } catch (error) {
    logger.error('email.queue.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
