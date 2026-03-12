# Authentication Integration Tests

This directory contains comprehensive integration tests for the authentication system.

## Test Files

- **`auth-integration.test.ts`**: Complete end-to-end integration tests covering all authentication flows
- **`signup.property.test.ts`**: Property-based tests for user registration
- **`tokens.test.ts`**: Property-based tests for token generation and verification
- **`cookies.test.ts`**: Unit tests for cookie management
- **`rbac.test.ts`**: Unit tests for role-based access control

## Integration Test Coverage

The integration tests in `auth-integration.test.ts` cover the following scenarios:

### 1. Complete Registration → Verification → Sign-in Flow
- User registration with password hashing
- Email verification token generation and validation
- Token one-time use enforcement
- User verification status update
- Session creation after verification
- End-to-end flow validation

### 2. Sign-in with Invalid Credentials
- Wrong password rejection
- Non-existent email handling
- Generic error messages (no account enumeration)

### 3. Sign-in with Unverified Email
- Session creation behavior for unverified users
- Application-level verification checks

### 4. Password Reset Flow
- Reset token generation
- Token verification and one-time use
- Password update
- All sessions invalidation
- Old password rejection
- New password acceptance
- Account existence protection (no enumeration)

### 5. Session Validation and Renewal
- Session validation
- Session expiration extension (rolling renewal)
- Expired session rejection
- Tampered token rejection

### 6. Rate Limiting Behavior
- IP-based rate limiting (5 attempts per minute)
- Email-based rate limiting (3 attempts per 15 minutes)
- Separate rate limit tracking per key
- Rate limit violation logging

### 7. Concurrent Session Handling
- Multiple simultaneous sessions per user
- Session isolation (different devices)
- Single session deletion (sign-out)
- All sessions deletion (password reset)

## Prerequisites

### Database Setup

Integration tests require a running PostgreSQL database. You have two options:

#### Option 1: Local Docker Database (Recommended)

```bash
# Start local services (PostgreSQL + pgAdmin)
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps postgres

# Check database connection
docker exec -it ui-syncup-postgres pg_isready -U postgres
```

#### Option 2: Supabase Local Development

```bash
# Start Supabase local stack
bun run supabase:start

# This starts PostgreSQL, Auth, Storage, and other services
```

### Environment Variables

Ensure your test environment variables are configured in `vitest.setup.ts`:

```typescript
vi.stubEnv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/ui_syncup_dev")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-with-at-least-32-characters")
vi.stubEnv("RESEND_API_KEY", "re_test_key")
vi.stubEnv("RESEND_FROM_EMAIL", "test@example.com")
```

## Running the Tests

### Run All Integration Tests

```bash
# Run all integration tests
bun test src/server/auth/__tests__/auth-integration.test.ts --run

# Run with coverage
bun test src/server/auth/__tests__/auth-integration.test.ts --run --coverage
```

### Run Specific Test Suites

```bash
# Run only registration flow tests
bun test src/server/auth/__tests__/auth-integration.test.ts --run -t "Complete Registration"

# Run only password reset tests
bun test src/server/auth/__tests__/auth-integration.test.ts --run -t "Password Reset Flow"

# Run only session tests
bun test src/server/auth/__tests__/auth-integration.test.ts --run -t "Session Validation"

# Run only rate limiting tests
bun test src/server/auth/__tests__/auth-integration.test.ts --run -t "Rate Limiting"

# Run only concurrent session tests
bun test src/server/auth/__tests__/auth-integration.test.ts --run -t "Concurrent Session"
```

### Run All Auth Tests

```bash
# Run all tests in the auth directory
bun test src/server/auth/__tests__ --run

# Run with watch mode (for development)
bun test src/server/auth/__tests__ --watch
```

## Test Database Management

### Automatic Cleanup

The integration tests automatically clean up test data after each test:

- All created users are deleted
- All created sessions are deleted
- All created tokens are deleted

This ensures tests are isolated and don't interfere with each other.

### Manual Cleanup

If tests fail and leave orphaned data:

```bash
# Connect to the database
docker exec -it ui-syncup-postgres psql -U postgres -d ui_syncup_dev

# Delete test users (emails starting with 'test-', 'unverified-', etc.)
DELETE FROM verification_tokens WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test-%' OR email LIKE 'unverified-%'
);
DELETE FROM sessions WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test-%' OR email LIKE 'unverified-%'
);
DELETE FROM users WHERE email LIKE 'test-%' OR email LIKE 'unverified-%';
```

### Test Database Reset

To completely reset the test database:

```bash
# Stop and remove volumes
docker-compose down -v

# Start services again
docker-compose up -d

# Run migrations
bun run db:push
```

## Troubleshooting

### Database Connection Errors

If you see `ECONNREFUSED` errors:

1. **Check if PostgreSQL is running:**
   ```bash
   docker-compose ps postgres
   ```

2. **Check PostgreSQL logs:**
   ```bash
   docker-compose logs postgres
   ```

3. **Restart PostgreSQL:**
   ```bash
   docker-compose restart postgres
   ```

4. **Verify connection string:**
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://postgres:password@localhost:5432/ui_syncup_dev
   ```

### Port Conflicts

If port 5432 is already in use:

1. **Change the port in `docker-compose.yml`:**
   ```yaml
   ports:
     - "5433:5432"  # Use port 5433 instead
   ```

2. **Update DATABASE_URL:**
   ```bash
   DATABASE_URL=postgresql://postgres:password@localhost:5433/ui_syncup_dev
   ```

### Test Timeouts

If tests timeout (especially password hashing tests):

- Password hashing with Argon2 is computationally expensive
- Tests have 60-second timeouts for hashing operations
- If tests still timeout, your machine may be slow - consider reducing `numRuns` in property tests

### Rate Limiting Test Failures

Rate limiting tests use an in-memory store that persists across tests. If tests fail:

1. **Clear rate limits between test runs:**
   ```typescript
   import { clearAllLimits } from '@/server/auth/rate-limiter';
   
   beforeEach(async () => {
     await clearAllLimits();
   });
   ```

2. **Use unique keys per test:**
   - Tests already use random IP addresses and timestamps
   - This ensures isolation between test runs

## CI/CD Integration

### GitHub Actions

Add this to your CI workflow:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: ui_syncup_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run migrations
        run: bun run db:push
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/ui_syncup_test
      
      - name: Run integration tests
        run: bun test src/server/auth/__tests__/auth-integration.test.ts --run
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/ui_syncup_test
          BETTER_AUTH_SECRET: test-secret-key-with-at-least-32-characters
```

## Test Maintenance

### Adding New Integration Tests

When adding new authentication features:

1. **Add test cases to `auth-integration.test.ts`:**
   ```typescript
   describe('Integration Test: New Feature', () => {
     test('should handle new feature correctly', async () => {
       // Test implementation
     });
   });
   ```

2. **Follow the existing patterns:**
   - Use `createTestUser()` helper for user creation
   - Track IDs in cleanup arrays (`testUserIds`, `testSessionIds`)
   - Clean up in `afterEach()` hook

3. **Test complete flows:**
   - Don't just test individual functions
   - Test how components work together
   - Verify database state changes

### Updating Tests

When modifying authentication logic:

1. **Update affected tests**
2. **Run all integration tests** to ensure no regressions
3. **Update this README** if test requirements change

## Performance Considerations

### Test Execution Time

- **Full suite**: ~1-2 seconds (with database)
- **Rate limiting tests**: <100ms (in-memory)
- **Password hashing tests**: ~500ms per test (Argon2 is slow)

### Optimization Tips

1. **Run tests in parallel** (Vitest default)
2. **Use test database** (not production)
3. **Clean up efficiently** (batch deletes)
4. **Mock external services** (email, etc.)

## Related Documentation

- [Authentication Design](../.ai/specs/authentication-system/design.md)
- [Authentication Requirements](../.ai/specs/authentication-system/requirements.md)
- [Local Development Setup](../../../docs/LOCAL_DEVELOPMENT.md)
- [Supabase Local Setup](../../../docs/SUPABASE_LOCAL_SETUP.md)

## Questions?

If you have questions about the integration tests:

1. Check this README
2. Review the test code and comments
3. Check the design document for expected behavior
4. Ask the team in Slack/Discord
