import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCorsHeaders } from '@/lib/cors';
import { buildCSPHeader, HSTS_HEADER } from '@/lib/security-headers';

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
 * Fetch instance setup status from the API.
 * This is called from the Edge runtime, so we use fetch() to call the API route.
 * 
 * @param request - The incoming request (used to construct the API URL)
 * @returns The setup status or null if the check failed
 */
async function getSetupStatus(request: NextRequest): Promise<{ isSetupComplete: boolean } | null> {
  try {
    const url = new URL('/api/setup/status', request.nextUrl.origin);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Use cache: 'no-store' to always get fresh status
      // In production, you might want to add some caching strategy
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // If the status API fails, log and allow the request to proceed
      // The app will handle the error appropriately
      logger.warn(`Setup status check failed with status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return { isSetupComplete: data.isSetupComplete ?? false };
  } catch (error) {
    // Network error or JSON parse error
    // Log and allow the request to proceed
    logger.error('Failed to check setup status', { error });
    return null;
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
  
  // Check if this route should bypass setup check
  if (!shouldBypassSetupCheck(pathname)) {
    // Only check setup status for protected routes to minimize API calls
    if (isProtectedRoute(pathname)) {
      const status = await getSetupStatus(request);
      
      // If setup is not complete, redirect to /setup
      // If status check failed (null), we allow the request to proceed
      // and let the app handle any issues
      if (status && !status.isSetupComplete) {
        logger.info(`Redirecting to /setup - setup not complete`, { pathname });
        
        const setupUrl = new URL('/setup', request.nextUrl.origin);
        return NextResponse.redirect(setupUrl);
      }
    }
  }
  
  // Continue with the request
  const response = NextResponse.next();
  
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
