import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getWorkerStatus } from '@/server/email/worker'
import type { CheckResult } from '../types'

export async function checkQueue(): Promise<CheckResult> {
  const workerStatus = getWorkerStatus()

  try {
    const rows = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM email_jobs WHERE status IN ('pending', 'processing')`
    )
    const pendingJobs = (rows[0] as { count: number } | undefined)?.count ?? 0

    if (!workerStatus.isRunning) {
      return {
        status: 'degraded',
        message: `Email queue worker is not running (${pendingJobs} pending job${pendingJobs === 1 ? '' : 's'})`,
        hint: 'The email queue worker should start automatically — check server logs for startup errors',
        detail: { pendingJobs, workerRunning: false, workerProcessing: false },
      }
    }

    return {
      status: 'ok',
      message: `Email queue healthy — ${pendingJobs} pending job${pendingJobs === 1 ? '' : 's'}`,
      detail: {
        pendingJobs,
        workerRunning: workerStatus.isRunning,
        workerProcessing: workerStatus.isProcessing,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown queue error'
    return {
      status: 'error',
      message,
      hint: 'Run database migrations — the email_jobs table may not exist yet',
    }
  }
}
