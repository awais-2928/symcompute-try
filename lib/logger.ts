// lib/logger.ts
// Safe logger that works in both Edge and Node.js environments
// Replaces Winston to prevent Edge Runtime crashes

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const currentLevel = levels[LOG_LEVEL] ?? 2;

function shouldLog(level: string): boolean {
  return (levels[level] ?? 99) <= currentLevel;
}

function formatMessage(service: string, level: string, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta as object).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}] [${service}]: ${message}${metaStr}`;
}

export const createLogger = (service = 'app') => {
  return {
    error: (message: string, meta?: unknown) => {
      if (shouldLog('error')) console.error(formatMessage(service, 'error', message, meta));
    },
    warn: (message: string, meta?: unknown) => {
      if (shouldLog('warn')) console.warn(formatMessage(service, 'warn', message, meta));
    },
    info: (message: string, meta?: unknown) => {
      if (shouldLog('info')) console.log(formatMessage(service, 'info', message, meta));
    },
    http: (message: string, meta?: unknown) => {
      if (shouldLog('http')) console.log(formatMessage(service, 'http', message, meta));
    },
    debug: (message: string, meta?: unknown) => {
      if (shouldLog('debug')) console.log(formatMessage(service, 'debug', message, meta));
    },
    logRequest: (req: { method?: string; url?: string; headers?: Record<string, string>; ip?: string }, res: { statusCode?: number }, responseTime?: number) => {
      if (shouldLog('http')) {
        console.log(formatMessage(service, 'http', 'HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime: responseTime ? `${responseTime}ms` : undefined,
        }));
      }
    },
    logError: (error: Error, context?: unknown) => {
      if (shouldLog('error')) {
        console.error(formatMessage(service, 'error', 'Application Error', {
          message: error.message,
          name: error.name,
          ...(context as object ?? {}),
        }));
      }
    },
    logAuth: (action: string, userId?: string, details?: unknown) => {
      if (shouldLog('info')) {
        console.log(formatMessage(service, 'info', `Auth ${action}`, { userId, ...(details as object ?? {}) }));
      }
    },
    logDatabase: (operation: string, table?: string, details?: unknown) => {
      if (shouldLog('debug')) {
        console.log(formatMessage(service, 'debug', `Database ${operation}`, { table, ...(details as object ?? {}) }));
      }
    },
  };
};

const loggerInstance = createLogger();
export default loggerInstance;
