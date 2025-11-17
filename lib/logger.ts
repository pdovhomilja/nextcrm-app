/**
 * Centralized Logging for NextCRM
 *
 * Provides structured logging with different severity levels
 * Compatible with Vercel logging and external log aggregation services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  requestId?: string;
  environment: string;
}

/**
 * Main logging function
 */
export function log(
  level: LogLevel,
  message: string,
  data?: any,
  context?: string
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
    ...(context && { context }),
    ...(data && { data }),
  };

  // Add request context if available
  if (typeof window !== 'undefined' && window.requestId) {
    logEntry.requestId = window.requestId;
  }

  // Format log based on environment
  const formattedLog = process.env.NODE_ENV === 'production'
    ? JSON.stringify(logEntry)
    : formatDevLog(logEntry);

  // Output to appropriate console method
  switch (level) {
    case LogLevel.ERROR:
      console.error(formattedLog);
      break;
    case LogLevel.WARN:
      console.warn(formattedLog);
      break;
    case LogLevel.DEBUG:
      if (process.env.NODE_ENV === 'development') {
        console.debug(formattedLog);
      }
      break;
    default:
      console.log(formattedLog);
  }
}

/**
 * Format log for development environment
 */
function formatDevLog(entry: LogEntry): string {
  const emoji = {
    [LogLevel.DEBUG]: '🔍',
    [LogLevel.INFO]: 'ℹ️',
    [LogLevel.WARN]: '⚠️',
    [LogLevel.ERROR]: '🚨',
  };

  let output = `${emoji[entry.level]} [${entry.level.toUpperCase()}] ${entry.message}`;

  if (entry.context) {
    output += ` (${entry.context})`;
  }

  if (entry.data) {
    output += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
  }

  return output;
}

/**
 * Convenience methods
 */
export const logger = {
  debug: (message: string, data?: any, context?: string) =>
    log(LogLevel.DEBUG, message, data, context),

  info: (message: string, data?: any, context?: string) =>
    log(LogLevel.INFO, message, data, context),

  warn: (message: string, data?: any, context?: string) =>
    log(LogLevel.WARN, message, data, context),

  error: (message: string, error?: Error | any, context?: string) => {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

    log(LogLevel.ERROR, message, errorData, context);
  },
};

/**
 * API request logger middleware
 */
export function logApiRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number
): void {
  const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;

  log(level, `API Request: ${method} ${url}`, {
    method,
    url,
    statusCode,
    duration,
  }, 'api');
}

/**
 * Database query logger
 */
export function logDatabaseQuery(
  query: string,
  duration: number,
  error?: Error
): void {
  const level = error ? LogLevel.ERROR : LogLevel.DEBUG;

  log(level, 'Database Query', {
    query: query.substring(0, 200), // Truncate long queries
    duration,
    ...(error && { error: error.message }),
  }, 'database');
}

/**
 * Security event logger
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: any
): void {
  const level = severity === 'critical' || severity === 'high'
    ? LogLevel.ERROR
    : LogLevel.WARN;

  log(level, `Security Event: ${event}`, {
    severity,
    ...details,
  }, 'security');
}

// Global type declaration
declare global {
  interface Window {
    requestId?: string;
  }
}
