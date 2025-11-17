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

## Troubleshooting

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
