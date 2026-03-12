# Testing Guide

> Practical guide for writing tests in the ui-syncup project using modern React testing practices.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Types](#test-types)
4. [Common Patterns](#common-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Reference](#reference)

---

## Overview

### Testing Philosophy

This project follows modern React testing best practices:

- **User-Centric Testing**: Test behavior users see, not implementation details
- **Component-First**: Prioritize testing UI components and hooks
- **Fast Feedback**: In-memory database (PGlite) for quick test execution
- **Test Isolation**: Each test runs independently with clean state
- **Practical Coverage**: Focus on critical paths, not 100% coverage

### Tech Stack

| Purpose | Tool | Version |
|---------|------|---------|
| Test Runner | Vitest | 2.1.4 |
| Component Testing | @testing-library/react | 16.0.1 |
| User Interactions | @testing-library/user-event | 14.5.2 |
| E2E Testing | Playwright | 1.47.2 |
| Test Database | PGlite | 0.3.14 |

### Test Types (Priority Order)

1. **Component Tests** - Test React components (PRIMARY)
2. **Hook Tests** - Test custom React hooks (PRIMARY)
3. **Integration Tests** - Test user flows with API/database
4. **Unit Tests** - Test individual utility functions
5. **Property Tests** - Advanced: test invariants with generated inputs (OPTIONAL)

---

## Quick Start

### Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run E2E tests
bun run test:ui

# Run specific file
bun run test path/to/file.test.ts
```

### Your First Component Test

Create `src/components/__tests__/button.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { Button } from '../button'

describe('Button', () => {
  test('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button', { name: /click me/i }))
    
    expect(handleClick).toHaveBeenCalledOnce()
  })
  
  test('shows loading state', () => {
    render(<Button loading>Submit</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

### Your First Hook Test

Create `src/hooks/__tests__/use-counter.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { useCounter } from '../use-counter'

describe('useCounter', () => {
  test('increments count', () => {
    const { result } = renderHook(() => useCounter(0))
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })
})
```

---

## Test Types

### 1. Component Tests (PRIMARY)

**Purpose**: Test React components as users interact with them.

**When to use**:
- Testing UI components
- User interactions (clicks, typing, form submission)
- Conditional rendering
- Accessibility

**Example**: Testing a form component

```typescript
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { LoginForm } from '../login-form'

describe('LoginForm', () => {
  test('submits form with email and password', async () => {
    const handleSubmit = vi.fn()
    const user = userEvent.setup()
    
    render(<LoginForm onSubmit={handleSubmit} />)
    
    // Type into inputs
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Verify submit was called
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })
  
  test('shows validation errors for invalid email', async () => {
    const user = userEvent.setup()
    
    render(<LoginForm onSubmit={vi.fn()} />)
    
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })
})
```

**Testing with Context/Providers**:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('ComponentWithQuery', () => {
  test('renders data from query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <ComponentWithQuery />
      </QueryClientProvider>
    )
    
    expect(await screen.findByText(/loaded data/i)).toBeInTheDocument()
  })
})
```

---

### 2. Hook Tests (PRIMARY)

**Purpose**: Test custom React hooks in isolation.

**When to use**:
- Custom hooks
- State management logic
- Effect-based behavior
- Hook composition

**Example**: Testing a data fetching hook

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { useTeamMembers } from '../use-team-members'

// Mock the API
vi.mock('@/lib/api', () => ({
  fetchTeamMembers: vi.fn()
}))

import { fetchTeamMembers } from '@/lib/api'

describe('useTeamMembers', () => {
  test('fetches and returns team members', async () => {
    const mockMembers = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ]
    
    vi.mocked(fetchTeamMembers).mockResolvedValue(mockMembers)
    
    const { result } = renderHook(() => useTeamMembers('team-1'))
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    
    expect(result.current.data).toEqual(mockMembers)
  })
  
  test('handles error state', async () => {
    vi.mocked(fetchTeamMembers).mockRejectedValue(new Error('Failed'))
    
    const { result } = renderHook(() => useTeamMembers('team-1'))
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    
    expect(result.current.error.message).toBe('Failed')
  })
})
```

---

### 3. Integration Tests

**Purpose**: Test complete user flows with database and API.

**When to use**:
- Multi-step user flows
- Database operations
- API route testing
- End-to-end feature testing

**Example**: Testing registration flow

```typescript
import { describe, test, expect, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { users } from '@/server/db/schema'
import { registerUser, verifyEmail, createSession } from '../auth-service'
import { eq } from 'drizzle-orm'

describe('Registration Flow', () => {
  const testUserIds: string[] = []
  
  afterEach(async () => {
    // Cleanup
    for (const id of testUserIds) {
      await db.delete(users).where(eq(users.id, id))
    }
    testUserIds.length = 0
  })
  
  test('complete registration flow', async () => {
    // Step 1: Register user
    const user = await registerUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User'
    })
    
    testUserIds.push(user.id)
    
    expect(user.emailVerified).toBe(false)
    
    // Step 2: Verify email
    await verifyEmail(user.id)
    
    const verifiedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    })
    
    expect(verifiedUser?.emailVerified).toBe(true)
    
    // Step 3: Create session
    const session = await createSession(user.id)
    
    expect(session.userId).toBe(user.id)
  })
})
```

---

### 4. Unit Tests

**Purpose**: Test individual utility functions in isolation.

**When to use**:
- Pure functions
- Utility helpers
- Business logic without dependencies

**Example**: Testing password utilities

```typescript
import { describe, test, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('Password Utilities', () => {
  test('hashes password securely', async () => {
    const password = 'MySecurePass123!'
    const hash = await hashPassword(password)
    
    expect(hash).not.toBe(password)
    expect(hash).toMatch(/^\$argon2id\$/)
  })
  
  test('verifies correct password', async () => {
    const password = 'MySecurePass123!'
    const hash = await hashPassword(password)
    
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })
  
  test('rejects incorrect password', async () => {
    const hash = await hashPassword('correct')
    
    const isValid = await verifyPassword('wrong', hash)
    expect(isValid).toBe(false)
  })
})
```

---

### 5. Property-Based Tests (ADVANCED - Optional)

**Purpose**: Test invariants that should hold for ALL inputs (advanced technique).

**When to use** (sparingly):
- Critical security logic (auth, permissions, rate limiting)
- Complex validation with many edge cases
- Cryptographic functions
- Algorithm correctness

**Not recommended for**:
- Schema validation (Zod handles this)
- Simple CRUD operations
- Basic serialization
- Deterministic behavior

**Example**: Testing rate limiting

```typescript
import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { checkRateLimit } from '../rate-limit'

describe('Rate Limiting (Property Tests)', () => {
  test('blocks after N failed attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(), // Generate random IPs
        async (ip) => {
          const limit = 5
          
          // First 5 attempts should succeed
          for (let i = 0; i < limit; i++) {
            const allowed = await checkRateLimit(ip, limit)
            expect(allowed).toBe(true)
          }
          
          // 6th attempt should be blocked
          const blocked = await checkRateLimit(ip, limit)
          expect(blocked).toBe(false)
        }
      ),
      { numRuns: 20 } // Fewer runs for expensive operations
    )
  })
})
```

**Note**: Property-based testing is powerful but adds complexity. Use only when the benefits clearly outweigh the maintenance cost.

---

## Common Patterns

### Testing User Interactions

```typescript
import { userEvent } from '@testing-library/user-event'

test('user can select option from dropdown', async () => {
  const user = userEvent.setup()
  
  render(<Dropdown options={['Option 1', 'Option 2']} />)
  
  await user.click(screen.getByRole('button'))
  await user.click(screen.getByText('Option 1'))
  
  expect(screen.getByText('Option 1')).toBeInTheDocument()
})
```

### Testing Async Behavior

```typescript
test('loads and displays data', async () => {
  render(<DataComponent />)
  
  // Wait for loading to finish
  expect(await screen.findByText('Data loaded')).toBeInTheDocument()
})
```

### Mocking API Calls

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}))

test('uses mocked API', async () => {
  const { fetchData } = await import('@/lib/api')
  
  const result = await fetchData()
  
  expect(result.data).toBe('test')
})
```

### Testing Forms

```typescript
test('validates form inputs', async () => {
  const user = userEvent.setup()
  const handleSubmit = vi.fn()
  
  render(<ContactForm onSubmit={handleSubmit} />)
  
  // Leave required field empty
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  // Should show validation error
  expect(screen.getByText(/required/i)).toBeInTheDocument()
  expect(handleSubmit).not.toHaveBeenCalled()
})
```

### Database Cleanup

```typescript
describe('Team Management', () => {
  const testTeamIds: string[] = []
  
  afterEach(async () => {
    for (const id of testTeamIds) {
      await db.delete(teams).where(eq(teams.id, id))
    }
    testTeamIds.length = 0
  })
  
  test('creates team', async () => {
    const team = await createTeam({ name: 'Test Team' })
    testTeamIds.push(team.id)
    
    expect(team.name).toBe('Test Team')
  })
})
```

---

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ BAD: Testing implementation details
test('calls useState with correct value', () => {
  const setStateSpy = vi.spyOn(React, 'useState')
  // ...
})

// ✅ GOOD: Testing user-visible behavior
test('displays count after clicking increment', async () => {
  const user = userEvent.setup()
  render(<Counter />)
  
  await user.click(screen.getByRole('button', { name: /increment/i }))
  
  expect(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

### 2. Use Accessible Queries

Prefer queries that reflect how users interact:

```typescript
// ✅ Best: By role and accessible name
screen.getByRole('button', { name: /submit/i })

// ✅ Good: By label text
screen.getByLabelText(/email/i)

// ⚠️ Okay: By text content
screen.getByText(/welcome/i)

// ❌ Avoid: By test IDs (last resort only)
screen.getByTestId('submit-button')
```

### 3. Keep Tests Simple and Focused

```typescript
// ❌ BAD: Testing too much in one test
test('entire user flow', async () => {
  // 100 lines of test code...
})

// ✅ GOOD: One behavior per test
test('shows error on invalid email', async () => {
  // ...
})

test('submits form on valid input', async () => {
  // ...
})
```

### 4. Don't Test External Libraries

```typescript
// ❌ BAD: Testing Zod validation
test('zod validates email format', () => {
  const schema = z.string().email()
  // ...
})

// ✅ GOOD: Test your validation logic
test('form shows error for invalid email', async () => {
  // ...
})
```

### 5. When NOT to Test

- Third-party library internals (React, Zod, fetch)
- Framework behavior (Next.js routing)
- Trivial code (getters/setters, simple formatting)
- Generated code (Drizzle types)

### 6. Coverage Guidelines

- **Aim for 60-80%** code coverage
- **Focus on critical paths**: auth, payments, data mutations
- **Don't chase 100%**: diminishing returns
- **UI components**: test user interactions, not rendering details

---

## Troubleshooting

### Common Issues

#### 1. Tests Fail with "Not Wrapped in act()"

**Solution**: Use `await` for async operations

```typescript
// ❌ BAD
user.click(button)

// ✅ GOOD
await user.click(button)
```

#### 2. Can't Find Element After Interaction

**Solution**: Use `findBy` queries for async content

```typescript
// ❌ BAD
expect(screen.getByText('Loaded')).toBeInTheDocument()

// ✅ GOOD
expect(await screen.findByText('Loaded')).toBeInTheDocument()
```

#### 3. Mocks Not Working

**Solution**: Ensure `vi.mock()` is at **top level**, before `describe()`

```typescript
// ✅ At top of file
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn()
}))

describe('Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks() // Clear between tests
  })
})
```

#### 4. Test Database Not Resetting

**Solution**: Use `afterEach` cleanup or rely on global reset in `vitest.setup.ts`

```typescript
afterEach(async () => {
  await cleanup()
})
```

#### 5. Provider/Context Errors in Component Tests

**Solution**: Wrap with required providers

```typescript
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

render(<Component />, { wrapper })
```

### Debugging Tips

```typescript
// 1. Use test.only to run single test
test.only('debug this test', () => { ... })

// 2. Log rendered output
import { screen } from '@testing-library/react'
screen.debug() // Prints DOM

// 3. Use verbose reporter
// bun run test -- --reporter=verbose
```

---

## Reference

### Test Scripts

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Specific file
bun run test path/to/file.test.ts

# E2E tests
bun run test:ui
bun run test:ui:headed
```

### Key Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Test runner configuration |
| `vitest.setup.ts` | Global setup, env vars, test DB |
| `src/lib/testing/test-db.ts` | In-memory database factory |

### Essential Reading

- [React Testing Library Docs](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Questions?** Check the troubleshooting section or review example tests in the codebase.
