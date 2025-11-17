import { defineConfig, devices } from "@playwright/test"

const PORT = process.env.PORT ?? "3000"
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

/**
 * Playwright Configuration
 * 
 * Supports multiple test environments:
 * 
 * Local development (default):
 *   bun run test:ui
 * 
 * Production verification:
 *   PLAYWRIGHT_BASE_URL=https://ui-syncup.com PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui
 * 
 * Preview environment:
 *   PLAYWRIGHT_BASE_URL=https://preview-xyz.vercel.app PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui
 * 
 * CI environment:
 *   Automatically configures retries and reporters for GitHub Actions
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    // Increase timeout for production tests (network latency)
    actionTimeout: process.env.PLAYWRIGHT_BASE_URL ? 15 * 1000 : 10 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  // Only start local dev server if not testing against external URL
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: "bun run dev",
        url: BASE_URL,
        stdout: "pipe",
        stderr: "pipe",
        reuseExistingServer: !process.env.CI,
      },
})
