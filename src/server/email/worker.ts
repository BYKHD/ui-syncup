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
 *
 * Stored on globalThis so that Next.js HMR module re-evaluation in development
 * does not reset the running state (which would cause false "Degraded" health
 * status after any hot reload). In production there is no HMR, so this is a
 * no-op — the object is simply created once and reused.
 */
const g = globalThis as typeof globalThis & {
  __emailWorkerState?: {
    isRunning: boolean;
    intervalId: NodeJS.Timeout | null;
    isProcessing: boolean;
  };
};

if (!g.__emailWorkerState) {
  g.__emailWorkerState = { isRunning: false, intervalId: null, isProcessing: false };
}

const workerState = g.__emailWorkerState;

/**
 * Process queue with error handling
 */
async function processQueueSafely(): Promise<void> {
  // Skip if already processing
  if (workerState.isProcessing) {
    logger.warn('email.worker.skip', {
      reason: 'Previous processing still in progress',
    });
    return;
  }

  workerState.isProcessing = true;

  try {
    await processEmailQueue();
  } catch (error) {
    logger.error('email.worker.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    workerState.isProcessing = false;
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
  if (workerState.isRunning) {
    logger.warn('email.worker.already_running');
    return;
  }

  workerState.isRunning = true;

  logger.info('email.worker.starting', {
    intervalMs: WORKER_CONFIG.intervalMs,
  });

  // Process immediately on start
  processQueueSafely();

  // Then process at regular intervals
  workerState.intervalId = setInterval(() => {
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
  if (!workerState.isRunning) {
    return;
  }

  logger.info('email.worker.stopping');

  workerState.isRunning = false;

  // Clear interval
  if (workerState.intervalId) {
    clearInterval(workerState.intervalId);
    workerState.intervalId = null;
  }

  // Wait for current processing to complete (with timeout)
  const startTime = Date.now();
  while (workerState.isProcessing && Date.now() - startTime < WORKER_CONFIG.shutdownTimeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (workerState.isProcessing) {
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
    isRunning: workerState.isRunning,
    isProcessing: workerState.isProcessing,
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
