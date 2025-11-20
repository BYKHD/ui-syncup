# E2E Tests Quick Start Guide

## Prerequisites

1. **Install Playwright browsers** (first time only):
   ```bash
   bunx playwright install
   ```

2. **Setup test database**:
   ```bash
   # Start PostgreSQL (if using Docker)
   docker-compose up -d postgres
   
   # Run migrations
   bun run db:push
   ```

3. **Configure environment** (create `.env.test`):
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ui_syncup_test
   BETTER_AUTH_SECRET=test-secret-key-min-32-chars-long
   BETTER_AUTH_URL=http://localhost:3000
   RESEND_API_KEY=re_test_key
   RESEND_FROM_EMAIL=noreply@example.com
   ```

## Running Tests

### Run all tests
```bash
bun run test:ui
```

### Run specific test file
```bash
bun run test:ui tests/e2e/auth.spec.ts
```

### Run in headed mode (see browser)
```bash
bun run test:ui --headed
```

### Run in debug mode
```bash
bun run test:ui --debug
```

### Run specific browser
```bash
bun run test:ui --project=chromium
bun run test:ui --project=firefox
bun run test:ui --project=webkit
```

## View Test Results

### HTML Report
```bash
bunx playwright show-report
```

### Trace Viewer (for failed tests)
```bash
bunx playwright show-trace test-results/trace.zip
```

## Common Issues

### "Cannot connect to database"
- Ensure PostgreSQL is running: `docker-compose up -d postgres`
- Check DATABASE_URL in `.env.test`

### "Port 3000 already in use"
- Stop any running dev servers
- Or change PORT in environment

### "Tests timing out"
- Increase timeout: `test.setTimeout(120000)` in test file
- Check network connection
- Ensure dev server starts successfully

### "Rate limiting errors"
- Wait between test runs
- Clear rate limit cache (restart Redis or clear in-memory cache)

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

View results in GitHub Actions tab.

## Need Help?

See full documentation: [tests/e2e/README.md](./README.md)
