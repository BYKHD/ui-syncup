/**
 * E2E Test Helpers for Authentication
 * 
 * Reusable helper functions for authentication E2E tests
 */

import type { Page, BrowserContext } from '@playwright/test';
import { randomUUID } from 'crypto';

/**
 * Test user data structure
 */
export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Generate unique test user data
 */
export function generateTestUser(): TestUser {
  const uuid = randomUUID().slice(0, 8);
  return {
    email: `test-${uuid}@example.com`,
    password: 'Test123!@#',
    name: `Test User ${uuid}`,
  };
}

/**
 * Sign up a new user via UI
 */
export async function signUpUser(page: Page, userData: TestUser): Promise<void> {
  await page.goto('/sign-up');
  
  // Wait for form to be visible
  await page.waitForSelector('input[id="name"]', { state: 'visible' });
  
  // Fill in registration form
  await page.locator('input[id="name"]').fill(userData.name);
  await page.locator('input[id="email"]').fill(userData.email);
  await page.locator('input[id="password"]').fill(userData.password);
  await page.locator('input[id="confirmPassword"]').fill(userData.password);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
  
  // Wait for success message
  await page.waitForSelector('text=Account created', { timeout: 10000 });
}

/**
 * Sign in a user via UI
 */
export async function signInUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/sign-in');
  
  // Wait for form to be visible
  await page.waitForSelector('input[id="email"]', { state: 'visible' });
  
  // Fill in sign-in form
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(password);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
}

/**
 * Sign out a user via UI
 */
export async function signOutUser(page: Page): Promise<void> {
  // Look for sign-out button (implementation may vary)
  // This is a placeholder that would be updated based on actual UI
  const signOutButton = page.locator('button:has-text("Sign out")');
  await signOutButton.click();
  
  // Wait for redirect to sign-in
  await page.waitForURL(/\/sign-in/, { timeout: 10000 });
}

/**
 * Request password reset via UI
 */
export async function requestPasswordReset(page: Page, email: string): Promise<void> {
  await page.goto('/forgot-password');
  
  // Wait for form to be visible
  await page.waitForSelector('input[type="email"]', { state: 'visible' });
  
  // Fill in email
  await page.locator('input[type="email"]').fill(email);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
  
  // Wait for success message
  await page.waitForSelector('text=/reset link.*sent/i', { timeout: 10000 });
}

/**
 * Reset password via UI
 */
export async function resetPassword(
  page: Page,
  token: string,
  newPassword: string
): Promise<void> {
  await page.goto(`/reset-password?token=${token}`);
  
  // Wait for form to be visible
  await page.waitForSelector('input[id="password"]', { state: 'visible' });
  
  // Fill in new password
  await page.locator('input[id="password"]').fill(newPassword);
  await page.locator('input[id="confirmPassword"]').fill(newPassword);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
  
  // Wait for success message
  await page.waitForSelector('text=/password reset/i', { timeout: 10000 });
}

/**
 * Check if user is authenticated by attempting to access protected route
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/dashboard');
  
  // Wait for navigation to complete
  await page.waitForLoadState('domcontentloaded');
  
  // If redirected to sign-in, user is not authenticated
  const url = page.url();
  return !url.includes('/sign-in');
}

/**
 * Create authenticated session in browser context
 * This is useful for tests that need to start with an authenticated user
 */
export async function createAuthenticatedSession(
  context: BrowserContext,
  sessionToken: string
): Promise<void> {
  // Add session cookie to context
  await context.addCookies([
    {
      name: 'session',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false, // Set to true for HTTPS
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Clear all cookies from browser context
 */
export async function clearSession(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

/**
 * Wait for API response with specific status code
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus: number
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matches =
        typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      return matches && response.status() === expectedStatus;
    },
    { timeout: 10000 }
  );
}

/**
 * Make multiple failed sign-in attempts to trigger rate limiting
 */
export async function triggerSignInRateLimit(
  page: Page,
  attempts: number = 6
): Promise<void> {
  await page.goto('/sign-in');
  
  for (let i = 0; i < attempts; i++) {
    await page.locator('input[id="email"]').fill(`test${i}@example.com`);
    await page.locator('input[id="password"]').fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();
    
    // Wait for response
    await page.waitForTimeout(1000);
  }
}

/**
 * Make multiple password reset requests to trigger rate limiting
 */
export async function triggerPasswordResetRateLimit(
  page: Page,
  email: string,
  attempts: number = 4
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    
    // Wait for response
    await page.waitForTimeout(1000);
  }
}

/**
 * Verify error message is displayed
 */
export async function expectErrorMessage(
  page: Page,
  messagePattern: string | RegExp
): Promise<void> {
  const errorLocator =
    typeof messagePattern === 'string'
      ? page.locator(`text=${messagePattern}`)
      : page.locator(`text=${messagePattern}`);
  
  await errorLocator.waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Verify success message is displayed
 */
export async function expectSuccessMessage(
  page: Page,
  messagePattern: string | RegExp
): Promise<void> {
  const successLocator =
    typeof messagePattern === 'string'
      ? page.locator(`text=${messagePattern}`)
      : page.locator(`text=${messagePattern}`);
  
  await successLocator.waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Fill form fields with data
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [fieldId, value] of Object.entries(fields)) {
    await page.locator(`input[id="${fieldId}"]`).fill(value);
  }
}

/**
 * Submit form and wait for response
 */
export async function submitForm(page: Page): Promise<void> {
  await page.locator('button[type="submit"]').click();
  
  // Wait for form submission to complete
  await page.waitForTimeout(1000);
}

/**
 * Check if element is disabled
 */
export async function isElementDisabled(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = page.locator(selector);
  return await element.isDisabled();
}

/**
 * Get retry-after value from rate limit response
 */
export async function getRetryAfterValue(page: Page): Promise<number | null> {
  let retryAfter: number | null = null;
  
  page.on('response', (response) => {
    if (response.status() === 429) {
      const header = response.headers()['retry-after'];
      if (header) {
        retryAfter = parseInt(header, 10);
      }
    }
  });
  
  return retryAfter;
}
