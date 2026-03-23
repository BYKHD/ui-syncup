import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/server/health'

export async function GET() {
  try {
    const report = await runHealthChecks()
    const httpStatus = report.overall === 'NOT READY' ? 503 : 200
    return NextResponse.json(report, { status: httpStatus })
  } catch {
    return NextResponse.json({ error: 'Health check failed unexpectedly' }, { status: 500 })
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
