# Environment Configuration Guide

This guide explains how to use the environment-specific configuration utilities in UI SyncUp.

## Overview

The application provides a centralized configuration system through `src/lib/config.ts` that handles:

- Environment detection (production, development, test, preview)
- Feature flags management
- Environment-specific configuration values
- Deployment metadata access

## Environment Detection

### Basic Environment Checks

```typescript
import { isProduction, isDevelopment, isTest } from '@/lib/config'

// Check current environment
if (isProduction()) {
  // Production-only code (e.g., enable monitoring)
  initializeErrorTracking()
}

if (isDevelopment()) {
  // Development-only code (e.g., debug logging)
  console.log('Debug mode enabled')
}

if (isTest()) {
  // Test-only code
  mockExternalServices()
}
```

### Vercel-Specific Checks

```typescript
import { isPreview, isVercelProduction, isVercel } from '@/lib/config'

// Check if running on Vercel preview environment
if (isPreview()) {
  // Preview deployment code
  showPreviewBanner()
}

// Check if running on Vercel production
if (isVercelProduction()) {
  // Vercel production-specific code
}

// Check if running on Vercel platform at all
if (isVercel()) {
  // Any Vercel deployment (production or preview)
  enableVercelAnalytics()
}
```

### Get Environment Name

```typescript
import { getEnvironment } from '@/lib/config'

const env = getEnvironment()
// Returns: 'production' | 'preview' | 'development' | 'test'

console.log(`Running in ${env} environment`)
```

## Feature Flags

### Built-in Feature Flags

The application supports two built-in feature flags:

1. **Analytics** - `NEXT_PUBLIC_ENABLE_ANALYTICS`
2. **Debug Mode** - `NEXT_PUBLIC_ENABLE_DEBUG`

```typescript
import { isAnalyticsEnabled, isDebugEnabled } from '@/lib/config'

// Check if analytics is enabled
if (isAnalyticsEnabled()) {
  initializeAnalytics()
}

// Check if debug mode is enabled
if (isDebugEnabled()) {
  enableVerboseLogging()
}
```

### Type-Safe Feature Flag Check

```typescript
import { isFeatureEnabled } from '@/lib/config'

// Type-safe feature flag check
if (isFeatureEnabled('analytics')) {
  // Analytics code
}

if (isFeatureEnabled('debug')) {
  // Debug code
}
```

### Custom Feature Flags

```typescript
import { getFeatureFlag } from '@/lib/config'

// Get custom feature flag with default value
const enableNewUI = getFeatureFlag('NEXT_PUBLIC_ENABLE_NEW_UI', false)
const enableBetaFeatures = getFeatureFlag('NEXT_PUBLIC_BETA_FEATURES', true)

if (enableNewUI) {
  renderNewUI()
} else {
  renderLegacyUI()
}
```

### Feature Flag Format

Feature flags accept the following truthy values (case-insensitive):
- `"true"`
- `"1"`
- `"yes"`
- `"on"`

All other values (including empty string) are considered false.

**Example `.env.local`:**
```bash
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=1
NEXT_PUBLIC_ENABLE_NEW_UI=yes
NEXT_PUBLIC_BETA_FEATURES=on
```

## Configuration Object

### Using the Config Object

```typescript
import { config } from '@/lib/config'

// Environment information
console.log(config.env.isProduction)      // boolean
console.log(config.env.isDevelopment)     // boolean
console.log(config.env.isTest)            // boolean
console.log(config.env.isPreview)         // boolean
console.log(config.env.isVercelProduction) // boolean
console.log(config.env.isVercel)          // boolean
console.log(config.env.name)              // 'production' | 'preview' | 'development' | 'test'

// Feature flags
console.log(config.features.analytics)    // boolean
console.log(config.features.debug)        // boolean

// Application URLs
console.log(config.app.url)               // string (e.g., 'https://ui-syncup.com')
console.log(config.app.apiUrl)            // string (e.g., 'https://ui-syncup.com/api')

// Deployment information (Vercel)
console.log(config.deployment.branch)     // string (e.g., 'main', 'develop')
console.log(config.deployment.commitSha)  // string (e.g., 'abc123...')
console.log(config.deployment.commitMessage) // string
console.log(config.deployment.url)        // string (Vercel deployment URL)
```

### Example: Conditional Rendering

```typescript
import { config } from '@/lib/config'

export function AppHeader() {
  return (
    <header>
      <Logo />
      {config.env.isPreview && (
        <Badge variant="warning">Preview Environment</Badge>
      )}
      {config.features.debug && (
        <DebugPanel deployment={config.deployment} />
      )}
    </header>
  )
}
```

## Environment-Specific Values

### Get Values Based on Environment

```typescript
import { getEnvValue } from '@/lib/config'

// API timeout based on environment
const apiTimeout = getEnvValue({
  production: 5000,      // 5 seconds in production
  preview: 10000,        // 10 seconds in preview
  development: 30000,    // 30 seconds in development
  default: 10000,        // Default fallback
})

// Cache duration
const cacheDuration = getEnvValue({
  production: 3600,      // 1 hour in production
  development: 60,       // 1 minute in development
  default: 300,          // 5 minutes default
})

// Log level
const logLevel = getEnvValue({
  production: 'error',
  preview: 'warn',
  development: 'debug',
  test: 'silent',
  default: 'info',
})
```

### Example: API Client Configuration

```typescript
import { getEnvValue, isProduction } from '@/lib/config'

const apiConfig = {
  timeout: getEnvValue({
    production: 5000,
    development: 30000,
    default: 10000,
  }),
  retries: getEnvValue({
    production: 3,
    development: 1,
    default: 2,
  }),
  enableLogging: !isProduction(),
}

export const apiClient = createApiClient(apiConfig)
```

## Runtime Environment Detection

### Browser vs Server

```typescript
import { isBrowser, isServer } from '@/lib/config'

// Check if running in browser
if (isBrowser()) {
  // Browser-only code
  window.addEventListener('resize', handleResize)
}

// Check if running on server
if (isServer()) {
  // Server-only code
  const data = await fetchServerData()
}
```

### Example: Conditional Imports

```typescript
import { isBrowser } from '@/lib/config'

export async function initializeApp() {
  if (isBrowser()) {
    // Dynamically import browser-only modules
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
  }
}
```

## Common Use Cases

### 1. Initialize Analytics

```typescript
import { isProduction, isAnalyticsEnabled } from '@/lib/config'

export function initializeAnalytics() {
  if (isProduction() && isAnalyticsEnabled()) {
    // Initialize analytics only in production with flag enabled
    analytics.init({
      trackingId: process.env.NEXT_PUBLIC_GA_ID,
    })
  }
}
```

### 2. Debug Logging

```typescript
import { isDebugEnabled, isDevelopment } from '@/lib/config'

export function debugLog(message: string, data?: unknown) {
  if (isDebugEnabled() || isDevelopment()) {
    console.log(`[DEBUG] ${message}`, data)
  }
}
```

### 3. Feature Rollout

```typescript
import { getFeatureFlag, isPreview } from '@/lib/config'

export function shouldShowNewFeature(): boolean {
  // Show new feature in preview environments or if flag is enabled
  return isPreview() || getFeatureFlag('NEXT_PUBLIC_ENABLE_NEW_FEATURE', false)
}
```

### 4. Error Reporting

```typescript
import { isProduction, config } from '@/lib/config'

export function reportError(error: Error) {
  if (isProduction()) {
    // Send to error tracking service
    errorTracker.captureException(error, {
      environment: config.env.name,
      deployment: config.deployment,
    })
  } else {
    // Log to console in development
    console.error(error)
  }
}
```

### 5. API Base URL

```typescript
import { config } from '@/lib/config'

export const API_BASE_URL = config.app.apiUrl

export async function fetchData(endpoint: string) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`)
  return response.json()
}
```

### 6. Deployment Information Display

```typescript
import { config, isPreview } from '@/lib/config'

export function DeploymentInfo() {
  if (!isPreview()) return null

  return (
    <div className="deployment-info">
      <p>Branch: {config.deployment.branch}</p>
      <p>Commit: {config.deployment.commitSha.slice(0, 7)}</p>
      <p>Message: {config.deployment.commitMessage}</p>
    </div>
  )
}
```

## Best Practices

### 1. Use Type-Safe Helpers

```typescript
// ✅ Good - Type-safe
import { isProduction } from '@/lib/config'
if (isProduction()) { }

// ❌ Avoid - Direct env access
if (process.env.NODE_ENV === 'production') { }
```

### 2. Centralize Feature Flags

```typescript
// ✅ Good - Use config utilities
import { isFeatureEnabled } from '@/lib/config'
const showNewUI = isFeatureEnabled('analytics')

// ❌ Avoid - Manual parsing
const showNewUI = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
```

### 3. Use Config Object for Multiple Checks

```typescript
// ✅ Good - Single import
import { config } from '@/lib/config'
if (config.env.isProduction && config.features.analytics) { }

// ❌ Avoid - Multiple imports
import { isProduction, isAnalyticsEnabled } from '@/lib/config'
if (isProduction() && isAnalyticsEnabled()) { }
```

### 4. Document Custom Feature Flags

When adding new feature flags, document them:

```typescript
/**
 * Feature flag for new dashboard UI
 * Environment variable: NEXT_PUBLIC_ENABLE_NEW_DASHBOARD
 * Default: false
 */
export const useNewDashboard = () => {
  return getFeatureFlag('NEXT_PUBLIC_ENABLE_NEW_DASHBOARD', false)
}
```

## Environment Variables Reference

### Required Variables

See `.env.example` for all required environment variables.

### Authentication Variables

#### better-auth Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `BETTER_AUTH_SECRET` | string | ✅ Yes | Secret key for signing tokens and session cookies. Must be at least 32 characters. Keep this secure and never commit to version control. |
| `BETTER_AUTH_URL` | string (URL) | ✅ Yes | Base URL for authentication callbacks. Must match your deployment URL (e.g., `http://localhost:3000` for local, `https://your-domain.com` for production). |

#### Google OAuth

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | ✅ Yes | Google OAuth client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | string | ✅ Yes | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | string (URL) | ✅ Yes | Google OAuth redirect URI (e.g., `http://localhost:3000/api/auth/callback/google`). |

#### Microsoft OAuth (Optional)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `MICROSOFT_CLIENT_ID` | string | ⚠️ Optional | Microsoft OAuth client ID from Azure AD. When not set, Microsoft sign-in is disabled. |
| `MICROSOFT_CLIENT_SECRET` | string | ⚠️ Optional | Microsoft OAuth client secret. |
| `MICROSOFT_TENANT_ID` | string | ⚠️ Optional | Microsoft tenant ID. Defaults to `common` for multi-tenant support. Use a specific tenant ID for single-tenant apps. |

#### Atlassian OAuth (Optional)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `ATLASSIAN_CLIENT_ID` | string | ⚠️ Optional | Atlassian OAuth client ID from Atlassian Developer Console. When not set, Atlassian sign-in is disabled. |
| `ATLASSIAN_CLIENT_SECRET` | string | ⚠️ Optional | Atlassian OAuth client secret. |

**Generating BETTER_AUTH_SECRET:**

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Security Best Practices:**
- Generate a unique secret for each environment (development, staging, production)
- Never reuse secrets across environments
- Rotate secrets periodically (every 90 days recommended)
- Store secrets in secure secret management systems (Vercel Environment Variables, AWS Secrets Manager, etc.)
- Never commit secrets to version control

#### Email Service (Resend)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `RESEND_API_KEY` | string | ✅ Yes | API key from Resend for sending transactional emails (verification, password reset). Get from [resend.com/api-keys](https://resend.com/api-keys). |
| `RESEND_FROM_EMAIL` | string (email) | ✅ Yes | Default sender email address. Must be verified in Resend. Format: `noreply@your-domain.com` |

**Setting up Resend:**

1. **Create Account**: Sign up at [resend.com](https://resend.com)

2. **Verify Domain** (Production):
   - Go to Domains → Add Domain
   - Add your domain (e.g., `your-domain.com`)
   - Add DNS records (SPF, DKIM, DMARC) to your DNS provider
   - Wait for verification (usually 5-10 minutes)

3. **Get API Key**:
   - Go to API Keys → Create API Key
   - Name it (e.g., "UI SyncUp Production")
   - Copy the key (starts with `re_`)
   - Store securely in environment variables

4. **Development Setup**:
   - For local development, you can use Resend's test mode
   - Emails sent in test mode are not actually delivered but appear in your Resend dashboard
   - Or verify a test domain for actual email delivery

**Email Templates Used:**
- `verification-email.tsx` - Email verification link
- `password-reset-email.tsx` - Password reset link
- `welcome-email.tsx` - Welcome message after verification
- `security-alert-email.tsx` - Security notifications (password changed, etc.)

#### Database Connection

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | string | ✅ Yes | PostgreSQL connection string (pooled connection). Format: `postgresql://user:password@host:5432/database` |
| `DIRECT_URL` | string | ⚠️ Optional | Direct PostgreSQL connection string (non-pooled, for migrations). Required for Drizzle migrations. |

**Connection String Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

**Example:**
```bash
# Local development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ui_syncup

# Supabase (pooled)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Supabase (direct - for migrations)
DIRECT_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Connection Pooling:**
- Use `DATABASE_URL` for application queries (pooled connection)
- Use `DIRECT_URL` for migrations (direct connection)
- Supabase provides both pooled and direct connection strings
- Pooled connections are recommended for production to handle concurrent requests

### Feature Flag Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | boolean | `false` | Enable analytics tracking |
| `NEXT_PUBLIC_ENABLE_DEBUG` | boolean | `false` | Enable debug mode |

### Vercel System Variables

These are automatically set by Vercel:

| Variable | Description |
|----------|-------------|
| `VERCEL_ENV` | Environment type: `production`, `preview`, or `development` |
| `VERCEL_URL` | Deployment URL |
| `VERCEL_GIT_COMMIT_REF` | Git branch name |
| `VERCEL_GIT_COMMIT_SHA` | Git commit SHA |
| `VERCEL_GIT_COMMIT_MESSAGE` | Git commit message |

## Testing

### Mocking Environment in Tests

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('Feature with environment check', () => {
  it('should behave differently in production', async () => {
    // Mock environment
    vi.stubEnv('NODE_ENV', 'production')
    
    const { isProduction } = await import('@/lib/config')
    expect(isProduction()).toBe(true)
    
    vi.unstubAllEnvs()
  })
})
```

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Deployment procedures and environment setup
- [Local Development](./LOCAL_DEVELOPMENT.md) - Local development environment setup
- [Environment Variables](../src/lib/env.ts) - Environment variable validation

## Authentication Setup Guide

### Local Development Setup

1. **Copy Environment Template**
   ```bash
   cp .env.example .env.local
   ```

2. **Generate better-auth Secret**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and set it as `BETTER_AUTH_SECRET` in `.env.local`

3. **Set Base URL**
   ```bash
   BETTER_AUTH_URL=http://localhost:3000
   ```

4. **Configure Database**
   - Start local PostgreSQL (see `docs/LOCAL_DEVELOPMENT.md`)
   - Set `DATABASE_URL` to your local connection string
   ```bash
   DATABASE_URL=postgresql://postgres:password@localhost:5432/ui_syncup
   ```

5. **Setup Resend (Optional for local dev)**
   - Sign up at [resend.com](https://resend.com)
   - Get API key from dashboard
   - Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
   - For testing, you can use Resend's test mode

6. **Run Migrations**
   ```bash
   bun run db:migrate
   ```

7. **Start Development Server**
   ```bash
   bun dev
   ```

### Production Deployment (Vercel)

1. **Set Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.example`

2. **Generate Production Secret**
   ```bash
   openssl rand -base64 32
   ```
   - Add as `BETTER_AUTH_SECRET` in Vercel
   - Use different secrets for Preview and Production environments

3. **Set Production URLs**
   ```bash
   BETTER_AUTH_URL=https://your-domain.com
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   NEXT_PUBLIC_API_URL=https://your-domain.com/api
   ```

4. **Configure Database**
   - Use Supabase or your PostgreSQL provider
   - Set `DATABASE_URL` (pooled connection)
   - Set `DIRECT_URL` (direct connection for migrations)

5. **Setup Resend**
   - Verify your domain in Resend
   - Add DNS records (SPF, DKIM, DMARC)
   - Create production API key
   - Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

6. **Deploy**
   ```bash
   git push origin main
   ```
   Vercel will automatically deploy with the configured environment variables

### Environment-Specific Configuration

#### Development
```bash
NODE_ENV=development
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/ui_syncup
RESEND_FROM_EMAIL=dev@localhost  # Test mode
```

#### Preview (Vercel)
```bash
NODE_ENV=production
VERCEL_ENV=preview
BETTER_AUTH_URL=https://your-app-git-branch.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app-git-branch.vercel.app
DATABASE_URL=postgresql://...  # Preview database
RESEND_FROM_EMAIL=preview@your-domain.com
```

#### Production (Vercel)
```bash
NODE_ENV=production
VERCEL_ENV=production
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=postgresql://...  # Production database
RESEND_FROM_EMAIL=noreply@your-domain.com
```

### Security Checklist

- [ ] `BETTER_AUTH_SECRET` is at least 32 characters
- [ ] Different secrets for each environment
- [ ] Secrets stored in secure secret management (not in code)
- [ ] `BETTER_AUTH_URL` matches deployment URL
- [ ] Database connection uses SSL in production
- [ ] Resend domain is verified
- [ ] Email sender domain matches verified domain
- [ ] All secrets are marked as "Sensitive" in Vercel
- [ ] Environment variables are not exposed to client (no `NEXT_PUBLIC_` prefix for secrets)

### Testing Authentication

1. **Test Registration**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!@#","name":"Test User"}'
   ```

2. **Check Email Logs**
   - Development: Check Resend dashboard for test emails
   - Production: Check email delivery in Resend logs

3. **Test Sign-In**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!@#"}'
   ```

4. **Verify Session**
   ```bash
   curl http://localhost:3000/api/auth/me \
     -H "Cookie: session=your-session-cookie"
   ```

## Troubleshooting

### Authentication Issues

#### "BETTER_AUTH_SECRET must be at least 32 characters"
- Generate a new secret: `openssl rand -base64 32`
- Ensure the secret is properly set in environment variables
- Restart the development server after changing `.env.local`

#### "Email delivery failed"
- Verify `RESEND_API_KEY` is correct
- Check sender email is verified in Resend
- Ensure sender domain has proper DNS records (SPF, DKIM)
- Check Resend dashboard for delivery logs and errors

#### "Database connection failed"
- Verify `DATABASE_URL` format is correct
- Check database is running and accessible
- Ensure database user has proper permissions
- For Supabase, verify connection pooling is enabled

#### "Session cookie not set"
- Verify `BETTER_AUTH_URL` matches your deployment URL
- Check cookies are enabled in browser
- Ensure HTTPS is used in production (required for Secure cookies)
- Verify no CORS issues blocking cookie setting

#### "Email verification link expired"
- Tokens expire after 24 hours by default
- User can request a new verification email
- Check system time is synchronized (token expiration uses server time)

#### "Password reset not working"
- Reset tokens expire after 1 hour
- Ensure email delivery is working
- Check user exists in database
- Verify token hasn't been used already

### Feature Flag Not Working

1. Ensure the environment variable is prefixed with `NEXT_PUBLIC_` for client-side access
2. Restart the development server after changing `.env.local`
3. Check the value is one of the truthy values: `true`, `1`, `yes`, `on`

### Environment Detection Issues

1. Verify `NODE_ENV` is set correctly
2. For Vercel-specific checks, ensure you're deployed on Vercel
3. Check `VERCEL_ENV` is set in Vercel deployment settings

### Config Object Shows Stale Values

The config object is evaluated at module load time. If you need dynamic values, use the function-based helpers:

```typescript
// ✅ Dynamic - Re-evaluated each time
if (isProduction()) { }

// ⚠️ Static - Evaluated once at module load
if (config.env.isProduction) { }
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Environment validation failed" | Missing or invalid environment variables | Check `.env.local` against `.env.example` |
| "Invalid token signature" | Token signed with different secret | Ensure `BETTER_AUTH_SECRET` is consistent |
| "Session expired" | Session older than 7 days | User needs to sign in again |
| "Rate limit exceeded" | Too many requests | Wait for rate limit window to reset |
| "Email already registered" | Duplicate registration attempt | User should sign in or reset password |
| "Email not verified" | Attempting to sign in before verification | Check email for verification link |


## Quick Reference

### Essential Commands

```bash
# Generate better-auth secret
openssl rand -base64 32

# Copy environment template
cp .env.example .env.local

# Validate environment variables
bun run validate-env

# Run database migrations
bun run db:migrate

# Start development server
bun dev

# Build for production
bun build
```

### Environment Variable Checklist

#### Minimum Required for Local Development
- [ ] `NODE_ENV=development`
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] `NEXT_PUBLIC_API_URL=http://localhost:3000/api`
- [ ] `DATABASE_URL` (PostgreSQL connection)
- [ ] `BETTER_AUTH_SECRET` (32+ characters)
- [ ] `BETTER_AUTH_URL=http://localhost:3000`
- [ ] `RESEND_API_KEY` (for email features)
- [ ] `RESEND_FROM_EMAIL` (verified email)

#### Additional for Production
- [ ] All development variables
- [ ] `DIRECT_URL` (for migrations)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `R2_*` variables (for file storage)
- [ ] `GOOGLE_*` variables (for OAuth)
- [ ] Production URLs (HTTPS)
- [ ] Verified email domain in Resend

### File Locations

| File | Purpose |
|------|---------|
| `.env.example` | Template with all variables and documentation |
| `.env.local` | Local development variables (gitignored) |
| `.env.development` | Development defaults (optional) |
| `.env.production` | Production defaults (optional) |
| `.env.test` | Test environment variables |
| `src/lib/env.ts` | Environment validation schema |
| `docs/ENVIRONMENT_CONFIG.md` | This documentation |
| `docs/DEPLOYMENT.md` | Deployment procedures |
| `docs/LOCAL_DEVELOPMENT.md` | Local setup guide |

### Related Documentation

- [Authentication System Design](./.ai/specs/authentication-system/design.md) - Auth architecture and implementation
- [Authentication Requirements](./.ai/specs/authentication-system/requirements.md) - Auth requirements and acceptance criteria
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment procedures
- [Local Development](./LOCAL_DEVELOPMENT.md) - Local environment setup
- [Database Setup](./DRIZZLE_ZOD_POSTGRESQL_INSTRUCTION.md) - Database configuration
- [Security Best Practices](./SECURITY.md) - Security guidelines

### Support Resources

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **better-auth Documentation**: [better-auth.com/docs](https://better-auth.com/docs)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team)
- **Next.js Environment Variables**: [nextjs.org/docs/app/building-your-application/configuring/environment-variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- **Vercel Environment Variables**: [vercel.com/docs/projects/environment-variables](https://vercel.com/docs/projects/environment-variables)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintained By**: UI SyncUp Team
