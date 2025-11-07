/**
 * Centralized logging utility
 * Control all console logs from this single file
 */

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
}

// Convenience exports
export const { debug, info, warn, error } = logger
