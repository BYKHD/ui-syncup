# Health Check Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/health` diagnostic page + `/api/health` endpoint that reports `READY | DEGRADED | NOT READY` for all platform dependencies.

**Architecture:** New `src/server/health/` module contains isolated check functions (database, storage, cache, env config, external services, queue). A `health-service.ts` runs them in parallel and computes overall status. The existing trivial `GET /api/health` route is upgraded to call this service (HTTP 503 on `NOT READY`). A `src/features/health/` client module provides a React Query hook + shadcn-compatible UI rendered by a standalone page at `(public)/health`. No auth required on either the page or the API.

**Tech Stack:** Next.js App Router, Drizzle ORM, postgres.js, AWS SDK v3 (S3), Node `net` module (TCP probe), Vitest, TanStack Query, shadcn/ui, Tailwind CSS

---

## Context: What already exists

| File | Status |
|------|--------|
| `src/app/api/health/route.ts` | Exists — trivial, just `{ status: 'ok' }`. Will be replaced. |
| `src/app/api/setup/health/route.ts` | Exists — calls `checkAllServicesHealth()` for the setup wizard only. Leave it alone. |
| `src/server/setup/health-check-service.ts` | Exists — checks for setup wizard (different shape, different scope). Do **not** modify. |
| `src/lib/db.ts` | Exports `db` (Drizzle) + `dbClient` (postgres.js). Import `db` for all checks. |
| `src/server/db/schema/email-jobs.ts` | Contains `emailJobs` table with `status` column. Import from `@/server/db/schema`. |
| `src/server/email/worker.ts` | Exports `getWorkerStatus()` → `{ isRunning, isProcessing }`. |
| `src/lib/storage.ts` | S3 client utilities. The health check creates its own client (same env vars). |
| `src/lib/env.ts` | `env` object + `isProduction()` helper. |

---

## Task 1: Server health types

**Files:**
- Create: `src/server/health/types.ts`
- Create: `src/server/health/index.ts`
- Create: `src/server/health/__tests__/types.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/__tests__/types.test.ts
import { describe, it, expect } from 'vitest'
import type { CheckResult, HealthReport, OverallStatus, CheckStatus } from '../types'

describe('health types shape', () => {
  it('CheckStatus values are the expected literals', () => {
    const statuses: CheckStatus[] = ['ok', 'degraded', 'error', 'skip']
    expect(statuses).toHaveLength(4)
  })

  it('OverallStatus values are the expected literals', () => {
    const statuses: OverallStatus[] = ['READY', 'DEGRADED', 'NOT READY']
    expect(statuses).toHaveLength(3)
  })

  it('CheckResult has required shape', () => {
    const result: CheckResult = {
      status: 'ok',
      message: 'Database connected',
      latencyMs: 12,
    }
    expect(result.status).toBe('ok')
  })

  it('HealthReport has all 6 check keys', () => {
    const report: HealthReport = {
      overall: 'READY',
      timestamp: new Date().toISOString(),
      checks: {
        database:      { status: 'ok',   message: 'ok' },
        storage:       { status: 'ok',   message: 'ok' },
        cache:         { status: 'skip', message: 'not configured' },
        envConfig:     { status: 'ok',   message: 'ok' },
        email:         { status: 'ok',   message: 'ok' },
        queue:         { status: 'ok',   message: 'ok' },
      },
    }
    expect(Object.keys(report.checks)).toHaveLength(6)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/__tests__/types.test.ts
```

Expected: FAIL with `Cannot find module '../types'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/types.ts
export type CheckStatus = 'ok' | 'degraded' | 'error' | 'skip'
export type OverallStatus = 'READY' | 'DEGRADED' | 'NOT READY'

export interface CheckResult {
  status: CheckStatus
  message: string
  latencyMs?: number
  hint?: string
  detail?: Record<string, unknown>
}

export interface HealthReport {
  overall: OverallStatus
  timestamp: string
  checks: {
    database:  CheckResult
    storage:   CheckResult
    cache:     CheckResult
    envConfig: CheckResult
    email:     CheckResult
    queue:     CheckResult
  }
}
```

```typescript
// src/server/health/index.ts
export type { CheckResult, CheckStatus, HealthReport, OverallStatus } from './types'
export { runHealthChecks } from './health-service'
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/__tests__/types.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/server/health/types.ts src/server/health/index.ts src/server/health/__tests__/types.test.ts
git commit -m "feat(health): add health check types"
```

---

## Task 2: Database check — latency + migration version

**Files:**
- Create: `src/server/health/checks/database.ts`
- Create: `src/server/health/checks/__tests__/database.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/checks/__tests__/database.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/lib/db'
import { checkDatabase } from '../database'

const mockExecute = vi.mocked(db.execute)

describe('checkDatabase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok with latencyMs when DB responds', async () => {
    mockExecute
      .mockResolvedValueOnce([{ now: new Date() }] as never)        // SELECT NOW()
      .mockResolvedValueOnce([{ id: 2, hash: 'abc' }] as never)    // migrations query

    const result = await checkDatabase()

    expect(result.status).toBe('ok')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    expect(result.detail?.migrationVersion).toBe('2')
    expect(result.hint).toBeUndefined()
  })

  it('returns error when DB throws', async () => {
    mockExecute.mockRejectedValue(new Error('Connection refused'))

    const result = await checkDatabase()

    expect(result.status).toBe('error')
    expect(result.message).toContain('Connection refused')
    expect(result.hint).toContain('DATABASE_URL')
  })

  it('reports ok and migrationVersion "unknown" when migrations table is missing', async () => {
    mockExecute
      .mockResolvedValueOnce([{ now: new Date() }] as never)
      .mockRejectedValueOnce(new Error('relation "__drizzle_migrations" does not exist'))

    const result = await checkDatabase()

    expect(result.status).toBe('ok')
    expect(result.detail?.migrationVersion).toBe('unknown')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/checks/__tests__/database.test.ts
```

Expected: FAIL with `Cannot find module '../database'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/checks/database.ts
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { CheckResult } from '../types'

export async function checkDatabase(): Promise<CheckResult> {
  const start = performance.now()

  try {
    await db.execute(sql`SELECT NOW()`)
    const latencyMs = Math.round(performance.now() - start)

    // Read the highest applied migration index from Drizzle's migrations table
    let migrationVersion = 'unknown'
    try {
      const rows = await db.execute(
        sql`SELECT id FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 1`
      )
      const row = rows[0] as { id: number } | undefined
      if (row) migrationVersion = String(row.id)
    } catch {
      // Fresh DB before first migrate — no migrations table yet
    }

    return {
      status: 'ok',
      message: 'Database connected',
      latencyMs,
      detail: { migrationVersion },
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown database error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check DATABASE_URL environment variable and ensure the database is running',
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/checks/__tests__/database.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/server/health/checks/database.ts src/server/health/checks/__tests__/database.test.ts
git commit -m "feat(health): add database check with latency and migration version"
```

---

## Task 3: Storage check — write/read/delete probe

**Files:**
- Create: `src/server/health/checks/storage.ts`
- Create: `src/server/health/checks/__tests__/storage.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/checks/__tests__/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  PutObjectCommand:  vi.fn((args) => ({ _type: 'PutObject',  ...args })),
  HeadObjectCommand: vi.fn((args) => ({ _type: 'HeadObject',  ...args })),
  DeleteObjectCommand: vi.fn((args) => ({ _type: 'DeleteObject', ...args })),
}))

import { checkStorage } from '../storage'

describe('checkStorage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok when all S3 operations succeed', async () => {
    mockSend.mockResolvedValue({})

    const result = await checkStorage()

    expect(result.status).toBe('ok')
    expect(result.message).toContain('Storage accessible')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    // 3 operations: PutObject, HeadObject, DeleteObject
    expect(mockSend).toHaveBeenCalledTimes(3)
  })

  it('returns error when PutObject fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('Access Denied'))

    const result = await checkStorage()

    expect(result.status).toBe('error')
    expect(result.message).toContain('Access Denied')
    expect(result.hint).toContain('STORAGE_ENDPOINT')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/checks/__tests__/storage.test.ts
```

Expected: FAIL with `Cannot find module '../storage'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/checks/storage.ts
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import type { CheckResult } from '../types'

function buildClient(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    endpoint: process.env.STORAGE_ENDPOINT ?? 'http://127.0.0.1:9000',
    credentials: {
      accessKeyId:
        process.env.STORAGE_ACCESS_KEY_ID ??
        process.env.STORAGE_ATTACHMENTS_ACCESS_KEY ??
        'minioadmin',
      secretAccessKey:
        process.env.STORAGE_SECRET_ACCESS_KEY ??
        process.env.STORAGE_ATTACHMENTS_SECRET_KEY ??
        'minioadmin',
    },
    forcePathStyle: true,
  })
}

export async function checkStorage(): Promise<CheckResult> {
  const bucket = process.env.STORAGE_ATTACHMENTS_BUCKET ?? 'ui-syncup-attachments'
  const probeKey = `_health-check/probe-${Date.now()}.txt`
  const client = buildClient()
  const start = performance.now()

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: probeKey,
        Body: 'health-check',
        ContentType: 'text/plain',
      })
    )
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: probeKey }))
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }))

    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'ok',
      message: `Storage accessible (bucket: ${bucket})`,
      latencyMs,
    }
  } catch (error) {
    // Best-effort cleanup
    try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey })) } catch { /* ignore */ }

    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown storage error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, and STORAGE_ATTACHMENTS_BUCKET',
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/checks/__tests__/storage.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/server/health/checks/storage.ts src/server/health/checks/__tests__/storage.test.ts
git commit -m "feat(health): add storage check with write/read/delete probe"
```

---

## Task 4: Cache check — TCP probe

The codebase has no Redis client library. We use Node's built-in `net` module to do a raw TCP probe — verifies the port is open without any Redis dependency.

**Files:**
- Create: `src/server/health/checks/cache.ts`
- Create: `src/server/health/checks/__tests__/cache.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/checks/__tests__/cache.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'

const mockCreateConnection = vi.fn()
vi.mock('net', () => ({
  default: { createConnection: mockCreateConnection },
}))

import { checkCache } from '../cache'

describe('checkCache', () => {
  const originalEnv = { ...process.env }
  afterEach(() => { process.env = { ...originalEnv } })

  it('returns skip when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL
    const result = await checkCache()
    expect(result.status).toBe('skip')
    expect(result.message).toContain('not configured')
    expect(mockCreateConnection).not.toHaveBeenCalled()
  })

  it('returns error when REDIS_URL has invalid format', async () => {
    process.env.REDIS_URL = 'not-a-url'
    const result = await checkCache()
    expect(result.status).toBe('error')
    expect(result.hint).toContain('REDIS_URL')
  })

  it('returns ok when TCP connection succeeds', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const fakeSocket = { on: vi.fn(), destroy: vi.fn() }
    fakeSocket.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'connect') setTimeout(cb, 0)
      return fakeSocket
    })
    mockCreateConnection.mockReturnValue(fakeSocket)

    const result = await checkCache()

    expect(result.status).toBe('ok')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('returns error when TCP connection is refused', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const fakeSocket = { on: vi.fn(), destroy: vi.fn() }
    fakeSocket.on.mockImplementation((event: string, cb: (err?: Error) => void) => {
      if (event === 'error') setTimeout(() => cb(new Error('ECONNREFUSED')), 0)
      return fakeSocket
    })
    mockCreateConnection.mockReturnValue(fakeSocket)

    const result = await checkCache()

    expect(result.status).toBe('error')
    expect(result.hint).toContain('REDIS_URL')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/checks/__tests__/cache.test.ts
```

Expected: FAIL with `Cannot find module '../cache'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/checks/cache.ts
import net from 'net'
import type { CheckResult } from '../types'

function tcpProbe(host: string, port: number, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`Connection to ${host}:${port} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve()
    })
    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function checkCache(): Promise<CheckResult> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return {
      status: 'skip',
      message: 'Cache not configured (REDIS_URL not set)',
    }
  }

  let parsed: URL
  try {
    parsed = new URL(redisUrl)
  } catch {
    return {
      status: 'error',
      message: 'REDIS_URL is not a valid URL',
      hint: 'Set REDIS_URL to a valid Redis connection string, e.g. redis://localhost:6379',
    }
  }

  const host = parsed.hostname
  const port = parseInt(parsed.port || '6379', 10)
  const start = performance.now()

  try {
    await tcpProbe(host, port)
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'ok',
      message: `Cache reachable (${host}:${port})`,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown cache error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check REDIS_URL and ensure the Redis server is running and reachable',
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/checks/__tests__/cache.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/server/health/checks/cache.ts src/server/health/checks/__tests__/cache.test.ts
git commit -m "feat(health): add cache check with TCP probe"
```

---

## Task 5: Env config check — required vars without leaking values

**Files:**
- Create: `src/server/health/checks/env-config.ts`
- Create: `src/server/health/checks/__tests__/env-config.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/checks/__tests__/env-config.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { checkEnvConfig } from '../env-config'

describe('checkEnvConfig', () => {
  const originalEnv = { ...process.env }
  afterEach(() => { process.env = { ...originalEnv } })

  function setAllRequired() {
    process.env.DATABASE_URL       = 'postgres://localhost/db'
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32)
    process.env.BETTER_AUTH_URL    = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'
  }

  it('returns ok when all required vars are present', () => {
    setAllRequired()
    const result = checkEnvConfig()
    expect(result.status).toBe('ok')
    expect(result.message).toContain('All required')
    expect(result.detail?.missing).toEqual([])
  })

  it('returns error when DATABASE_URL is missing', () => {
    setAllRequired()
    delete process.env.DATABASE_URL
    const result = checkEnvConfig()
    expect(result.status).toBe('error')
    expect(result.detail?.missing).toContain('DATABASE_URL')
    expect(result.hint).toContain('DATABASE_URL')
  })

  it('returns error when BETTER_AUTH_SECRET is empty string', () => {
    setAllRequired()
    process.env.BETTER_AUTH_SECRET = '   '
    const result = checkEnvConfig()
    expect(result.status).toBe('error')
    expect(result.detail?.missing).toContain('BETTER_AUTH_SECRET')
  })

  it('never leaks the value of any env var', () => {
    setAllRequired()
    process.env.BETTER_AUTH_SECRET = 'super-secret-value-never-leak'
    const result = checkEnvConfig()
    expect(JSON.stringify(result)).not.toContain('super-secret-value-never-leak')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/checks/__tests__/env-config.test.ts
```

Expected: FAIL with `Cannot find module '../env-config'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/checks/env-config.ts
import type { CheckResult } from '../types'

const REQUIRED_VARS: Array<{ key: string; hint: string }> = [
  { key: 'DATABASE_URL',          hint: 'Set DATABASE_URL to a valid PostgreSQL connection string' },
  { key: 'BETTER_AUTH_SECRET',    hint: 'Set BETTER_AUTH_SECRET to a random string of at least 32 characters' },
  { key: 'BETTER_AUTH_URL',       hint: 'Set BETTER_AUTH_URL to the public base URL of your app' },
  { key: 'NEXT_PUBLIC_APP_URL',   hint: 'Set NEXT_PUBLIC_APP_URL to the public URL of your app' },
  { key: 'NEXT_PUBLIC_API_URL',   hint: 'Set NEXT_PUBLIC_API_URL to the public API base URL' },
]

export function checkEnvConfig(): CheckResult {
  const missing: string[] = []
  const hints: string[] = []

  for (const { key, hint } of REQUIRED_VARS) {
    const value = process.env[key]
    if (!value || value.trim() === '') {
      missing.push(key)
      hints.push(hint)
    }
  }

  if (missing.length > 0) {
    return {
      status: 'error',
      message: `Missing required environment variables: ${missing.join(', ')}`,
      hint: hints[0],
      detail: { missing, total: REQUIRED_VARS.length },
    }
  }

  return {
    status: 'ok',
    message: `All required environment variables present (${REQUIRED_VARS.length} checked)`,
    detail: { missing: [], total: REQUIRED_VARS.length },
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/checks/__tests__/env-config.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/server/health/checks/env-config.ts src/server/health/checks/__tests__/env-config.test.ts
git commit -m "feat(health): add env config check without leaking secrets"
```

---

## Task 6: External services check — email provider

**Files:**
- Create: `src/server/health/checks/external-services.ts`
- Create: `src/server/health/checks/__tests__/external-services.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/checks/__tests__/external-services.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { checkExternalServices } from '../external-services'

describe('checkExternalServices', () => {
  const originalEnv = { ...process.env }
  afterEach(() => { process.env = { ...originalEnv } })

  it('returns ok when Resend is configured with a valid key', () => {
    process.env.RESEND_API_KEY   = 're_abc123'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
    delete process.env.SMTP_HOST

    const result = checkExternalServices()

    expect(result.status).toBe('ok')
    expect(result.message).toContain('Resend')
    expect(result.detail?.email).toBe('resend')
  })

  it('returns ok when SMTP is fully configured', () => {
    delete process.env.RESEND_API_KEY
    process.env.SMTP_HOST       = 'smtp.example.com'
    process.env.SMTP_PORT       = '587'
    process.env.SMTP_FROM_EMAIL = 'noreply@example.com'

    const result = checkExternalServices()

    expect(result.status).toBe('ok')
    expect(result.detail?.email).toBe('smtp')
  })

  it('returns degraded when no email provider is configured', () => {
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_HOST

    const result = checkExternalServices()

    expect(result.status).toBe('degraded')
    expect(result.hint).toContain('RESEND_API_KEY')
  })

  it('returns error when Resend key has invalid format', () => {
    process.env.RESEND_API_KEY   = 'invalid-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    const result = checkExternalServices()

    expect(result.status).toBe('error')
    expect(result.hint).toContain('re_')
  })

  it('never leaks any API key value', () => {
    process.env.RESEND_API_KEY = 're_super_secret_key_12345'

    const result = checkExternalServices()

    expect(JSON.stringify(result)).not.toContain('super_secret_key_12345')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/checks/__tests__/external-services.test.ts
```

Expected: FAIL with `Cannot find module '../external-services'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/checks/external-services.ts
import type { CheckResult } from '../types'

type EmailProvider = 'resend' | 'smtp' | 'none'

interface EmailCheck {
  provider: EmailProvider
  ok: boolean
  message: string
  hint?: string
}

function checkEmailProvider(): EmailCheck {
  const resendKey  = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM_EMAIL

  if (resendKey) {
    if (!resendKey.startsWith('re_')) {
      return {
        provider: 'resend', ok: false,
        message: 'RESEND_API_KEY has invalid format (must start with re_)',
        hint: 'Resend API keys start with re_ — verify your key at resend.com/api-keys',
      }
    }
    if (!resendFrom) {
      return {
        provider: 'resend', ok: false,
        message: 'RESEND_FROM_EMAIL is not set',
        hint: 'Set RESEND_FROM_EMAIL to a verified sender address in your Resend account',
      }
    }
    return { provider: 'resend', ok: true, message: 'Email configured via Resend' }
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpFrom = process.env.SMTP_FROM_EMAIL

  if (smtpHost) {
    if (!smtpPort || !smtpFrom) {
      const missing = [!smtpPort && 'SMTP_PORT', !smtpFrom && 'SMTP_FROM_EMAIL'].filter(Boolean).join(', ')
      return {
        provider: 'smtp', ok: false,
        message: `SMTP partially configured — missing: ${missing}`,
        hint: `Set the missing SMTP variables: ${missing}`,
      }
    }
    return { provider: 'smtp', ok: true, message: `Email configured via SMTP (${smtpHost}:${smtpPort})` }
  }

  return {
    provider: 'none', ok: false,
    message: 'No email provider configured — emails will only appear in server logs',
    hint: 'Configure RESEND_API_KEY + RESEND_FROM_EMAIL, or SMTP_HOST + SMTP_PORT + SMTP_FROM_EMAIL',
  }
}

export function checkExternalServices(): CheckResult {
  const email = checkEmailProvider()

  if (!email.ok && email.provider === 'none') {
    return {
      status: 'degraded',
      message: email.message,
      hint: email.hint,
      detail: { email: email.provider },
    }
  }

  if (!email.ok) {
    return {
      status: 'error',
      message: email.message,
      hint: email.hint,
      detail: { email: email.provider },
    }
  }

  return {
    status: 'ok',
    message: email.message,
    detail: { email: email.provider },
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/checks/__tests__/external-services.test.ts
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/server/health/checks/external-services.ts src/server/health/checks/__tests__/external-services.test.ts
git commit -m "feat(health): add external services check (email provider)"
```

---

## Task 7: Queue check — pending job count + worker status

**Files:**
- Create: `src/server/health/checks/queue.ts`
- Create: `src/server/health/checks/__tests__/queue.test.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/checks/__tests__/queue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))
vi.mock('@/server/email/worker', () => ({
  getWorkerStatus: vi.fn(),
}))

import { db } from '@/lib/db'
import { getWorkerStatus } from '@/server/email/worker'
import { checkQueue } from '../queue'

const mockExecute    = vi.mocked(db.execute)
const mockWorkerStatus = vi.mocked(getWorkerStatus)

describe('checkQueue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok when queue is healthy and worker is running', async () => {
    mockWorkerStatus.mockReturnValue({ isRunning: true, isProcessing: false })
    mockExecute.mockResolvedValue([{ count: 3 }] as never)

    const result = await checkQueue()

    expect(result.status).toBe('ok')
    expect(result.detail?.pendingJobs).toBe(3)
    expect(result.detail?.workerRunning).toBe(true)
  })

  it('returns degraded when worker is not running', async () => {
    mockWorkerStatus.mockReturnValue({ isRunning: false, isProcessing: false })
    mockExecute.mockResolvedValue([{ count: 0 }] as never)

    const result = await checkQueue()

    expect(result.status).toBe('degraded')
    expect(result.hint).toContain('worker')
  })

  it('returns error when DB query fails', async () => {
    mockWorkerStatus.mockReturnValue({ isRunning: true, isProcessing: false })
    mockExecute.mockRejectedValue(new Error('relation "email_jobs" does not exist'))

    const result = await checkQueue()

    expect(result.status).toBe('error')
    expect(result.hint).toContain('migrations')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/checks/__tests__/queue.test.ts
```

Expected: FAIL with `Cannot find module '../queue'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/checks/queue.ts
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
```

**Step 4: Run test to verify it passes**

```bash
bun run test src/server/health/checks/__tests__/queue.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/server/health/checks/queue.ts src/server/health/checks/__tests__/queue.test.ts
git commit -m "feat(health): add queue check with pending count and worker status"
```

---

## Task 8: Health service — aggregator + overall status

**Files:**
- Create: `src/server/health/health-service.ts`
- Create: `src/server/health/__tests__/health-service.test.ts`
- Update: `src/server/health/index.ts`

**Step 1: Write the failing test**

```typescript
// src/server/health/__tests__/health-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../checks/database',          () => ({ checkDatabase:         vi.fn() }))
vi.mock('../checks/storage',           () => ({ checkStorage:          vi.fn() }))
vi.mock('../checks/cache',             () => ({ checkCache:            vi.fn() }))
vi.mock('../checks/env-config',        () => ({ checkEnvConfig:        vi.fn() }))
vi.mock('../checks/external-services', () => ({ checkExternalServices: vi.fn() }))
vi.mock('../checks/queue',             () => ({ checkQueue:            vi.fn() }))

import { checkDatabase }         from '../checks/database'
import { checkStorage }          from '../checks/storage'
import { checkCache }            from '../checks/cache'
import { checkEnvConfig }        from '../checks/env-config'
import { checkExternalServices } from '../checks/external-services'
import { checkQueue }            from '../checks/queue'
import { runHealthChecks }       from '../health-service'

import type { CheckResult } from '../types'

const ok       = (msg = 'ok'):       CheckResult => ({ status: 'ok',       message: msg })
const degraded = (msg = 'degraded'): CheckResult => ({ status: 'degraded', message: msg })
const error    = (msg = 'error'):    CheckResult => ({ status: 'error',    message: msg })
const skip     = (msg = 'skip'):     CheckResult => ({ status: 'skip',     message: msg })

function setupMocks(overrides: Partial<Record<'database'|'storage'|'cache'|'envConfig'|'email'|'queue', CheckResult>> = {}) {
  vi.mocked(checkDatabase).mockResolvedValue(overrides.database ?? ok())
  vi.mocked(checkStorage).mockResolvedValue(overrides.storage ?? ok())
  vi.mocked(checkCache).mockResolvedValue(overrides.cache ?? skip())
  vi.mocked(checkEnvConfig).mockReturnValue(overrides.envConfig ?? ok())
  vi.mocked(checkExternalServices).mockReturnValue(overrides.email ?? ok())
  vi.mocked(checkQueue).mockResolvedValue(overrides.queue ?? ok())
}

describe('runHealthChecks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns READY when all checks are ok or skip', async () => {
    setupMocks()
    const report = await runHealthChecks()
    expect(report.overall).toBe('READY')
    expect(report.timestamp).toBeTruthy()
    expect(report.checks).toHaveProperty('database')
  })

  it('returns DEGRADED when any check is degraded', async () => {
    setupMocks({ cache: degraded('Cache slow') })
    const report = await runHealthChecks()
    expect(report.overall).toBe('DEGRADED')
  })

  it('returns NOT READY when any check has error status', async () => {
    setupMocks({ database: error('DB down') })
    const report = await runHealthChecks()
    expect(report.overall).toBe('NOT READY')
  })

  it('NOT READY takes precedence over DEGRADED', async () => {
    setupMocks({ database: error('DB down'), cache: degraded('Cache slow') })
    const report = await runHealthChecks()
    expect(report.overall).toBe('NOT READY')
  })

  it('runs async checks in parallel — completes in ~50ms not ~200ms', async () => {
    const delay = (ms: number) => new Promise<CheckResult>(r => setTimeout(() => r(ok()), ms))
    vi.mocked(checkDatabase).mockImplementation(() => delay(50))
    vi.mocked(checkStorage).mockImplementation(() => delay(50))
    vi.mocked(checkCache).mockImplementation(() => delay(50))
    vi.mocked(checkEnvConfig).mockReturnValue(ok())
    vi.mocked(checkExternalServices).mockReturnValue(ok())
    vi.mocked(checkQueue).mockImplementation(() => delay(50))

    const start = Date.now()
    await runHealthChecks()
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(150)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/server/health/__tests__/health-service.test.ts
```

Expected: FAIL with `Cannot find module '../health-service'`

**Step 3: Write minimal implementation**

```typescript
// src/server/health/health-service.ts
import { checkDatabase }         from './checks/database'
import { checkStorage }          from './checks/storage'
import { checkCache }            from './checks/cache'
import { checkEnvConfig }        from './checks/env-config'
import { checkExternalServices } from './checks/external-services'
import { checkQueue }            from './checks/queue'
import type { CheckResult, CheckStatus, HealthReport, OverallStatus } from './types'

function computeOverall(checks: Record<string, CheckResult>): OverallStatus {
  const statuses = Object.values(checks).map((c) => c.status) as CheckStatus[]
  if (statuses.includes('error'))    return 'NOT READY'
  if (statuses.includes('degraded')) return 'DEGRADED'
  return 'READY'
}

export async function runHealthChecks(): Promise<HealthReport> {
  const [database, storage, cache, queue] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkCache(),
    checkQueue(),
  ])

  // Synchronous checks — no I/O needed
  const envConfig = checkEnvConfig()
  const email     = checkExternalServices()

  const checks = { database, storage, cache, envConfig, email, queue }

  return {
    overall: computeOverall(checks),
    timestamp: new Date().toISOString(),
    checks,
  }
}
```

**Step 4: Update the barrel**

```typescript
// src/server/health/index.ts
export type { CheckResult, CheckStatus, HealthReport, OverallStatus } from './types'
export { runHealthChecks } from './health-service'
```

**Step 5: Run tests to verify all pass**

```bash
bun run test src/server/health/__tests__/health-service.test.ts
```

Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add src/server/health/health-service.ts src/server/health/__tests__/health-service.test.ts src/server/health/index.ts
git commit -m "feat(health): add health service aggregator with parallel checks and overall status"
```

---

## Task 9: Upgrade GET /api/health

The current handler at `src/app/api/health/route.ts` returns a trivial `{ status: 'ok' }`. Replace the GET handler with the full health report. Keep the `HEAD` handler.

**Files:**
- Modify: `src/app/api/health/route.ts`
- Create: `src/app/api/health/__tests__/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/app/api/health/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/health', () => ({
  runHealthChecks: vi.fn(),
}))

import { runHealthChecks } from '@/server/health'
import { GET } from '../route'

import type { HealthReport } from '@/server/health'

function makeReport(overall: HealthReport['overall']): HealthReport {
  return {
    overall,
    timestamp: '2026-01-01T00:00:00.000Z',
    checks: {
      database:  { status: 'ok',   message: 'ok' },
      storage:   { status: 'ok',   message: 'ok' },
      cache:     { status: 'skip', message: 'skip' },
      envConfig: { status: 'ok',   message: 'ok' },
      email:     { status: 'ok',   message: 'ok' },
      queue:     { status: 'ok',   message: 'ok' },
    },
  }
}

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with full report when READY', async () => {
    vi.mocked(runHealthChecks).mockResolvedValue(makeReport('READY'))
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.overall).toBe('READY')
    expect(body.checks).toBeDefined()
    expect(body.timestamp).toBeTruthy()
  })

  it('returns 503 when NOT READY', async () => {
    vi.mocked(runHealthChecks).mockResolvedValue(makeReport('NOT READY'))
    const response = await GET()
    expect(response.status).toBe(503)
  })

  it('returns 200 when DEGRADED', async () => {
    vi.mocked(runHealthChecks).mockResolvedValue(makeReport('DEGRADED'))
    const response = await GET()
    expect(response.status).toBe(200)
    expect((await response.json()).overall).toBe('DEGRADED')
  })

  it('returns 500 if health service throws unexpectedly', async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(new Error('Unexpected'))
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test src/app/api/health/__tests__/route.test.ts
```

Expected: FAIL — current GET returns `{ status: 'ok' }` without `checks` or proper HTTP status

**Step 3: Replace the GET handler**

```typescript
// src/app/api/health/route.ts
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
```

**Step 4: Run tests to verify pass**

```bash
bun run test src/app/api/health/__tests__/route.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/app/api/health/route.ts src/app/api/health/__tests__/route.test.ts
git commit -m "feat(health): upgrade /api/health to full health report with HTTP 503 on NOT READY"
```

---

## Task 10: Health feature module — hook + components + screen

No unit tests in this task — the logic lives in the server-side checks (already tested). The UI composes tested primitives.

**Files:**
- Create: `src/features/health/types/index.ts`
- Create: `src/features/health/api/get-health.ts`
- Create: `src/features/health/hooks/use-health.ts`
- Create: `src/features/health/components/overall-badge.tsx`
- Create: `src/features/health/components/check-card.tsx`
- Create: `src/features/health/screens/health-screen.tsx`
- Create: `src/features/health/index.ts`

**Step 1: Feature types** (mirrors server types — avoids importing server code in client bundle)

```typescript
// src/features/health/types/index.ts
export type CheckStatus  = 'ok' | 'degraded' | 'error' | 'skip'
export type OverallStatus = 'READY' | 'DEGRADED' | 'NOT READY'

export interface CheckResult {
  status: CheckStatus
  message: string
  latencyMs?: number
  hint?: string
  detail?: Record<string, unknown>
}

export interface HealthReport {
  overall: OverallStatus
  timestamp: string
  checks: {
    database:  CheckResult
    storage:   CheckResult
    cache:     CheckResult
    envConfig: CheckResult
    email:     CheckResult
    queue:     CheckResult
  }
}
```

**Step 2: API fetcher**

```typescript
// src/features/health/api/get-health.ts
import type { HealthReport } from '../types'

export async function getHealth(): Promise<HealthReport> {
  // Accept 503 (NOT READY) — it still returns valid JSON
  const res = await fetch('/api/health', { cache: 'no-store' })
  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check request failed: ${res.status}`)
  }
  return res.json()
}
```

**Step 3: React Query hook**

```typescript
// src/features/health/hooks/use-health.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/get-health'

export function useHealth(refetchIntervalMs = 30_000) {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: refetchIntervalMs,
    retry: 1,
  })
}
```

**Step 4: Overall status badge**

```tsx
// src/features/health/components/overall-badge.tsx
import { cn } from '@/lib/cn'
import type { OverallStatus } from '../types'

const config: Record<OverallStatus, { label: string; className: string }> = {
  'READY':     { label: 'READY',     className: 'bg-green-100  text-green-800  border-green-200'  },
  'DEGRADED':  { label: 'DEGRADED',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'NOT READY': { label: 'NOT READY', className: 'bg-red-100    text-red-800    border-red-200'    },
}

export function OverallBadge({ status }: { status: OverallStatus }) {
  const { label, className } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tracking-wide',
        className
      )}
    >
      {label}
    </span>
  )
}
```

**Step 5: Per-service check card**

```tsx
// src/features/health/components/check-card.tsx
import { cn } from '@/lib/cn'
import type { CheckResult, CheckStatus } from '../types'

const statusConfig: Record<CheckStatus, { dot: string; label: string }> = {
  ok:       { dot: 'bg-green-500',  label: 'OK'       },
  degraded: { dot: 'bg-yellow-500', label: 'Degraded' },
  error:    { dot: 'bg-red-500',    label: 'Error'    },
  skip:     { dot: 'bg-gray-400',   label: 'N/A'      },
}

export function CheckCard({ name, result }: { name: string; result: CheckResult }) {
  const { dot, label } = statusConfig[result.status]

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{name}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', dot)} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{result.message}</p>

      {result.latencyMs !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">{result.latencyMs}ms</p>
      )}

      {result.hint && (
        <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Hint: </span>{result.hint}
        </div>
      )}

      {result.detail && result.status !== 'ok' && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Details</summary>
          <pre className="text-xs mt-1 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(result.detail, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
```

**Step 6: Health screen**

```tsx
// src/features/health/screens/health-screen.tsx
'use client'

import { useHealth } from '../hooks/use-health'
import { OverallBadge } from '../components/overall-badge'
import { CheckCard } from '../components/check-card'
import type { CheckResult } from '../types'

const CHECK_LABELS: Record<string, string> = {
  database:  'Database',
  storage:   'Storage',
  cache:     'Cache',
  envConfig: 'Environment Config',
  email:     'External Services (Email)',
  queue:     'Queue / Background Jobs',
}

export function HealthScreen() {
  const { data, isLoading, error, dataUpdatedAt } = useHealth(30_000)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Running health checks…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive text-sm">
          Failed to load health data. Is the server reachable?
        </p>
      </div>
    )
  }

  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '—'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last checked at {lastChecked} · Auto-refreshes every 30s
          </p>
        </div>
        <OverallBadge status={data.overall} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(data.checks) as [string, CheckResult][]).map(([key, result]) => (
          <CheckCard
            key={key}
            name={CHECK_LABELS[key] ?? key}
            result={result}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Checked at {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  )
}
```

**Step 7: Feature barrel**

```typescript
// src/features/health/index.ts
export { HealthScreen } from './screens/health-screen'
export type { CheckResult, CheckStatus, HealthReport, OverallStatus } from './types'
```

**Step 8: Commit**

```bash
git add src/features/health/
git commit -m "feat(health): add health feature module (hook, components, screen)"
```

---

## Task 11: Standalone health page

**Files:**
- Create: `src/app/(public)/health/page.tsx`

The `(public)` route group already has a `layout.tsx` (no-auth shell). This page inherits it automatically — no new layout needed.

**Step 1: Create the thin page**

```tsx
// src/app/(public)/health/page.tsx
import type { Metadata } from 'next'
import { HealthScreen } from '@/features/health'

export const metadata: Metadata = {
  title: 'Platform Health',
  description: 'Real-time status of all platform dependencies',
  robots: { index: false, follow: false },
}

export default function HealthPage() {
  return <HealthScreen />
}
```

**Step 2: Verify the page renders**

```bash
bun run dev
# Open http://localhost:3000/health
# Expect: "Platform Health" heading, 6 check cards, overall badge, no login required
```

**Step 3: Run full test suite to catch regressions**

```bash
bun run test
bun run typecheck
```

Expected: all new tests pass; no pre-existing tests broken.

**Step 4: Commit**

```bash
git add src/app/(public)/health/page.tsx
git commit -m "feat(health): add standalone /health page"
```

---

## All files at a glance

| Action | Path |
|--------|------|
| Create | `src/server/health/types.ts` |
| Create | `src/server/health/index.ts` |
| Create | `src/server/health/health-service.ts` |
| Create | `src/server/health/checks/database.ts` |
| Create | `src/server/health/checks/storage.ts` |
| Create | `src/server/health/checks/cache.ts` |
| Create | `src/server/health/checks/env-config.ts` |
| Create | `src/server/health/checks/external-services.ts` |
| Create | `src/server/health/checks/queue.ts` |
| Create | `src/server/health/__tests__/types.test.ts` |
| Create | `src/server/health/__tests__/health-service.test.ts` |
| Create | `src/server/health/checks/__tests__/database.test.ts` |
| Create | `src/server/health/checks/__tests__/storage.test.ts` |
| Create | `src/server/health/checks/__tests__/cache.test.ts` |
| Create | `src/server/health/checks/__tests__/env-config.test.ts` |
| Create | `src/server/health/checks/__tests__/external-services.test.ts` |
| Create | `src/server/health/checks/__tests__/queue.test.ts` |
| **Modify** | `src/app/api/health/route.ts` |
| Create | `src/app/api/health/__tests__/route.test.ts` |
| Create | `src/features/health/types/index.ts` |
| Create | `src/features/health/api/get-health.ts` |
| Create | `src/features/health/hooks/use-health.ts` |
| Create | `src/features/health/components/overall-badge.tsx` |
| Create | `src/features/health/components/check-card.tsx` |
| Create | `src/features/health/screens/health-screen.tsx` |
| Create | `src/features/health/index.ts` |
| Create | `src/app/(public)/health/page.tsx` |

---

## Design decisions recorded here

| Decision | Rationale |
|----------|-----------|
| New `src/server/health/` module, not extending `src/server/setup/health-check-service.ts` | The setup service uses a different shape (`ServiceHealthStatus`) scoped to the wizard. The two are independent; modifying the setup one would risk breaking the setup wizard. |
| Storage check uses write/read/delete (not HeadBucket) | Requirement says "read/write accessibility". HeadBucket only proves credentials + bucket exists, not write permission. |
| Cache check uses `net.createConnection` TCP probe | No Redis client library in the codebase — pulling in ioredis for a health check violates YAGNI. A TCP probe confirms the port is open and latency, which is the useful signal. |
| `status: 'skip'` for unconfigured optional services (cache) | Distinguishes "not running" (error/degraded) from "intentionally not deployed" (skip). Avoids false DEGRADED on fresh installs without Redis. |
| Email-only external services check | The platform's only third-party integration is email (Resend/SMTP). OAuth providers are configured server-side by the same env vars the env-config check already covers. |
| HTTP 200 for `DEGRADED`, HTTP 503 for `NOT READY` | Monitoring systems use 5xx to page on-call. DEGRADED means "usable but impaired" — don't wake someone at 3am for a missing Redis. NOT READY means "core service is down" — do page. |
