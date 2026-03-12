/**
 * CORS Configuration Utilities
 * 
 * Provides environment-aware CORS configuration for API routes
 * Supports production, preview, and development environments
 */

import { env } from './env';

/**
 * Get allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
  const origins = [env.NEXT_PUBLIC_APP_URL];

  // In production, allow both www and non-www variants
  if (env.NODE_ENV === 'production') {
    // Add both variants to handle www vs non-www requests
    origins.push('https://ui-syncup.com');
    origins.push('https://www.ui-syncup.com');
  }

  // In preview/development, allow Vercel preview URLs
  if (env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development') {
    origins.push('https://*.vercel.app');
    
    // Allow localhost in development
    if (env.NODE_ENV === 'development') {
      origins.push('http://localhost:3000');
      origins.push('http://localhost:3001');
    }
  }

  return origins;
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();

  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns (e.g., https://*.vercel.app)
  return allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });
}

/**
 * CORS headers configuration
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
} as const;

/**
 * Get CORS headers for a specific origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!isOriginAllowed(origin)) {
    return {};
  }

  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin || env.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Apply CORS headers to a Response
 */
export function withCors(response: Response, origin: string | null): Response {
  const headers = getCorsHeaders(origin);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
