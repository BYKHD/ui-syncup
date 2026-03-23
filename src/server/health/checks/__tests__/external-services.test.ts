import { describe, it, expect, afterEach } from 'vitest'
import { checkExternalServices } from '../external-services'

describe('checkExternalServices', () => {
  const originalEnv = { ...process.env }
  afterEach(() => { process.env = { ...originalEnv } })

  it('returns ok when Resend is configured with a valid key', () => {
    process.env.RESEND_API_KEY    = 're_abc123'
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
    process.env.RESEND_API_KEY    = 'invalid-key'
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
