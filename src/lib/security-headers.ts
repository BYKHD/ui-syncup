/**
 * Security Headers Configuration
 * 
 * Centralized security header definitions for consistent application across
 * Next.js config, proxy, and API routes
 */

import { env, isProduction, isDevelopment } from './env';

/**
 * Content Security Policy Directives
 */
export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'upgrade-insecure-requests'?: boolean;
}

/**
 * Build Content Security Policy directives
 */
export function getCSPDirectives(): CSPDirectives {
  const directives: CSPDirectives = {
    'default-src': ["'self'"],
    
    // Scripts: allow self, unsafe-eval for dev tools, unsafe-inline for Next.js
    'script-src': [
      "'self'",
      'https://va.vercel-scripts.com',
      ...(isDevelopment() ? ["'unsafe-eval'", "'unsafe-inline'"] : ["'unsafe-inline'"]),
    ],
    
    // Styles: allow self and inline styles (required for Tailwind/CSS-in-JS)
    'style-src': ["'self'", "'unsafe-inline'"],
    
    // Images: allow self, data URIs, HTTPS, and blob for dynamic content
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:',
      ...(isDevelopment() ? ['http://localhost:*', 'http://127.0.0.1:*'] : []),
    ],
    
    // Fonts: allow self and data URIs
    'font-src': ["'self'", 'data:'],
    
    // Connect to API endpoints and external services
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://*.r2.cloudflarestorage.com',
      'https://accounts.google.com',
      'https://va.vercel-scripts.com',
      'https://vitals.vercel-insights.com',
      // Production domains
      'https://ui-syncup.com',
      'https://www.ui-syncup.com',
      ...(env.NEXT_PUBLIC_APP_URL ? [env.NEXT_PUBLIC_APP_URL] : []),
      // Development: allow local connections for API and MinIO storage
      ...(isDevelopment() ? ['http://localhost:*', 'ws://localhost:*', 'http://127.0.0.1:*', 'ws://127.0.0.1:*'] : []),
      // Storage endpoints
      env.STORAGE_ENDPOINT || 'http://127.0.0.1:9000',
      ...(env.STORAGE_PUBLIC_URL ? [env.STORAGE_PUBLIC_URL] : []),
    ],
    
    // Frame ancestors: prevent embedding
    'frame-ancestors': ["'none'"],
    
    // Base URI: restrict base tag to same origin
    'base-uri': ["'self'"],
    
    // Form actions: restrict form submissions to same origin
    'form-action': ["'self'"],
    
    // Upgrade insecure requests in production
    'upgrade-insecure-requests': isProduction(),
  };

  return directives;
}

/**
 * Convert CSP directives to header string
 */
export function buildCSPHeader(directives: CSPDirectives = getCSPDirectives()): string {
  const parts: string[] = [];

  Object.entries(directives).forEach(([key, value]) => {
    if (key === 'upgrade-insecure-requests') {
      if (value === true) {
        parts.push('upgrade-insecure-requests');
      }
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key} ${value.join(' ')}`);
    }
  });

  return parts.join('; ');
}

/**
 * Standard security headers
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable browser XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (formerly Feature-Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/**
 * HSTS header for production
 */
export const HSTS_HEADER = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
} as const;

/**
 * Get all security headers for the current environment
 */
export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    'Content-Security-Policy': buildCSPHeader(),
  };

  // Add HSTS in production
  if (isProduction()) {
    Object.assign(headers, HSTS_HEADER);
  }

  return headers;
}

/**
 * Apply security headers to a Response
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
