/**
 * Email Queue Worker
 * 
 * Background worker that processes the email queue at regular intervals.
 * Designed to run as a separate process or scheduled job.
 * 
 * @module server/email/worker
 */

import { processEmailQueue } from './queue';
import { logger } from '@/lib/logger';

/**
 * Worker configuration
 */
const WORKER_CONFIG = {
  // Process queue every 30 seconds
  intervalMs: 30 * 1000,
  
  // Graceful shutdown timeout
  shutdownTimeoutMs: 10 * 1000,
};

/**
 * Worker state
 */
let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Process queue with error handling
 */
async function processQueueSafely(): Promise<void> {
  // Skip if already processing
  if (isProcessing) {
    logger.warn('email.worker.skip', {
      reason: 'Previous processing still in progress',
    });
    return;
  }

  isProcessing = true;

  try {
    await processEmailQueue();
  } catch (error) {
    logger.error('email.worker.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the email queue worker
 * 
 * Processes the queue at regular intervals until stopped.
 * Safe to call multiple times (no-op if already running).
 * 
 * @example
 * ```ts
 * // In your server startup
 * import { startEmailWorker } from '@/server/email/worker'
 * 
 * startEmailWorker()
 * ```
 */
export function startEmailWorker(): void {
  if (isRunning) {
    logger.warn('email.worker.already_running');
    return;
  }

  isRunning = true;

  logger.info('email.worker.starting', {
    intervalMs: WORKER_CONFIG.intervalMs,
  });

  // Process immediately on start
  processQueueSafely();

  // Then process at regular intervals
  intervalId = setInterval(() => {
    processQueueSafely();
  }, WORKER_CONFIG.intervalMs);

  logger.info('email.worker.started');
}

/**
 * Stop the email queue worker
 * 
 * Gracefully stops the worker, waiting for current processing to complete.
 * 
 * @returns Promise that resolves when worker is stopped
 * 
 * @example
 * ```ts
 * // In your server shutdown
 * process.on('SIGTERM', async () => {
 *   await stopEmailWorker()
 *   process.exit(0)
 * })
 * ```
 */
export async function stopEmailWorker(): Promise<void> {
  if (!isRunning) {
    return;
  }

  logger.info('email.worker.stopping');

  isRunning = false;

  // Clear interval
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  // Wait for current processing to complete (with timeout)
  const startTime = Date.now();
  while (isProcessing && Date.now() - startTime < WORKER_CONFIG.shutdownTimeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (isProcessing) {
    logger.warn('email.worker.force_stop', {
      reason: 'Shutdown timeout reached',
    });
  }

  logger.info('email.worker.stopped');
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  isRunning: boolean;
  isProcessing: boolean;
} {
  return {
    isRunning,
    isProcessing,
  };
}

/**
 * Process queue once (for manual triggering or testing)
 * 
 * @example
 * ```ts
 * // In an API route for manual queue processing
 * import { processQueueOnce } from '@/server/email/worker'
 * 
 * export async function POST() {
 *   await processQueueOnce()
 *   return Response.json({ success: true })
 * }
 * ```
 */
export async function processQueueOnce(): Promise<void> {
  logger.info('email.worker.manual_trigger');
  await processQueueSafely();
}

// Handle process termination signals
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    logger.info('email.worker.sigterm');
    await stopEmailWorker();
  });

  process.on('SIGINT', async () => {
    logger.info('email.worker.sigint');
    await stopEmailWorker();
  });
}
