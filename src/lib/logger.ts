/**
 * Centralized logging utility
 * Control all console logs from this single file
 */

import { createHash, randomUUID } from 'crypto'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

interface LoggerConfig {
  level: LogLevel
  enabled: boolean
  timestamp: boolean
  prefix?: string
}

const config: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  enabled: process.env.NODE_ENV !== 'production',
  timestamp: true,
  prefix: '[App]',
}

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
}

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false
  return levels[level] >= levels[config.level]
}

function formatMessage(level: LogLevel, ...args: unknown[]): unknown[] {
  const parts: unknown[] = []
  
  if (config.timestamp) {
    parts.push(`[${new Date().toISOString()}]`)
  }
  
  if (config.prefix) {
    parts.push(config.prefix)
  }
  
  parts.push(`[${level.toUpperCase()}]`)
  parts.push(...args)
  
  return parts
}

// Auth event types
export type AuthEventType =
  // Authentication events
  | 'auth.signup.attempt'
  | 'auth.signup.success'
  | 'auth.signup.failure'
  | 'auth.login.attempt'
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout.success'
  | 'auth.verify_email.attempt'
  | 'auth.verify_email.success'
  | 'auth.verify_email.failure'
  | 'auth.reset_password.request'
  | 'auth.reset_password.success'
  | 'auth.reset_password.failure'
  // Dev/Testing events
  | 'auth.delete_account.success'
  | 'auth.delete_account.failure'
  | 'auth.delete_account.error'
  | 'auth.force_verify.success'
  | 'auth.force_verify.failure'
  | 'auth.force_verify.error'
  | 'auth.list_sessions.success'
  | 'auth.list_sessions.failure'
  | 'auth.list_sessions.error'
  // Security events
  | 'auth.rate_limit.exceeded'
  | 'auth.token.tampered'
  | 'auth.session.tampered'
  | 'auth.reauth.required'
  | 'auth.reauth.failure'
  // Email events
  | 'email.queued'
  | 'email.sent'
  | 'email.failed'
  | 'email.retry'

export type AuthEventOutcome = 'success' | 'failure' | 'error'

export interface AuthLogEvent {
  // Event identification
  eventId: string
  eventType: AuthEventType
  timestamp: string
  
  // User context
  userId?: string
  email?: string // Hashed for PII protection
  
  // Request context
  ipAddress?: string
  userAgent?: string
  requestId?: string
  
  // Outcome
  outcome: AuthEventOutcome
  errorCode?: string
  errorMessage?: string
  
  // Additional context
  metadata?: Record<string, unknown>
}

/**
 * Hash email address for PII protection in logs
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16)
}

/**
 * Log authentication event with structured format
 */
export function logAuthEvent(
  eventType: AuthEventType,
  context: Omit<AuthLogEvent, 'eventId' | 'eventType' | 'timestamp'> & {
    email?: string // Will be hashed automatically
  }
): void {
  const event: AuthLogEvent = {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    ...context,
    // Hash email if provided
    email: context.email ? hashEmail(context.email) : undefined,
  }
  
  // Determine log level based on outcome
  const level: LogLevel = 
    event.outcome === 'error' ? 'error' :
    event.outcome === 'failure' ? 'warn' :
    'info'
  
  // Log structured event
  if (shouldLog(level)) {
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
    logFn(JSON.stringify(event))
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(...formatMessage('debug', ...args))
    }
  },

  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info(...formatMessage('info', ...args))
    }
  },

  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(...formatMessage('warn', ...args))
    }
  },

  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(...formatMessage('error', ...args))
    }
  },

  // Configure logger at runtime
  configure: (newConfig: Partial<LoggerConfig>) => {
    Object.assign(config, newConfig)
  },

  // Get current config
  getConfig: () => ({ ...config }),
  
  // Auth event logging
  authEvent: logAuthEvent,
}

// Convenience exports
export const { debug, info, warn, error } = logger
