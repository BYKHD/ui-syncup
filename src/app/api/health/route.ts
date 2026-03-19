import { NextResponse } from 'next/server'
import pkg from '../../../../package.json'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: pkg.version,
    timestamp: new Date().toISOString(),
  })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
