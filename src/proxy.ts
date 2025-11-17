import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCorsHeaders } from '@/lib/cors';
import { buildCSPHeader, HSTS_HEADER } from '@/lib/security-headers';

/**
 * Proxy function for Next.js 16
 * Adds security headers and handles CORS preflight requests
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  
  // Log the request
  logger.info(`${request.method} ${request.url}`);
  
  // Handle CORS preflight requests for API routes
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Add Content Security Policy
  response.headers.set('Content-Security-Policy', buildCSPHeader());
  
  // Add Strict Transport Security (HSTS) in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      HSTS_HEADER['Strict-Transport-Security']
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
