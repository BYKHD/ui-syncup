/**
 * Next.js Instrumentation
 * This file is automatically called by Next.js during server initialization.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Run database migrations before anything else
    const { autoMigrate } = await import('@/server/db/auto-migrate');
    await autoMigrate();

    // Start the email worker to process queued emails
    const { startEmailWorker } = await import('@/server/email/worker');
    startEmailWorker();

    // Ensure storage bucket exists (creates it on first run if using MinIO)
    const { ensureStorageBucket } = await import('@/lib/storage');
    ensureStorageBucket().catch((err) =>
      console.error('[storage] ensureStorageBucket failed:', err)
    );
  }
}
