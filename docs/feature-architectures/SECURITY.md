# Security Configuration

This document describes the security headers and CORS configuration implemented in UI SyncUp.

## Overview

The application implements multiple layers of security controls:

1. **Content Security Policy (CSP)** - Controls which resources can be loaded
2. **CORS (Cross-Origin Resource Sharing)** - Controls which origins can access the API
3. **Security Headers** - Additional browser security features
4. **HSTS (HTTP Strict Transport Security)** - Forces HTTPS in production

## Implementation

### Architecture

Security headers are configured in three places:

1. **`next.config.ts`** - Global headers applied to all routes
2. **`src/proxy.ts`** - Dynamic headers and CORS preflight handling
3. **`src/lib/cors.ts`** - CORS utilities for API routes
4. **`src/lib/security-headers.ts`** - Centralized security header definitions

### Content Security Policy (CSP)

CSP restricts which resources the browser can load, preventing XSS and data injection attacks.

**Configured Directives:**

```typescript
{
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'" /* dev only */],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://*.r2.cloudflarestorage.com',
    'https://accounts.google.com',
    'http://localhost:*' /* dev only */,
    'ws://localhost:*' /* dev only */
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true /* production only */
}
```

**External Services Allowed:**

- **Supabase** (`*.supabase.co`) - Database and authentication
- **Cloudflare R2** (`*.r2.cloudflarestorage.com`) - Object storage
- **Google OAuth** (`accounts.google.com`) - Authentication

**Modifying CSP:**

To add a new external service:

1. Edit `src/lib/security-headers.ts`
2. Add the domain to the appropriate directive in `getCSPDirectives()`
3. Test in development and preview environments before deploying to production

```typescript
// Example: Adding a new analytics service
'connect-src': [
  "'self'",
  'https://*.supabase.co',
  'https://*.r2.cloudflarestorage.com',
  'https://accounts.google.com',
  'https://analytics.example.com', // New service
  // ...
]
```

### CORS Configuration

CORS controls which origins can make requests to the API.

**Allowed Origins:**

- **Production**: `NEXT_PUBLIC_APP_URL` environment variable
- **Preview**: `*.vercel.app` wildcard
- **Development**: `localhost:3000`, `localhost:3001`

**CORS Headers:**

```typescript
{
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '<origin>',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400' // 24 hours
}
```

**Using CORS in API Routes:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  const response = NextResponse.json({ data: 'example' });
  
  // Apply CORS headers
  return withCors(response, origin);
}
```

**Preflight Requests:**

OPTIONS requests are automatically handled by `src/proxy.ts`. The proxy:

1. Checks if the origin is allowed
2. Returns appropriate CORS headers
3. Returns 204 No Content status

### Security Headers

Additional security headers are applied to all responses:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by blocking iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unnecessary browser features |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS (production only) |

### HSTS (HTTP Strict Transport Security)

HSTS forces browsers to use HTTPS for all requests.

**Configuration:**

- **Enabled**: Production only
- **Max Age**: 31536000 seconds (1 year)
- **Include Subdomains**: Yes
- **Preload**: Yes (eligible for browser preload lists)

**Important Notes:**

- HSTS is only applied in production to avoid issues in local development
- Once enabled, browsers will refuse to connect over HTTP
- The preload flag makes the site eligible for browser HSTS preload lists

## Testing

### Local Testing

1. Start the development server:
   ```bash
   bun dev
   ```

2. Check headers in browser DevTools:
   - Open Network tab
   - Reload the page
   - Click on any request
   - View Response Headers

3. Verify CSP:
   - Check Console for CSP violations
   - All external resources should load without errors

### Preview Environment Testing

1. Deploy to a preview branch
2. Test with different origins:
   ```bash
   # Should succeed (same origin)
   curl -H "Origin: https://preview-xyz.vercel.app" \
        https://preview-xyz.vercel.app/api/health
   
   # Should fail (different origin)
   curl -H "Origin: https://evil.com" \
        https://preview-xyz.vercel.app/api/health
   ```

3. Verify CSP allows all required external services

### Production Testing

1. After deployment, verify headers:
   ```bash
   curl -I https://ui-syncup.com
   ```

2. Check for:
   - All security headers present
   - HSTS header included
   - CSP header includes all required domains

3. Test CORS:
   ```bash
   # Preflight request
   curl -X OPTIONS \
        -H "Origin: https://ui-syncup.com" \
        -H "Access-Control-Request-Method: POST" \
        https://ui-syncup.com/api/health
   ```

## Security Checklist

### Before Deploying

- [ ] All external services are listed in CSP `connect-src`
- [ ] CORS origins are correctly configured for the environment
- [ ] No sensitive data in CSP or CORS configuration
- [ ] HSTS is enabled for production
- [ ] Security headers are applied to all routes

### After Deploying

- [ ] Verify all security headers are present
- [ ] Test CORS with allowed and disallowed origins
- [ ] Check browser console for CSP violations
- [ ] Verify external services (Supabase, R2, Google) work correctly
- [ ] Test API routes with different HTTP methods

### Regular Maintenance

- [ ] Review CSP violations in production logs
- [ ] Update CSP when adding new external services
- [ ] Rotate CORS origins when domains change
- [ ] Monitor security header compliance with tools like [securityheaders.com](https://securityheaders.com)

## Troubleshooting

### CSP Violations

**Symptom**: Console errors like "Refused to load..."

**Solution**:
1. Identify the blocked resource in the error message
2. Add the domain to the appropriate CSP directive
3. Test in development before deploying

### CORS Errors

**Symptom**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution**:
1. Check if the origin is in the allowed list
2. Verify `NEXT_PUBLIC_APP_URL` is set correctly
3. For preview deployments, ensure `*.vercel.app` is allowed

### HSTS Issues

**Symptom**: Browser refuses HTTP connections

**Solution**:
1. HSTS is production-only, shouldn't affect development
2. Clear browser HSTS cache: `chrome://net-internals/#hsts`
3. Verify `NODE_ENV` is set correctly

### External Service Blocked

**Symptom**: Supabase, R2, or Google OAuth not working

**Solution**:
1. Check CSP `connect-src` includes the service domain
2. Verify environment variables are set correctly
3. Check browser console for specific CSP violations

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js: Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Environment configuration
- [Local Development](./LOCAL_DEVELOPMENT.md) - Development setup
