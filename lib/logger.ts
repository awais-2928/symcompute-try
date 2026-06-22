import winston from 'winston';
import 'winston-daily-rotate-file';
import GelfTransport from 'winston-gelf';

// Log levels configuration
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
} as const;

winston.addColors(LOG_COLORS);

// Environment variables with defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_ENABLED = process.env.LOG_ENABLED === 'true' || process.env.NODE_ENV === 'production';
const GRAYLOG_ENABLED = process.env.GRAYLOG_ENABLED === 'true';
const GRAYLOG_HOST = process.env.GRAYLOG_HOST || 'localhost';
const GRAYLOG_PORT = parseInt(process.env.GRAYLOG_PORT || '12201');
const GRAYLOG_PROTOCOL = process.env.GRAYLOG_PROTOCOL || 'udp';
const GRAYLOG_FACILITY = process.env.GRAYLOG_FACILITY || 'nextjs-app';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs';
const LOG_FILE_MAX_SIZE = process.env.LOG_FILE_MAX_SIZE || '20m';
const LOG_FILE_MAX_FILES = process.env.LOG_FILE_MAX_FILES || '14d';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: consoleFormat,
    })
  );
}

// File transports (enabled when LOG_ENABLED is true)
if (LOG_ENABLED) {
  // Error log file
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: `${LOG_FILE_PATH}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: LOG_FILE_MAX_SIZE,
      maxFiles: LOG_FILE_MAX_FILES,
      zippedArchive: true,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: `${LOG_FILE_PATH}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: LOG_LEVEL,
      format: fileFormat,
      maxSize: LOG_FILE_MAX_SIZE,
      maxFiles: LOG_FILE_MAX_FILES,
      zippedArchive: true,
    })
  );
}

// Graylog transport (enabled when GRAYLOG_ENABLED is true)
if (GRAYLOG_ENABLED) {
  transports.push(
    new GelfTransport({
      host: GRAYLOG_HOST,
      port: GRAYLOG_PORT,
      protocol: GRAYLOG_PROTOCOL as 'udp' | 'tcp',
      facility: GRAYLOG_FACILITY,
      level: LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: LOG_LEVELS,
  format: fileFormat,
  transports,
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: LOG_ENABLED ? [
    new winston.transports.DailyRotateFile({
      filename: `${LOG_FILE_PATH}/exceptions-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: LOG_FILE_MAX_SIZE,
      maxFiles: LOG_FILE_MAX_FILES,
      zippedArchive: true,
    })
  ] : [],
  rejectionHandlers: LOG_ENABLED ? [
    new winston.transports.DailyRotateFile({
      filename: `${LOG_FILE_PATH}/rejections-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: LOG_FILE_MAX_SIZE,
      maxFiles: LOG_FILE_MAX_FILES,
      zippedArchive: true,
    })
  ] : [],
  exitOnError: false,
});

// Create logs directory if it doesn't exist
if (LOG_ENABLED && typeof window === 'undefined') {
  const fs = require('fs');
  const path = require('path');
  const logDir = path.resolve(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Enhanced logger with additional methods
export const createLogger = (service?: string) => {
  const serviceLogger = logger.child({ service: service || 'app' });
  
  return {
    error: (message: string, meta?: any) => serviceLogger.error(message, meta),
    warn: (message: string, meta?: any) => serviceLogger.warn(message, meta),
    info: (message: string, meta?: any) => serviceLogger.info(message, meta),
    http: (message: string, meta?: any) => serviceLogger.http(message, meta),
    debug: (message: string, meta?: any) => serviceLogger.debug(message, meta),
    
    // Additional utility methods
    logRequest: (req: any, res: any, responseTime?: number) => {
      serviceLogger.http('HTTP Request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: responseTime ? `${responseTime}ms` : undefined,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress,
      });
    },
    
    logError: (error: Error, context?: any) => {
      serviceLogger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context,
      });
    },
    
    logAuth: (action: string, userId?: string, details?: any) => {
      serviceLogger.info(`Auth ${action}`, {
        userId,
        ...details,
      });
    },
    
    logDatabase: (operation: string, table?: string, details?: any) => {
      serviceLogger.debug(`Database ${operation}`, {
        table,
        ...details,
      });
    },
  };
};

// Default logger instance
export const loggerInstance = createLogger();

// Export the logger instance as default
export default loggerInstance;
