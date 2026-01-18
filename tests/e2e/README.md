# E2E Tests for Authentication System

Comprehensive end-to-end tests for the authentication system using Playwright.

## Test Coverage

The E2E tests cover all authentication requirements:

### User Registration and Email Verification
- ✅ Successful user registration
- ✅ Duplicate email rejection
- ✅ Password complexity validation
- ✅ Password confirmation matching
- ✅ Password strength indicator
- ✅ Email verification flow

### User Sign-In and Dashboard Access
- ✅ Successful sign-in with valid credentials
- ✅ Invalid credentials rejection
- ✅ Unverified email rejection
- ✅ Session persistence across page refreshes
- ✅ Authenticated user redirection

### Password Reset Flow
- ✅ Forgot password form display
- ✅ Password reset request acceptance
- ✅ Email enumeration prevention
- ✅ Reset password form with valid token
- ✅ New password complexity validation

### Sign-Out from Multiple Devices
- ✅ Successful sign-out
- ✅ Redirect to sign-in after sign-out
- ✅ Session invalidation after sign-out
- ✅ Other device sessions preservation

### Rate Limiting
- ✅ IP-based rate limiting on sign-in (5 per minute)
- ✅ Email-based rate limiting on sign-in (3 per 15 minutes)
- ✅ Password reset rate limiting (3 per hour)
- ✅ Retry-after header in rate limit responses

### Protected Route Access Control
- ✅ Public routes accessible without authentication
- ✅ Protected routes redirect unauthenticated users
- ✅ Authenticated users can access protected routes
- ✅ Guest-only routes redirect authenticated users
- ✅ Server-side session validation

## Running Tests

### Local Development

```bash
# Run all E2E tests
bun run test:ui

# Run specific test file
bun run test:ui tests/e2e/auth.spec.ts

# Run tests in headed mode (see browser)
bun run test:ui --headed

# Run tests in debug mode
bun run test:ui --debug

# Run tests in specific browser
bun run test:ui --project=chromium
bun run test:ui --project=firefox
bun run test:ui --project=webkit
```

### Prerequisites

1. **Database**: Ensure PostgreSQL is running and test database is set up
   ```bash
   # Start local database (if using Docker)
   docker-compose up -d postgres
   
   # Run migrations
   bun run db:push
   ```

2. **Environment Variables**: Create `.env.test` file
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ui_syncup_test
   BETTER_AUTH_SECRET=your-test-secret
   BETTER_AUTH_URL=http://localhost:3000
   RESEND_API_KEY=your-test-api-key
   RESEND_FROM_EMAIL=noreply@example.com
   ```

3. **Install Playwright Browsers**
   ```bash
   bunx playwright install
   ```

### CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI workflow:
1. Sets up PostgreSQL database
2. Installs dependencies
3. Runs database migrations
4. Builds the application
5. Installs Playwright browsers
6. Runs E2E tests
7. Uploads test reports and videos

### Testing Against Production/Preview

```bash
# Test against production
PLAYWRIGHT_BASE_URL=https://ui-syncup.com PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui

# Test against preview deployment
PLAYWRIGHT_BASE_URL=https://preview-xyz.vercel.app PLAYWRIGHT_SKIP_WEB_SERVER=1 bun run test:ui
```

## Test Structure

```
tests/e2e/
├── auth.spec.ts              # Main authentication tests
├── smoke-test.spec.ts        # Basic smoke tests
├── helpers/
│   ├── auth-helpers.ts       # Reusable auth test helpers
│   └── test-fixtures.ts      # Database fixtures and setup
├── global-setup.ts           # Global test setup
├── global-teardown.ts        # Global test cleanup
└── README.md                 # This file
```

## Test Helpers

### Authentication Helpers (`helpers/auth-helpers.ts`)

```typescript
import { generateTestUser, signUpUser, signInUser } from './helpers/auth-helpers';

// Generate unique test user
const user = generateTestUser();

// Sign up via UI
await signUpUser(page, user);

// Sign in via UI
await signInUser(page, user.email, user.password);
```

### Database Fixtures (`helpers/test-fixtures.ts`)

```typescript
import { 
  createVerifiedTestUser, 
  createAuthenticatedTestUser,
  deleteTestUser 
} from './helpers/test-fixtures';

// Create verified user in database
const user = await createVerifiedTestUser();

// Create authenticated user with session
const { user, sessionToken } = await createAuthenticatedTestUser();

// Clean up
await deleteTestUser(user.id);
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { generateTestUser, signUpUser } from './helpers/auth-helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    const user = generateTestUser();
    
    // Test implementation
    await page.goto('/some-page');
    
    // Assertions
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Helpers**: Leverage existing helpers for common operations
2. **Clean Up**: Always clean up test data after tests
3. **Unique Data**: Use `generateTestUser()` for unique test data
4. **Wait for Elements**: Use `waitForSelector` or `expect().toBeVisible()`
5. **Descriptive Names**: Use clear, descriptive test names
6. **Test Isolation**: Each test should be independent
7. **Error Messages**: Use meaningful error messages in assertions

## Debugging Tests

### View Test Report

```bash
# Generate and open HTML report
bunx playwright show-report
```

### Debug Specific Test

```bash
# Run in debug mode
bun run test:ui --debug tests/e2e/auth.spec.ts

# Run with headed browser
bun run test:ui --headed tests/e2e/auth.spec.ts
```

### View Test Traces

```bash
# Open trace viewer
bunx playwright show-trace test-results/trace.zip
```

## Troubleshooting

### Tests Failing Locally

1. **Database Connection**: Ensure PostgreSQL is running
   ```bash
   docker-compose up -d postgres
   ```

2. **Environment Variables**: Check `.env.test` is configured
   ```bash
   cat .env.test
   ```

3. **Database Migrations**: Run migrations
   ```bash
   bun run db:push
   ```

4. **Clean Test Data**: Clean up old test data
   ```bash
   # Connect to database and run
   DELETE FROM users WHERE email LIKE 'test-%@example.com';
   ```

### Tests Timing Out

1. **Increase Timeout**: Add timeout to specific test
   ```typescript
   test('slow test', async ({ page }) => {
     test.setTimeout(120000); // 2 minutes
     // ...
   });
   ```

2. **Check Network**: Ensure good network connection for external services

3. **Server Startup**: Ensure dev server has enough time to start

### Rate Limiting Issues

If tests are being rate limited:

1. **Wait Between Tests**: Add delays between rate limit tests
2. **Use Different IPs**: Run tests from different machines
3. **Clear Rate Limit Cache**: Restart Redis or clear in-memory cache

## Maintenance

### Updating Tests

When authentication features change:

1. Update test helpers in `helpers/`
2. Update test assertions in `auth.spec.ts`
3. Update this README with new test coverage
4. Run tests locally to verify changes
5. Update CI workflow if needed

### Adding New Test Suites

1. Create new test file: `tests/e2e/feature.spec.ts`
2. Import helpers: `import { ... } from './helpers/auth-helpers'`
3. Write tests following existing patterns
4. Update this README with new test coverage

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Authentication System Design](../../.ai/specs/authentication-system/design.md)
- [Authentication System Requirements](../../.ai/specs/authentication-system/requirements.md)
