import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from './lib/logger';

const logger = createLogger('middleware');

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  // Log the incoming request
  logger.http('Incoming Request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for'),
    pathname: request.nextUrl.pathname,
  });

  // Continue with the request
  const response = NextResponse.next();
  
  // Calculate response time
  const responseTime = Date.now() - start;
  
  // Log the response
  logger.http('Outgoing Response', {
    method: request.method,
    url: request.url,
    statusCode: response.status,
    responseTime: `${responseTime}ms`,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
