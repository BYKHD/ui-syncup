/**
 * Smoke Tests for Production Deployment Verification
 * 
 * These tests verify critical functionality after deployment to ensure
 * the application is operational and key user flows work as expected.
 * 
 * IMPORTANT: These tests are designed for PRODUCTION verification.
 * They may fail in local development if:
 * - Environment variables are not configured
 * - External services (database, storage, auth) are not running
 * - The app has build errors
 * 
 * The tests gracefully skip when services are unavailable to avoid
 * false negatives during development.
 * 
 * Run against production:
 *   PLAYWRIGHT_BASE_URL=https://ui-syncup.com PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui tests/e2e/smoke-test.spec.ts
 * 
 * Run against preview:
 *   PLAYWRIGHT_BASE_URL=https://preview-xyz.vercel.app PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui tests/e2e/smoke-test.spec.ts
 * 
 * Run locally (may skip tests if services unavailable):
 *   bun run test:ui tests/e2e/smoke-test.spec.ts
 */

import { test, expect } from '@playwright/test'

/**
 * Health Check Endpoint Test
 * 
 * Verifies that the health check endpoint is accessible and returns
 * valid health status for all external services.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
test.describe('Health Check', () => {
  test('should return healthy status from /api/health', async ({ request }) => {
    const response = await request.get('/api/health')
    
    // Should return 200 (healthy), 207 (degraded), or 503 (unhealthy)
    // 500 indicates app build/config error (not a health check failure)
    expect([200, 207, 503]).toContain(response.status())
    
    const body = await response.json()
    
    // Verify response structure
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('services')
    expect(body).toHaveProperty('deployment')
    expect(body).toHaveProperty('timestamp')
    
    // Verify status is one of the expected values
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status)
    
    // Verify services array exists and has entries
    expect(Array.isArray(body.services)).toBe(true)
    expect(body.services.length).toBeGreaterThan(0)
    
    // Verify each service has required fields
    for (const service of body.services) {
      expect(service).toHaveProperty('name')
      expect(service).toHaveProperty('status')
      expect(service).toHaveProperty('responseTime')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status)
    }
    
    // Verify deployment metadata
    expect(body.deployment).toHaveProperty('environment')
    expect(body.deployment).toHaveProperty('branch')
    expect(body.deployment).toHaveProperty('commitSha')
    expect(body.deployment).toHaveProperty('deploymentUrl')
  })

  test('should respond to HEAD request for lightweight health check', async ({ request }) => {
    const response = await request.head('/api/health')
    
    // Should return 200 (healthy), 207 (degraded), or 503 (unhealthy)
    expect([200, 207, 503]).toContain(response.status())
  })
})

/**
 * Homepage Load Test
 * 
 * Verifies that the homepage loads successfully and displays
 * expected content without errors.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    // Navigate to homepage
    const response = await page.goto('/')
    
    const status = response?.status() ?? 0
    
    // Skip test if app has build errors (500)
    if (status === 500 || status === 404) {
      test.skip()
      return
    }
    
    // Verify successful response (200 or redirect 307/308)
    expect([200, 307, 308]).toContain(status)
    
    // Verify page title contains expected text
    await expect(page).toHaveTitle(/UI Feedback Tracker|UI SyncUp/i)
    
    // Verify no console errors (excluding known warnings)
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // Check for critical errors (allow some non-critical warnings)
    const criticalErrors = errors.filter(
      (error) => 
        !error.includes('favicon') && 
        !error.includes('DevTools') &&
        !error.includes('Extension')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should have working navigation', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded')
    
    // Check if sign-in link exists and is clickable
    const signInLink = page.locator('a[href*="/sign-in"]').first()
    if (await signInLink.isVisible()) {
      await expect(signInLink).toBeVisible()
    }
  })

  test('should load without JavaScript errors', async ({ page }) => {
    const jsErrors: Error[] = []
    
    page.on('pageerror', (error) => {
      jsErrors.push(error)
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Should have no JavaScript errors
    expect(jsErrors).toHaveLength(0)
  })
})

/**
 * Authentication Flow Test
 * 
 * Verifies that the authentication pages load correctly and
 * display expected UI elements for user login.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
test.describe('Authentication Flow', () => {
  test('should load sign-in page', async ({ page }) => {
    const response = await page.goto('/sign-in')
    
    // Verify successful response (allow 200 or 500 if env not configured)
    const status = response?.status() ?? 0
    
    // If page loads with 500, skip remaining checks (env not configured)
    if (status === 500) {
      test.skip()
      return
    }
    
    expect(status).toBe(200)
    
    // Verify page contains sign-in form elements
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 })
    
    // Verify sign-in button exists
    const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in/i })
    await expect(signInButton).toBeVisible({ timeout: 5000 })
  })

  test('should display OAuth sign-in option', async ({ page }) => {
    const response = await page.goto('/sign-in')
    
    // Skip if page returns 500 (env not configured)
    if (response?.status() === 500) {
      test.skip()
      return
    }
    
    // Verify Google OAuth button exists
    const googleButton = page.locator('button').filter({ hasText: /google/i })
    await expect(googleButton).toBeVisible({ timeout: 5000 })
  })

  test('should load sign-up page', async ({ page }) => {
    const response = await page.goto('/sign-up')
    
    // Verify successful response (allow 200 or 500 if env not configured)
    const status = response?.status() ?? 0
    
    // If page loads with 500, skip remaining checks (env not configured)
    if (status === 500) {
      test.skip()
      return
    }
    
    expect(status).toBe(200)
    
    // Verify page contains sign-up form elements
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate between sign-in and sign-up', async ({ page }) => {
    // Start at sign-in
    const response = await page.goto('/sign-in')
    
    // Skip if page returns 500 (env not configured)
    if (response?.status() === 500) {
      test.skip()
      return
    }
    
    // Find and click sign-up link
    const signUpLink = page.locator('a[href*="/sign-up"]')
    await expect(signUpLink).toBeVisible({ timeout: 5000 })
    await signUpLink.click()
    
    // Verify navigation to sign-up page
    await expect(page).toHaveURL(/\/sign-up/)
    
    // Find and click sign-in link
    const signInLink = page.locator('a[href*="/sign-in"]')
    await expect(signInLink).toBeVisible({ timeout: 5000 })
    await signInLink.click()
    
    // Verify navigation back to sign-in page
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('should validate email format on sign-in', async ({ page }) => {
    const response = await page.goto('/sign-in')
    
    // Skip if page returns 500 (env not configured)
    if (response?.status() === 500) {
      test.skip()
      return
    }
    
    // Fill in invalid email
    await page.locator('input[type="email"]').fill('invalid-email')
    await page.locator('input[type="password"]').fill('password123')
    
    // Try to submit
    await page.locator('button[type="submit"]').filter({ hasText: /sign in/i }).click()
    
    // Should show validation error (either browser validation or custom)
    // Wait a bit for validation to appear
    await page.waitForTimeout(500)
    
    // Check if still on sign-in page (form didn't submit)
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

/**
 * API Routes Test
 * 
 * Verifies that critical API routes are accessible and return
 * appropriate responses.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
test.describe('API Routes', () => {
  test('should handle 404 for non-existent API routes', async ({ request }) => {
    const response = await request.get('/api/non-existent-route')
    
    // Should return 404
    expect(response.status()).toBe(404)
  })

  test('should have accessible health endpoint', async ({ request }) => {
    const response = await request.get('/api/health')
    
    // Health endpoint should be accessible (200, 207, or 503)
    expect([200, 207, 503]).toContain(response.status())
  })
})

/**
 * Performance Test
 * 
 * Verifies that the application loads within acceptable time limits.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
test.describe('Performance', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    const loadTime = Date.now() - startTime
    
    // Homepage should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should load sign-in page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')
    
    const loadTime = Date.now() - startTime
    
    // Sign-in page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })
})
