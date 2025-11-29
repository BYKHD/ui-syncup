# Testing Quick Start Guide

> Quick reference for running and writing tests in ui-syncup.

## Prerequisites

- Bun installed
- Dependencies installed (`bun install`)
- Project cloned and set up

## Running Tests

```bash
# Run all tests
bun run test

# Run in watch mode (auto-rerun on changes)
bun run test:watch

# Run specific test file
bun run test password.test.ts

# Run tests matching a pattern
bun run test auth

# Run E2E tests
bun run test:ui

# Run E2E with visible browser
bun run test:ui:headed
```

## Writing Your First Test

### 1. Create Test File

Create `src/features/utils/__tests__/example.test.ts`:

```typescript
import { describe, test, expect } from 'vitest'

describe('Example Utils', () => {
  test('should add two numbers', () => {
    const result = 1 + 1
    expect(result).toBe(2)
  })
})
```

### 2. Run It

```bash
bun run test example.test.ts
```

## Common Test Patterns

### Unit Test

```typescript
import { describe, test, expect } from 'vitest'
import { myFunction } from '../my-function'

describe('myFunction', () => {
  test('should return expected value', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Property-Based Test

```typescript
import fc from 'fast-check'

test('Property: always returns positive number', () => {
  fc.assert(
    fc.property(
      fc.integer(),  // Generate random integers
      (num) => {
        const result = Math.abs(num)
        expect(result).toBeGreaterThanOrEqual(0)
      }
    )
  )
})
```

### Integration Test with Database

```typescript
import { db } from '@/lib/db'
import { users } from '@/server/db/schema'

describe('User Management', () => {
  const testUserIds: string[] = []

  afterEach(async () => {
    // Cleanup
    for (const id of testUserIds) {
      await db.delete(users).where(eq(users.id, id))
    }
    testUserIds.length = 0
  })

  test('should create user', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'test@example.com' })
      .returning()

    testUserIds.push(user.id)
    expect(user.email).toBe('test@example.com')
  })
})
```

### React Component Test

```typescript
import { render } from '@testing-library/react'
import { MyComponent } from '../my-component'

test('should render text', () => {
  const { getByText } = render(<MyComponent />)
  expect(getByText('Hello')).toBeInTheDocument()
})
```

### React Hook Test

```typescript
import { renderHook } from '@testing-library/react'
import { useMyHook } from '../use-my-hook'

test('should return value', () => {
  const { result } = renderHook(() => useMyHook())
  expect(result.current.value).toBe('expected')
})
```

## Test File Organization

```
src/
  features/
    auth/
      __tests__/           # Test directory
        login.test.ts      # Unit/integration test
        login.property.test.ts  # Property-based test
      login.ts             # Implementation
```

## Common Issues & Solutions

### Issue: Environment variable not found

**Solution:** Check `vitest.setup.ts` or set in test:
```typescript
beforeEach(() => {
  process.env.MY_VAR = 'test-value'
})
```

### Issue: Mock not working

**Solution:** Put `vi.mock()` at top level:
```typescript
vi.mock('@/lib/service', () => ({
  myService: vi.fn()
}))

describe('Tests', () => { ... })
```

### Issue: Database not resetting

**Solution:** Check `vitest.setup.ts` has reset hooks. The database resets automatically between tests.

### Issue: Property test timing out

**Solution:** Reduce iterations:
```typescript
fc.assert(property, { numRuns: 20, timeout: 30000 })
```

### Issue: React component test failing

**Solution:** Wrap with providers:
```typescript
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

render(<Component />, { wrapper })
```

## Test Types Overview

| Type | When to Use | Example |
|------|-------------|---------|
| **Unit** | Test single function | Password hashing |
| **Property** | Test invariants | Rate limiting, validation |
| **Integration** | Test complete flows | Sign up → verify → login |
| **Component** | Test React components | UI components, hooks |
| **E2E** | Test full user flows | Complete registration flow |

## Key Tools

- **Vitest** - Test runner
- **fast-check** - Property-based testing
- **@testing-library/react** - Component testing
- **pg-mem** - In-memory test database
- **Playwright** - E2E browser testing

## Configuration Files

- `vitest.config.ts` - Test runner config
- `vitest.setup.ts` - Global setup, test DB
- `src/lib/testing/test-db.ts` - Database factory

## Useful Commands

```bash
# Watch mode - reruns on file changes
bun run test:watch

# Run only one test (add .only)
test.only('my test', () => { ... })

# Skip a test (add .skip)
test.skip('skip this', () => { ... })

# Debug with console.log
test('debug', () => {
  console.log('Value:', value)
  expect(value).toBe(expected)
})
```

## Test Matchers

```typescript
// Equality
expect(value).toBe(expected)
expect(value).toEqual(expected)  // Deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeDefined()
expect(value).toBeNull()

// Numbers
expect(value).toBeGreaterThan(5)
expect(value).toBeLessThan(10)
expect(value).toBeCloseTo(3.14, 2)

// Strings
expect(value).toMatch(/pattern/)
expect(value).toContain('substring')

// Arrays
expect(array).toHaveLength(3)
expect(array).toContain(item)

// Objects
expect(obj).toHaveProperty('key')
expect(obj).toMatchObject({ key: 'value' })

// Async
await expect(promise).resolves.toBe('result')
await expect(promise).rejects.toThrow('error')

// DOM (React)
expect(element).toBeInTheDocument()
expect(element).toHaveTextContent('text')
```

## Quick Tips

1. **Always clean up test data** in `afterEach()`
2. **Use property tests** for complex logic
3. **Mock expensive operations** (API calls, hashing)
4. **Keep tests fast** (<1s per test ideally)
5. **Use descriptive test names**
6. **Test edge cases** (empty, null, very large)
7. **Each test should be independent**

## Next Steps

- Read the [full Testing Guide](./TESTING.md) for detailed information
- Check [E2E Testing Guide](../tests/e2e/README.md) for browser tests
- Explore example tests in `src/**/__tests__/`
- Write your first test!

## Getting Help

- Check [Troubleshooting section](./TESTING.md#troubleshooting) in main guide
- Look at existing tests for examples
- Ask the team

---

**Ready to write tests?** Start with a simple unit test and work your way up to more complex patterns!
