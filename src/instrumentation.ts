/**
 * Next.js Instrumentation
 * This file is automatically called by Next.js during server initialization.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Start the email worker to process queued emails
    const { startEmailWorker } = await import('@/server/email/worker');
    startEmailWorker();
  }
}
