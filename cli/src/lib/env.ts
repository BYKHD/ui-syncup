import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

export const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'REDIS_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
]

export const ENV_EXAMPLE_URL =
  'https://github.com/BYKHD/ui-syncup/blob/main/.env.example'

export function parseEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return vars
}

export function writeEnv(filePath: string, vars: Record<string, string>): void {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`)
  writeFileSync(filePath, lines.join('\n') + '\n', { mode: 0o600 })
}

export function generateSecret(): string {
  return randomBytes(32).toString('hex')
}

export function getMissingVars(vars: Record<string, string>): string[] {
  return REQUIRED_VARS.filter(k => !vars[k] || vars[k].trim() === '')
}
