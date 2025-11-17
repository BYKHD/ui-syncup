# E2E Tests

End-to-end tests using Playwright for deployment verification and critical user flows.

## Test Suites

### Smoke Tests (`smoke-test.spec.ts`)

Production deployment verification tests that validate:
- Health check endpoint functionality
- Homepage loading and navigation
- Authentication flow (sign-in/sign-up pages)
- API route accessibility
- Performance benchmarks

These tests are designed to run after deployment to verify the application is operational.

## Running Tests

### Local Development

Run tests against local development server:

```bash
bun run test:ui
```

This will automatically start the dev server and run tests against `http://localhost:3000`.

### Production Verification

Run tests against production deployment:

```bash
PLAYWRIGHT_BASE_URL=https://ui-syncup.com PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui
```

### Preview Environment

Run tests against Vercel preview deployment:

```bash
PLAYWRIGHT_BASE_URL=https://preview-xyz.vercel.app PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui
```

### Specific Test File

Run only smoke tests:

```bash
bun run test:ui tests/e2e/smoke-test.spec.ts
```

### Specific Browser

Run tests in a specific browser:

```bash
bun run test:ui --project=chromium
bun run test:ui --project=firefox
bun run test:ui --project=webkit
```

### Debug Mode

Run tests in debug mode with Playwright Inspector:

```bash
bun run test:ui --debug
```

### Headed Mode

Run tests with visible browser:

```bash
bun run test:ui --headed
```

## Environment Variables

- `PLAYWRIGHT_BASE_URL` - Base URL for tests (default: `http://127.0.0.1:3000`)
- `PLAYWRIGHT_SKIP_WEB_SERVER` - Skip starting local dev server (set to `1` for external URLs)
- `CI` - Enables CI-specific configuration (retries, reporters)

## CI/CD Integration

### GitHub Actions

Add to your CI workflow:

```yaml
- name: Install Playwright Browsers
  run: bunx playwright install --with-deps

- name: Run E2E Tests
  run: bun run test:ui
```

### Post-Deployment Verification

Run smoke tests after production deployment:

```yaml
- name: Verify Production Deployment
  run: |
    PLAYWRIGHT_BASE_URL=https://ui-syncup.com \
    PLAYWRIGHT_SKIP_WEB_SERVER=1 \
    bun run test:ui tests/e2e/smoke-test.spec.ts
```

## Test Structure

Tests follow Playwright best practices:

- **Descriptive test names** - Clear description of what is being tested
- **Proper assertions** - Use `expect()` for all validations
- **Wait strategies** - Use `waitForLoadState()` and `waitForSelector()` appropriately
- **Error handling** - Tests handle both success and failure scenarios
- **Performance checks** - Include timing assertions for critical paths

## Writing New Tests

When adding new E2E tests:

1. Create test file in `tests/e2e/` with `.spec.ts` extension
2. Use descriptive `test.describe()` blocks to group related tests
3. Add JSDoc comments explaining test purpose and requirements
4. Include both positive and negative test cases
5. Use page object pattern for complex interactions
6. Keep tests independent and idempotent

Example:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should perform expected action', async ({ page }) => {
    await page.goto('/feature')
    await expect(page.locator('h1')).toContainText('Expected Text')
  })
})
```

## Troubleshooting

### Tests Failing Locally

1. Ensure dev server is running: `bun run dev`
2. Check if port 3000 is available
3. Clear browser cache: `bunx playwright clean`
4. Update browsers: `bunx playwright install`

### Tests Failing in CI

1. Check CI logs for specific error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Check for timing issues (increase timeouts if needed)

### Tests Failing in Production

1. Verify deployment completed successfully
2. Check health endpoint: `curl https://ui-syncup.com/api/health`
3. Review Vercel deployment logs
4. Ensure environment variables are configured in Vercel

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
