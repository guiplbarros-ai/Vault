/**
 * Structured logger for Cortex Cash
 *
 * Usage:
 *   import { logger } from '@/lib/utils/logger'
 *   logger.info('Message', { data })
 *   logger.error('Error occurred', error)
 *   logger.debug('Debug info', { details })
 *
 * In production, debug logs are suppressed.
 * Set LOG_LEVEL=debug in .env.local to enable debug logs in dev.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const isDev = process.env.NODE_ENV === 'development'
const minLevel = isDev ? 'debug' : 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel]
}

function formatMessage(level: LogLevel, message: string, context?: LogContext | Error): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  if (!context) {
    return `${prefix} ${message}`
  }

  if (context instanceof Error) {
    return `${prefix} ${message}: ${context.message}\n${context.stack || ''}`
  }

  return `${prefix} ${message} ${JSON.stringify(context)}`
}

function log(level: LogLevel, message: string, context?: LogContext | Error): void {
  if (!shouldLog(level)) return

  const formatted = formatMessage(level, message, context)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext | Error) => log('error', message, context),

  /**
   * Log a group of related messages (useful for seed operations)
   */
  group: (label: string, fn: () => void): void => {
    if (!shouldLog('debug')) {
      fn()
      return
    }
    console.group(label)
    fn()
    console.groupEnd()
  },

  /**
   * Create a child logger with a fixed prefix
   */
  child: (prefix: string) => ({
    debug: (message: string, context?: LogContext) => log('debug', `[${prefix}] ${message}`, context),
    info: (message: string, context?: LogContext) => log('info', `[${prefix}] ${message}`, context),
    warn: (message: string, context?: LogContext) => log('warn', `[${prefix}] ${message}`, context),
    error: (message: string, context?: LogContext | Error) => log('error', `[${prefix}] ${message}`, context),
  }),
}

export default logger
