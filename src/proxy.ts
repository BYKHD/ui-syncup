import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCorsHeaders } from '@/lib/cors';
import { buildCSPHeader, HSTS_HEADER } from '@/lib/security-headers';
import { getSetupStatus } from '@/lib/setup-status';

/**
 * Routes that should bypass the setup check entirely.
 * These routes need to be accessible before setup is complete.
 */
const SETUP_BYPASS_ROUTES = [
  '/setup',        // Setup wizard pages
  '/api/setup',    // Setup API endpoints (status, health, admin, config, complete)
  '/sign-in',      // Auth pages (needed for error display)
  '/sign-up',      // Auth pages
  '/_next',        // Next.js internals
  '/favicon.ico',  // Static assets
];

/**
 * Routes that are public and don't require setup redirect.
 * Users can still access these even if setup is not complete.
 */
const PUBLIC_ROUTES = [
  '/changelog',
  '/privacy-policy',
  '/share',
  '/api/health',   // Health check endpoint if exists
];

/**
 * Check if a pathname should bypass setup redirect logic.
 * 
 * @param pathname - The request pathname
 * @returns true if the route should bypass setup check
 */
function shouldBypassSetupCheck(pathname: string): boolean {
  // Check if the path starts with any bypass route
  return SETUP_BYPASS_ROUTES.some(route => pathname.startsWith(route)) ||
         PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a pathname is a protected route that requires setup to be complete.
 * Protected routes include dashboard, workspace, projects, team settings, etc.
 * 
 * @param pathname - The request pathname
 * @returns true if the route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  // API routes are allowed to proceed (they handle their own auth)
  if (pathname.startsWith('/api')) {
    return false;
  }
  
  // The root path redirects to dashboard or landing, handle specially
  if (pathname === '/') {
    return true;
  }
  
  // Protected route groups
  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/team',
    '/workspace',
    '/settings',
    '/onboarding',
    '/issues',
    '/annotations',
  ];
  
  return protectedPaths.some(route => pathname.startsWith(route));
}

/**
 * Stamp security headers (CSP, HSTS) onto an existing response.
 */
function applySecurityHeaders(response: NextResponse): void {
  response.headers.set('Content-Security-Policy', buildCSPHeader());
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      HSTS_HEADER['Strict-Transport-Security']
    );
  }
}

/**
 * Proxy function for Next.js 16
 *
 * Responsibilities:
 * 1. Add security headers (CSP, HSTS)
 * 2. Handle CORS preflight requests
 * 3. Redirect to /setup if instance setup is not complete (Requirement 1.1, 1.2, 1.3)
 *
 * @requirements 1.1 - Redirect to /setup if no admin user exists
 * @requirements 1.2 - Allow normal routing when setup is complete
 * @requirements 1.3 - Check instance state on each request until setup complete
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log the request
  logger.info(`${request.method} ${pathname}`);
  
  // Handle CORS preflight requests for API routes
  if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Check FORCE_SETUP environment variable (Requirement 10.9)
  // When set to 'true', redirect protected routes to /setup to allow re-running the wizard
  if (process.env.FORCE_SETUP === 'true') {
    if (isProtectedRoute(pathname)) {
      logger.info(`Redirecting to /setup - FORCE_SETUP enabled`, { pathname });
      const setupUrl = new URL('/setup', request.nextUrl.origin);
      return NextResponse.redirect(setupUrl);
    }
  }
  
  // Fast path: cookie already set by a previous successful check.
  const cookieValue = request.cookies.get('setup-complete')?.value;
  const hasCookie = cookieValue === '1';

  // Guard /setup — only redirect away if setup is genuinely complete in the DB.
  // A stale cookie (e.g. after a DB reset) must not block the setup page.
  if (pathname === '/setup' && hasCookie) {
    const status = await getSetupStatus(request);
    if (status?.isSetupComplete) {
      return NextResponse.redirect(new URL('/sign-in', request.nextUrl.origin), { status: 302 });
    }
    // Stale cookie — clear it and serve the setup page with security headers.
    const response = NextResponse.next();
    response.cookies.delete('setup-complete');
    applySecurityHeaders(response);
    return response;
  }

  // Only run the cold-path status check for protected routes.
  if (!shouldBypassSetupCheck(pathname) && isProtectedRoute(pathname) && !hasCookie) {
    const status = await getSetupStatus(request);

    if (status && !status.isSetupComplete) {
      logger.info(`Redirecting to /setup - setup not complete`, { pathname });
      return NextResponse.redirect(new URL('/setup', request.nextUrl.origin), { status: 302 });
    }

    // Setup is confirmed complete — continue and stamp the cookie below.
  }

  // Continue with the request.
  const response = NextResponse.next();

  // Stamp the fast-path cookie now that we know setup is complete.
  if (!hasCookie && !shouldBypassSetupCheck(pathname) && isProtectedRoute(pathname)) {
    response.cookies.set('setup-complete', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }
  
  applySecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
