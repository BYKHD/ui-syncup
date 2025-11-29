# Testing Guide

> Comprehensive guide for writing and running automated tests in the ui-syncup project.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Setup & Configuration](#setup--configuration)
4. [Test Types](#test-types)
5. [Writing Tests](#writing-tests)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Reference](#reference)

---

## Overview

### Testing Philosophy

This project follows a comprehensive testing strategy that emphasizes:

- **Property-Based Testing**: Using `fast-check` to test invariants across generated inputs
- **Integration Testing**: Testing complete user flows with real database operations
- **Test Isolation**: Each test runs independently with a clean database state
- **Fast Feedback**: In-memory database (pg-mem) for quick test execution
- **Real-World Scenarios**: Tests mirror actual usage patterns

### Test Stack

| Purpose | Tool | Version |
|---------|------|---------|
| Test Runner | Vitest | 2.1.4 |
| Property Testing | fast-check | 4.3.0 |
| React Testing | @testing-library/react | 16.0.1 |
| E2E Testing | Playwright | 1.47.2 |
| Test Database | pg-mem | 3.0.5 |
| DOM Environment | jsdom | 27.2.0 |

### Test Types

This project uses 4 main types of tests:

1. **Unit Tests** - Test individual functions in isolation
2. **Property-Based Tests** - Test invariants with generated inputs
3. **Integration Tests** - Test complete flows with database
4. **React Component Tests** - Test hooks and components
5. **E2E Tests** - Full browser automation (see [E2E docs](../tests/e2e/README.md))

---

## Quick Start

### Running Tests

```bash
# Run all tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run E2E tests
bun run test:ui

# Run E2E tests with visible browser
bun run test:ui:headed
```

### Your First Test

Create a file `src/utils/__tests__/example.test.ts`:

```typescript
import { describe, test, expect } from 'vitest'

describe('Example Test', () => {
  test('should pass basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run it:
```bash
bun run test example.test.ts
```

---

## Setup & Configuration

### Test Configuration Files

#### 1. `vitest.config.ts` - Test Runner Configuration

Key settings:
- **Environment**: `jsdom` for browser-like DOM
- **Globals**: `true` - no need to import `describe`, `test`, `expect`
- **Setup File**: `vitest.setup.ts` runs before all tests
- **Test File Patterns**:
  - `src/**/__tests__/**/*.{test,spec}.{ts,tsx}`
  - `src/**/*.{test,spec}.{ts,tsx}`

#### 2. `vitest.setup.ts` - Global Test Setup

This file:
- Stubs environment variables for all tests
- Creates in-memory test database (pg-mem)
- Mocks the database module
- Resets database before/after each test
- Closes database after all tests

**Environment Variables Available:**
- `NODE_ENV=test`
- Database credentials (test PostgreSQL)
- Supabase tokens
- R2 storage configuration
- Google OAuth secrets
- Better Auth settings
- Email service keys

#### 3. `src/lib/testing/test-db.ts` - Test Database Factory

Creates in-memory PostgreSQL with:
- All Drizzle migrations applied
- Custom SQL functions (`gen_random_uuid`, `now`)
- Full schema with constraints
- Reset capability for test isolation

### File Organization

Tests are organized in `__tests__` directories:

```
src/
  server/
    auth/
      __tests__/
        login.property.test.ts
        password.test.ts
      password.ts
  features/
    auth/
      hooks/
        __tests__/
          use-onboarding.test.tsx
        use-onboarding.ts
```

---

## Test Types

### 1. Unit Tests

**Purpose:** Test individual functions in isolation

**Example:** [src/server/auth/__tests__/password.test.ts](../src/server/auth/__tests__/password.test.ts)

```typescript
import { describe, test, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('Password Utilities', () => {
  test('should hash password securely', async () => {
    const password = 'MySecurePass123!'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash).toMatch(/^\$argon2id\$/)
  })

  test('should verify correct password', async () => {
    const password = 'MySecurePass123!'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)

    expect(isValid).toBe(true)
  })

  test('should reject incorrect password', async () => {
    const hash = await hashPassword('correct')
    const isValid = await verifyPassword('wrong', hash)

    expect(isValid).toBe(false)
  })
})
```

**When to use:**
- Testing pure functions
- Utilities and helpers
- Business logic without external dependencies

---

### 2. Property-Based Tests

**Purpose:** Test invariants that should hold for ALL inputs

**Example:** [src/server/auth/__tests__/login.property.test.ts](../src/server/auth/__tests__/login.property.test.ts)

```typescript
import { describe, test, expect } from 'vitest'
import fc from 'fast-check'

const propertyConfig = { numRuns: 100 }

describe('Rate Limiting Properties', () => {
  test('Property: Email rate limiting is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),  // Generates random emails
        async (email) => {
          const key1 = createRateLimitKey.signInEmail(email.toLowerCase())
          const key2 = createRateLimitKey.signInEmail(email.toUpperCase())

          // Property: All case variations should use same key
          expect(key1).toBe(key2)
        }
      ),
      propertyConfig
    )
  })

  test('Property: Rate limit blocks after N attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),  // Generates random IPs
        async (ip) => {
          const key = createRateLimitKey.signInIp(ip)
          const { limit } = RATE_LIMITS.SIGNIN_IP

          // Property: First N requests succeed
          for (let i = 0; i < limit; i++) {
            const allowed = await checkLimit(key, limit, windowMs)
            expect(allowed).toBe(true)
          }

          // Property: (N+1)th request is blocked
          const blocked = await checkLimit(key, limit, windowMs)
          expect(blocked).toBe(false)
        }
      ),
      propertyConfig
    )
  })
})
```

**Custom Arbitraries:**

```typescript
import fc from 'fast-check'

// Generate role strings
const roleArb = fc.constantFrom(
  'TEAM_OWNER',
  'TEAM_ADMIN',
  'TEAM_EDITOR',
  'TEAM_MEMBER'
)

// Generate user objects
const userArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  roles: fc.array(roleArb, { minLength: 0, maxLength: 5 })
})
```

**When to use:**
- Complex business logic
- Validation functions
- Security-critical code (auth, permissions)
- Edge case discovery

**Configuration:**
- `numRuns`: 20-100 (lower for expensive operations like hashing)
- `timeout`: 30000ms for async operations

---

### 3. Integration Tests

**Purpose:** Test complete flows with database

**Example:** [src/server/auth/__tests__/auth-integration.test.ts](../src/server/auth/__tests__/auth-integration.test.ts)

```typescript
import { describe, test, expect, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

describe('Integration Test: Registration → Verification → Sign-in', () => {
  const testUserIds: string[] = []

  // Helper to create test user
  async function createTestUser(email: string, password: string) {
    const passwordHash = await hashPassword(password)
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: 'Test User',
        emailVerified: false,
      })
      .returning()

    testUserIds.push(user.id)
    return user
  }

  // Cleanup after each test
  afterEach(async () => {
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId))
    }
    testUserIds.length = 0
  })

  test('should complete full registration flow', async () => {
    // Step 1: Create user
    const user = await createTestUser('test@example.com', 'Pass123!')
    expect(user.id).toBeTruthy()

    // Step 2: Generate verification token
    const token = await generateToken(user.id, 'email_verification', 86400000)
    expect(token.token).toBeTruthy()

    // Step 3: Verify token
    const verified = await verifyToken(token.token, 'email_verification')
    expect(verified?.userId).toBe(user.id)

    // Step 4: Create session
    const sessionToken = await createSession(user.id, '127.0.0.1', 'Test Browser')
    expect(sessionToken).toBeTruthy()

    // Step 5: Verify session works
    const session = await getSession({ token: sessionToken })
    expect(session?.email).toBe('test@example.com')
  })
})
```

**When to use:**
- Testing complete user flows
- Database operations
- Multi-step processes
- API route testing

---

### 4. React Component Tests

#### Testing Components

**Example:** [src/features/auth/components/__tests__/role-gate.test.tsx](../src/features/auth/components/__tests__/role-gate.test.tsx)

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoleGate } from '../role-gate'

describe('RoleGate Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  afterEach(() => {
    cleanup()
  })

  test('should show content when user has required role', () => {
    const mockUser = {
      id: '123',
      roles: [{ role: 'TEAM_ADMIN' }]
    }

    const mockUseSession = () => ({ user: mockUser, isLoading: false })

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { getByText } = render(
      <RoleGate roles={['TEAM_ADMIN']} useSession={mockUseSession}>
        <div>Protected Content</div>
      </RoleGate>,
      { wrapper }
    )

    expect(getByText('Protected Content')).toBeInTheDocument()
  })

  test('should show fallback when user lacks required role', () => {
    const mockUser = {
      id: '123',
      roles: [{ role: 'TEAM_VIEWER' }]
    }

    const mockUseSession = () => ({ user: mockUser, isLoading: false })

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { getByText } = render(
      <RoleGate
        roles={['TEAM_ADMIN']}
        fallback={<div>Unauthorized</div>}
        useSession={mockUseSession}
      >
        <div>Protected Content</div>
      </RoleGate>,
      { wrapper }
    )

    expect(getByText('Unauthorized')).toBeInTheDocument()
  })
})
```

#### Testing Hooks

**Example:** [src/features/auth/hooks/__tests__/use-onboarding.test.tsx](../src/features/auth/hooks/__tests__/use-onboarding.test.tsx)

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnboarding } from '../use-onboarding'

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should initialize with create mode when no token', () => {
    const { result } = renderHook(() => useOnboarding(null, 'My Team'))

    expect(result.current.mode).toBe('create')
    expect(result.current.teamName).toBe('My Team')
  })

  test('should call createTeam when form submitted', async () => {
    const mockCreateTeam = vi.fn()
    vi.mock('../api', () => ({ createTeam: mockCreateTeam }))

    const { result } = renderHook(() => useOnboarding(null, 'New Team'))

    await act(async () => {
      await result.current.handleCreateTeam({ preventDefault: vi.fn() })
    })

    expect(mockCreateTeam).toHaveBeenCalledWith(
      { name: 'New Team', description: '' },
      expect.any(Object)
    )
  })
})
```

**When to use:**
- Testing React components
- Testing custom hooks
- UI interaction logic
- Component rendering

---

## Writing Tests

### File Naming Conventions

| Test Type | Pattern | Example |
|-----------|---------|---------|
| Unit/Integration | `*.test.ts(x)` | `password.test.ts` |
| Property-Based | `*.property.test.ts(x)` | `login.property.test.ts` |
| React Components | `*.test.tsx` | `role-gate.test.tsx` |

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
test('should do something', () => {
  // Arrange: Set up test data
  const input = 'test'

  // Act: Perform the action
  const result = doSomething(input)

  // Assert: Verify the outcome
  expect(result).toBe(expected)
})
```

### Setup and Teardown

```typescript
describe('Feature Tests', () => {
  // Runs once before all tests in this describe block
  beforeAll(async () => {
    // One-time setup
  })

  // Runs before each test
  beforeEach(() => {
    // Reset state, clear mocks
    vi.clearAllMocks()
  })

  // Runs after each test
  afterEach(async () => {
    // Cleanup test data
  })

  // Runs once after all tests
  afterAll(async () => {
    // Final cleanup
  })
})
```

### Database Testing Patterns

#### Pattern 1: Track and Clean Up Test Data

```typescript
describe('User Management', () => {
  const testUserIds: string[] = []

  async function createTestUser(email: string) {
    const [user] = await db.insert(users).values({ email }).returning()
    testUserIds.push(user.id)
    return user
  }

  afterEach(async () => {
    // Clean up all created users
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId))
    }
    testUserIds.length = 0
  })

  test('should create user', async () => {
    const user = await createTestUser('test@example.com')
    expect(user.email).toBe('test@example.com')
  })
})
```

#### Pattern 2: Use Global Database Reset

The test database is automatically reset before/after each test via `vitest.setup.ts`:

```typescript
// No need for manual cleanup - database resets automatically
describe('Team Tests', () => {
  test('should create team', async () => {
    const [team] = await db.insert(teams).values({ name: 'Test' }).returning()
    expect(team.name).toBe('Test')
  })
  // Database automatically resets after this test
})
```

### Mocking Strategies

#### Mock Modules

```typescript
// Mock at top level (before describe)
vi.mock('../email-client', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Email Tests', () => {
  test('should send email', async () => {
    await sendWelcomeEmail('test@example.com')
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      template: 'welcome',
    })
  })
})
```

#### Mock Functions

```typescript
import { vi } from 'vitest'

const mockFn = vi.fn()
mockFn.mockReturnValue('result')
mockFn.mockResolvedValue('async result')
mockFn.mockRejectedValue(new Error('failure'))

// Spy on existing function
const spy = vi.spyOn(object, 'method')
spy.mockReturnValue('mocked')
// ... test code ...
spy.mockRestore()
```

#### Mock Environment Variables

```typescript
beforeEach(() => {
  // Override global env vars
  process.env.CUSTOM_VAR = 'test-value'
})
```

#### Dependency Injection (Preferred for Components)

```typescript
// Instead of mocking useSession module
const mockUseSession = () => ({ user, isLoading: false })

<Component useSession={mockUseSession} />
```

---

## Common Patterns

### Property-Based Testing with fast-check

```typescript
import fc from 'fast-check'

const propertyConfig = { numRuns: 100, timeout: 30000 }

test('Property: Email validation accepts valid emails', () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      (email) => {
        const result = isValidEmail(email)
        expect(result).toBe(true)
      }
    ),
    propertyConfig
  )
})

test('Property: Password hashing is consistent', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 8, maxLength: 128 }),
      async (password) => {
        const hash1 = await hashPassword(password)
        const hash2 = await hashPassword(password)

        // Hashes should be different (salt)
        expect(hash1).not.toBe(hash2)

        // Both should verify the password
        expect(await verifyPassword(password, hash1)).toBe(true)
        expect(await verifyPassword(password, hash2)).toBe(true)
      }
    ),
    { numRuns: 10, timeout: 60000 }  // Lower runs for expensive operations
  )
})
```

### React Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react'

test('hook updates state', () => {
  const { result } = renderHook(() => useCounter(0))

  expect(result.current.count).toBe(0)

  act(() => {
    result.current.increment()
  })

  expect(result.current.count).toBe(1)
})
```

### Database Integration Tests

```typescript
describe('Integration: User Registration', () => {
  test('should create user and send verification email', async () => {
    // Mock email service
    const sendEmailSpy = vi.spyOn(emailClient, 'sendEmail')

    // Register user
    const result = await registerUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    })

    // Verify database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@example.com'))

    expect(user).toBeDefined()
    expect(user.emailVerified).toBe(false)

    // Verify email sent
    expect(sendEmailSpy).toHaveBeenCalledWith({
      to: 'test@example.com',
      template: 'verify-email',
      data: expect.objectContaining({
        token: expect.any(String),
      }),
    })
  })
})
```

---

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests:

```typescript
// BAD: Tests depend on order
test('create user', () => { userId = createUser() })
test('update user', () => { updateUser(userId) })  // Depends on previous test

// GOOD: Each test is independent
test('create user', () => {
  const userId = createUser()
  expect(userId).toBeDefined()
})

test('update user', () => {
  const userId = createUser()  // Create own test data
  const result = updateUser(userId)
  expect(result.success).toBe(true)
})
```

### 2. Data Cleanup

Always clean up test data:

```typescript
afterEach(async () => {
  // Delete in reverse FK order
  await db.delete(teamMembers).where(inArray(teamMembers.teamId, testTeamIds))
  await db.delete(teams).where(inArray(teams.id, testTeamIds))
  await db.delete(users).where(inArray(users.id, testUserIds))

  testTeamIds.length = 0
  testUserIds.length = 0
})
```

### 3. Use Descriptive Test Names

```typescript
// BAD
test('works', () => { ... })
test('test1', () => { ... })

// GOOD
test('should hash password with Argon2id', () => { ... })
test('should reject weak passwords', () => { ... })
test('should send verification email after registration', () => { ... })
```

### 4. Test Edge Cases

```typescript
test('should handle empty input', () => { ... })
test('should handle very long input', () => { ... })
test('should handle special characters', () => { ... })
test('should handle concurrent requests', () => { ... })
```

### 5. Keep Tests Fast

```typescript
// Mock expensive operations
vi.mock('../expensive-operation', () => ({
  expensiveOp: vi.fn().mockResolvedValue('result')
}))

// Use in-memory database (already configured)
// Reduce property test runs for expensive tests
const config = { numRuns: 10 }  // Instead of 100
```

### 6. Use Property Testing for Security-Critical Code

```typescript
// Test auth, permissions, validation with property tests
test('Property: All passwords must be hashed', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1 }),
      async (password) => {
        const hash = await hashPassword(password)
        expect(hash).not.toBe(password)
        expect(hash).toMatch(/^\$argon2/)
      }
    )
  )
})
```

---

## Troubleshooting

### Common Issues

#### 1. Test Database Not Resetting

**Symptom:** Tests fail due to data from previous tests

**Solution:**
- Check `vitest.setup.ts` has `beforeEach` and `afterEach` hooks
- Verify `src/lib/testing/test-db.ts` includes all tables in `resetDatabase()`
- Check table order respects foreign key constraints

```typescript
// test-db.ts
const resetDatabase = async () => {
  const tables = [
    "email_jobs",
    "team_members",  // Before teams (FK constraint)
    "teams",
    "users",
  ]

  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`))
  }
}
```

#### 2. Environment Variables Not Available

**Symptom:** Tests fail with missing env var errors

**Solution:**
- Check `vitest.setup.ts` has `vi.stubEnv()` calls
- Override in specific tests with `process.env.VAR = 'value'`

```typescript
beforeEach(() => {
  process.env.CUSTOM_VAR = 'test-value'
})
```

#### 3. Mocks Not Working

**Symptom:** Original function called instead of mock

**Solution:**
- Ensure `vi.mock()` is at **top level**, before `describe()`
- Use `vi.clearAllMocks()` in `beforeEach()`
- Check import path matches exactly

```typescript
// At top level
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}))

describe('Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
})
```

#### 4. Property Tests Timing Out

**Symptom:** Test exceeds time limit

**Solution:**
- Reduce `numRuns` configuration
- Add `timeout` parameter
- Mock expensive operations

```typescript
await fc.assert(
  fc.asyncProperty(...),
  {
    numRuns: 20,      // Reduced from 100
    timeout: 30000    // 30 second timeout
  }
)
```

#### 5. React Component Tests Failing

**Symptom:** Provider/context errors

**Solution:**
- Wrap with required providers
- Use `cleanup()` in `afterEach()`

```typescript
import { cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

afterEach(() => {
  cleanup()
})

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

render(<Component />, { wrapper })
```

### Debugging Tips

1. **Use `test.only` to run single test:**
   ```typescript
   test.only('should debug this test', () => { ... })
   ```

2. **Use `console.log` in tests:**
   ```typescript
   test('debugging', () => {
     console.log('Value:', value)
     expect(value).toBe(expected)
   })
   ```

3. **Run with verbose output:**
   ```bash
   bun run test -- --reporter=verbose
   ```

4. **Check test database state:**
   ```typescript
   test('debug db', async () => {
     const users = await db.select().from(users)
     console.log('Users in DB:', users)
   })
   ```

---

## Reference

### Test Scripts Cheatsheet

```bash
# Run all tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run specific test file
bun run test path/to/file.test.ts

# Run tests matching pattern
bun run test auth

# Run with coverage
bun run test -- --coverage

# Run E2E tests
bun run test:ui

# Run E2E in headed mode
bun run test:ui:headed

# Debug E2E tests
bun run test:ui:debug
```

### Important Files

| File | Purpose |
|------|---------|
| [`vitest.config.ts`](../vitest.config.ts) | Test runner configuration |
| [`vitest.setup.ts`](../vitest.setup.ts) | Global setup, env vars, test DB |
| [`src/lib/testing/test-db.ts`](../src/lib/testing/test-db.ts) | In-memory database factory |
| [`playwright.config.ts`](../playwright.config.ts) | E2E test configuration |
| [`tests/e2e/README.md`](../tests/e2e/README.md) | E2E testing guide |

### Example Test Files

| Type | Example File |
|------|-------------|
| Unit Test | [`src/server/auth/__tests__/password.test.ts`](../src/server/auth/__tests__/password.test.ts) |
| Property Test | [`src/server/auth/__tests__/login.property.test.ts`](../src/server/auth/__tests__/login.property.test.ts) |
| Integration Test | [`src/server/auth/__tests__/auth-integration.test.ts`](../src/server/auth/__tests__/auth-integration.test.ts) |
| Component Test | [`src/features/auth/components/__tests__/role-gate.test.tsx`](../src/features/auth/components/__tests__/role-gate.test.tsx) |
| Hook Test | [`src/features/auth/hooks/__tests__/use-onboarding.test.tsx`](../src/features/auth/hooks/__tests__/use-onboarding.test.tsx) |

### External Resources

- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://fast-check.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Property-Based Testing Guide](https://fast-check.dev/docs/introduction/)

---

## Next Steps

- Read the [Quick Start Guide](./TESTING_QUICK_START.md) for a condensed reference
- Check out the [E2E Testing Guide](../tests/e2e/README.md) for browser automation tests
- Explore example tests in the codebase
- Start writing your first test!

---

**Questions or Issues?** Check the [Troubleshooting](#troubleshooting) section or ask the team.
