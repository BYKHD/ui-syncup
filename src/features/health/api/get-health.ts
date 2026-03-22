import type { HealthReport } from '../types'

export async function getHealth(): Promise<HealthReport> {
  // Accept 503 (NOT READY) — it still returns valid JSON
  const res = await fetch('/api/health', { cache: 'no-store' })
  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check request failed: ${res.status}`)
  }
  return res.json()
}
