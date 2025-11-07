import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export function proxy(request: NextRequest) {
  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('X-Custom-Header', 'middleware-active');
  
  // Log the request
  logger.info(`${request.method} ${request.url}`);
  
  // Example: Redirect based on path
  if (request.nextUrl.pathname === '/old-path') {
    return NextResponse.redirect(new URL('/new-path', request.url));
  }
  
  // Example: Authentication check
  const token = request.cookies.get('auth-token');
  if (request.nextUrl.pathname.startsWith('/protected') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
