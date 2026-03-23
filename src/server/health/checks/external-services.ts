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
      const missing = [!smtpPort && 'SMTP_PORT', !smtpFrom && 'SMTP_FROM_EMAIL']
        .filter(Boolean)
        .join(', ')
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
