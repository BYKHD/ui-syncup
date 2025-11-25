/**
 * Email Queue System Tests
 * 
 * Tests the email queue functionality including:
 * - Idempotency (duplicate prevention)
 * - Retry logic with exponential backoff
 * - Failure handling and alerting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { enqueueEmail, processEmailQueue } from '../queue';
import { db } from '@/lib/db';
import { emailJobs, users, verificationTokens } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import * as emailClient from '../client';
import { randomUUID } from 'crypto';

// Mock the email client
vi.mock('../client', () => ({
  sendEmail: vi.fn(),
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Helper to generate valid UUIDs for tests
const generateTestUUID = () => randomUUID();

async function createTestUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const userId = overrides.id ?? generateTestUUID();
  const { id: _ignored, email, name, ...rest } = overrides;

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      email: email ?? `user-${userId}@example.com`,
      name: name ?? 'Test User',
      ...rest,
    })
    .returning();

  return user;
}

async function createTestVerificationToken({
  userId,
  id = generateTestUUID(),
  token = `token-${id}`,
  type = 'email_verification',
  expiresAt = new Date(Date.now() + 60 * 60 * 1000),
}: {
  userId: string;
  id?: string;
  token?: string;
  type?: 'email_verification' | 'password_reset';
  expiresAt?: Date;
}) {
  const [verificationToken] = await db
    .insert(verificationTokens)
    .values({
      id,
      userId,
      token,
      type,
      expiresAt,
    })
    .returning();

  return verificationToken;
}

describe('Email Queue System', () => {
  beforeEach(async () => {
    // Clean up email jobs before each test
    await db.delete(emailJobs);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after tests
    await db.delete(emailJobs);
  });

  describe('enqueueEmail', () => {
    it('should create a new email job', async () => {
      const user = await createTestUser();
      const token = await createTestVerificationToken({ userId: user.id });
      
      const jobInput = {
        userId: user.id,
        tokenId: token.id,
        type: 'verification' as const,
        to: 'test@example.com',
        template: {
          type: 'verification' as const,
          data: {
            name: 'Test User',
            verificationUrl: 'https://example.com/verify',
          },
        },
      };

      await enqueueEmail(jobInput);

      // Verify job was created
      const jobs = await db.select().from(emailJobs);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].userId).toBe(user.id);
      expect(jobs[0].tokenId).toBe(token.id);
      expect(jobs[0].type).toBe(jobInput.type);
      expect(jobs[0].to).toBe(jobInput.to);
      expect(jobs[0].status).toBe('pending');
      expect(jobs[0].attempts).toBe(0);
    });

    it('should enforce idempotency for duplicate jobs with tokenId', async () => {
      const user = await createTestUser();
      const token = await createTestVerificationToken({ userId: user.id });
      
      const jobInput = {
        userId: user.id,
        tokenId: token.id,
        type: 'verification' as const,
        to: 'test@example.com',
        template: {
          type: 'verification' as const,
          data: {
            name: 'Test User',
            verificationUrl: 'https://example.com/verify',
          },
        },
      };

      // Enqueue the same job twice
      await enqueueEmail(jobInput);
      await enqueueEmail(jobInput);

      // Should only have one job
      const jobs = await db.select().from(emailJobs);
      expect(jobs).toHaveLength(1);
    });

    it('should enforce idempotency for duplicate jobs without tokenId', async () => {
      const user = await createTestUser();
      
      const jobInput = {
        userId: user.id,
        type: 'welcome' as const,
        to: 'test@example.com',
        template: {
          type: 'welcome' as const,
          data: {
            name: 'Test User',
            dashboardUrl: 'https://example.com/dashboard',
          },
        },
      };

      // Enqueue the same job twice
      await enqueueEmail(jobInput);
      await enqueueEmail(jobInput);

      // Should only have one job
      const jobs = await db.select().from(emailJobs);
      expect(jobs).toHaveLength(1);
    });

    it('should allow different jobs for the same user', async () => {
      const user = await createTestUser();
      const token1 = await createTestVerificationToken({ userId: user.id });
      const token2 = await createTestVerificationToken({ userId: user.id });
      
      const job1 = {
        userId: user.id,
        tokenId: token1.id,
        type: 'verification' as const,
        to: 'test@example.com',
        template: {
          type: 'verification' as const,
          data: {
            name: 'Test User',
            verificationUrl: 'https://example.com/verify',
          },
        },
      };

      const job2 = {
        userId: user.id,
        tokenId: token2.id,
        type: 'password_reset' as const,
        to: 'test@example.com',
        template: {
          type: 'password_reset' as const,
          data: {
            name: 'Test User',
            resetUrl: 'https://example.com/reset',
          },
        },
      };

      await enqueueEmail(job1);
      await enqueueEmail(job2);

      // Should have two jobs
      const jobs = await db.select().from(emailJobs);
      expect(jobs).toHaveLength(2);
    });
  });

  describe('processEmailQueue', () => {
    it('should process pending jobs successfully', async () => {
      const user = await createTestUser();
      const token = await createTestVerificationToken({ userId: user.id });
      
      // Mock successful email sending
      const sendEmailMock = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue();

      // Create a pending job
      const [job] = await db
        .insert(emailJobs)
        .values({
          userId: user.id,
          tokenId: token.id,
          type: 'verification',
          to: 'test@example.com',
          subject: 'Verify your email',
          template: 'verification',
          data: {
            name: 'Test User',
            verificationUrl: 'https://example.com/verify',
          },
          status: 'pending',
          scheduledFor: new Date(),
        })
        .returning();

      // Process the queue
      await processEmailQueue();

      // Verify job was processed
      const [updatedJob] = await db
        .select()
        .from(emailJobs)
        .where(eq(emailJobs.id, job.id));

      expect(updatedJob.status).toBe('completed');
      expect(updatedJob.attempts).toBe(1);
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it('should retry failed jobs with backoff', async () => {
      const user = await createTestUser();
      
      // Mock failed email sending
      const sendEmailMock = vi.spyOn(emailClient, 'sendEmail').mockRejectedValue(new Error('Network error'));

      // Create a pending job
      const [job] = await db
        .insert(emailJobs)
        .values({
          userId: user.id,
          type: 'verification',
          to: 'test@example.com',
          subject: 'Verify your email',
          template: 'verification',
          data: {
            name: 'Test User',
            verificationUrl: 'https://example.com/verify',
          },
          status: 'pending',
          scheduledFor: new Date(),
        })
        .returning();

      // Process the queue
      await processEmailQueue();

      // Verify job was rescheduled for retry
      const [updatedJob] = await db
        .select()
        .from(emailJobs)
        .where(eq(emailJobs.id, job.id));

      expect(updatedJob.status).toBe('pending');
      expect(updatedJob.attempts).toBe(1);
      expect(updatedJob.lastError).toBe('Network error');
      expect(updatedJob.scheduledFor.getTime()).toBeGreaterThan(Date.now());
    });

    it('should mark job as failed after max retries', async () => {
      const user = await createTestUser();
      
      // Mock failed email sending
      const sendEmailMock = vi.spyOn(emailClient, 'sendEmail').mockRejectedValue(new Error('Permanent failure'));

      // Create a job that has already failed twice
      const [job] = await db
        .insert(emailJobs)
        .values({
          userId: user.id,
          type: 'verification',
          to: 'test@example.com',
          subject: 'Verify your email',
          template: 'verification',
          data: {
            name: 'Test User',
            verificationUrl: 'https://example.com/verify',
          },
          status: 'pending',
          attempts: 2,
          maxAttempts: 3,
          scheduledFor: new Date(),
        })
        .returning();

      // Process the queue (this will be the 3rd attempt)
      await processEmailQueue();

      // Verify job was marked as failed
      const [updatedJob] = await db
        .select()
        .from(emailJobs)
        .where(eq(emailJobs.id, job.id));

      expect(updatedJob.status).toBe('failed');
      expect(updatedJob.attempts).toBe(3);
      expect(updatedJob.lastError).toBe('Permanent failure');
    });

    it('should not process jobs scheduled for the future', async () => {
      const user = await createTestUser();
      
      // Create a job scheduled for 1 hour from now
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(emailJobs).values({
        userId: user.id,
        type: 'verification',
        to: 'test@example.com',
        subject: 'Verify your email',
        template: 'verification',
        data: {
          name: 'Test User',
          verificationUrl: 'https://example.com/verify',
        },
        status: 'pending',
        scheduledFor: futureDate,
      });

      const sendEmailMock = vi.spyOn(emailClient, 'sendEmail');

      // Process the queue
      await processEmailQueue();

      // Verify email was not sent
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should process multiple jobs in sequence', async () => {
      const user1 = await createTestUser({ name: 'User 1' });
      const user2 = await createTestUser({ name: 'User 2' });
      
      // Mock successful email sending
      const sendEmailMock = vi.spyOn(emailClient, 'sendEmail').mockResolvedValue();

      // Create multiple pending jobs
      await db.insert(emailJobs).values([
        {
          userId: user1.id,
          type: 'verification',
          to: 'user1@example.com',
          subject: 'Verify your email',
          template: 'verification',
          data: { name: 'User 1', verificationUrl: 'https://example.com/verify' },
          status: 'pending',
          scheduledFor: new Date(),
        },
        {
          userId: user2.id,
          type: 'welcome',
          to: 'user2@example.com',
          subject: 'Welcome',
          template: 'welcome',
          data: { name: 'User 2', dashboardUrl: 'https://example.com/dashboard' },
          status: 'pending',
          scheduledFor: new Date(),
        },
      ]);

      // Process the queue
      await processEmailQueue();

      // Verify both emails were sent
      expect(sendEmailMock).toHaveBeenCalledTimes(2);

      // Verify both jobs are completed
      const jobs = await db.select().from(emailJobs);
      expect(jobs.every(job => job.status === 'completed')).toBe(true);
    });
  });
});
