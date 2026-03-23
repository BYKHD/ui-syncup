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
