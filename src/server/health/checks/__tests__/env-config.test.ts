import { describe, it, expect, afterEach } from 'vitest'
import { checkEnvConfig } from '../env-config'

describe('checkEnvConfig', () => {
  const originalEnv = { ...process.env }
  afterEach(() => { process.env = { ...originalEnv } })

  function setAllRequired() {
    process.env.DATABASE_URL        = 'postgres://localhost/db'
    process.env.BETTER_AUTH_SECRET  = 'a'.repeat(32)
    process.env.BETTER_AUTH_URL     = 'http://localhost:3000'
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

  it('returns error when BETTER_AUTH_SECRET is only whitespace', () => {
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
