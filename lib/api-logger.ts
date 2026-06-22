import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from './logger';

const logger = createLogger('api');

export interface LoggedRequest extends NextRequest {
  startTime?: number;
}

export function withLogging<T = any>(
  handler: (req: LoggedRequest) => Promise<NextResponse<T>> | NextResponse<T>
) {
  return async (req: LoggedRequest): Promise<NextResponse<T>> => {
    const startTime = Date.now();
    req.startTime = startTime;

    try {
      // Log incoming API request
      logger.http('API Request', {
        method: req.method,
        url: req.url,
        pathname: req.nextUrl.pathname,
        userAgent: req.headers.get('user-agent'),
        ip: req.ip || req.headers.get('x-forwarded-for'),
        query: Object.fromEntries(req.nextUrl.searchParams),
      });

      // Execute the handler
      const response = await handler(req);

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log successful API response
      logger.http('API Response', {
        method: req.method,
        url: req.url,
        statusCode: response.status,
        responseTime: `${responseTime}ms`,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log API error
      logger.error('API Error', {
        method: req.method,
        url: req.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: `${responseTime}ms`,
      });

      // Re-throw the error
      throw error;
    }
  };
}

export function logApiError(error: Error, context?: any) {
  logger.logError(error, {
    type: 'api',
    ...context,
  });
}

export function logApiSuccess(message: string, data?: any) {
  logger.info(`API Success: ${message}`, data);
}
