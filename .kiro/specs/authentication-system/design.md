# Design Document

## Overview

The authentication system provides secure, production-ready user identity management for UI SyncUp. Built on better-auth with PostgreSQL and Drizzle ORM, it handles user registration, email verification, sign-in/sign-out, password recovery, and session management. The system integrates seamlessly with the existing RBAC and plan-based billing model, ensuring users receive appropriate roles and billable seats are tracked accurately.

The architecture follows a layered approach:
- **Transport layer**: API routes in `app/api/auth/*` handle HTTP requests/responses
- **Service layer**: Server-side logic in `server/auth/*` manages sessions, tokens, and RBAC
- **Data layer**: Database schema in `server/db/schema/` with Drizzle ORM
- **Client layer**: React hooks in `features/auth/hooks/` provide typed access to auth state

Security is paramount: passwords are hashed with Argon2, sessions use HTTP-only cookies, all inputs are validated with Zod, rate limiting prevents abuse, and sensitive operations require re-authentication.

## Architecture

### System Components

The system consists of four main layers:

1. **Client Layer** (`features/auth/`)
   - React components for sign-in, sign-up, password reset forms
   - React Query hooks for auth state management
   - Client-side validation with Zod schemas

2. **API Layer** (`app/api/auth/`)
   - Route handlers for authentication endpoints
   - Input validation and rate limiting
   - HTTP response formatting

3. **Service Layer** (`server/auth/`)
   - Session management (create, validate, extend, delete)
   - Token generation and verification
   - Cookie management (HTTP-only, Secure, SameSite)
   - RBAC integration and permission checks

4. **Data Layer** (`server/db/`)
   - PostgreSQL database with Drizzle ORM
   - Tables: users, sessions, verification_tokens, user_roles
   - Indexes for efficient lookups

### Data Flow Examples

**Registration Flow:**
1. User submits email, password, name via `SignUpForm`
2. `POST /api/auth/signup` validates with Zod, hashes password with Argon2
3. Creates user record with `emailVerified: false`
4. Generates signed verification token
5. Enqueues email job (idempotent by user_id + token_id)
6. Returns success immediately (email sent asynchronously)
7. Background worker processes email queue with retry logic (3 attempts, exponential backoff)
8. On email failure after retries, logs error and alerts monitoring system

**Email Verification Flow:**
1. User clicks link with token: `/api/auth/verify-email?token=...`
2. Server verifies signature, checks expiration
3. Marks user as verified, invalidates token
4. Redirects to sign-in page

**Password Reset Flow:**
1. User requests reset: `POST /api/auth/forgot-password` with email
2. Generates time-limited token (1 hour)
3. Enqueues email job (idempotent by user_id + token_id)
4. Returns success immediately (email sent asynchronously)
5. Background worker processes email queue with retry logic (3 attempts, exponential backoff)
6. On email failure after retries, logs error and alerts monitoring system
7. User clicks link: `/api/auth/reset-password?token=...`
8. Submits new password
9. Server verifies token, updates password hash
10. Invalidates all existing sessions
11. Redirects to sign-in

**Sign-In Flow:**
1. User submits credentials via `SignInForm`
2. `POST /api/auth/login` validates input, checks rate limits
3. Verifies email is verified, compares password hash
4. Creates session record, issues HTTP-only cookie
5. Returns user data, client caches in React Query

**Session Validation Flow:**
1. Protected route renders, `app/(protected)/layout.tsx` calls `getSession()`
2. Reads cookie, validates signature and expiration
3. Queries database for session record
4. If valid, extends expiration (rolling renewal)
5. If invalid, redirects to sign-in

**Sign-Out Flow:**
1. User clicks sign-out
2. `POST /api/auth/logout` deletes session from database
3. Clears session cookie
4. Client invalidates React Query cache
5. Redirects to sign-in page

### Email Service Architecture

**Queue-Based Email Delivery:**

The system uses a job queue for reliable, asynchronous email delivery:

```typescript
// server/email/queue.ts
export interface EmailJob {
  id: string;
  userId: string;
  tokenId?: string;
  type: 'verification' | 'password_reset' | 'welcome' | 'security_alert';
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledFor: string;
}
```

**Idempotency:**
- Email jobs are keyed by `userId + tokenId` (or `userId + type` for non-token emails)
- Duplicate job submissions are ignored (no-op)
- Database constraint ensures one active job per key

**Retry Logic:**
- Initial attempt: immediate
- Retry 1: 30 seconds delay
- Retry 2: 5 minutes delay
- Retry 3: 30 minutes delay
- After 3 failures: mark as failed, log error, alert monitoring

**Failure Handling:**
```typescript
// server/email/worker.ts
async function processEmailJob(job: EmailJob) {
  try {
    await sendEmail(job);
    await markJobComplete(job.id);
  } catch (error) {
    if (job.attempts < job.maxAttempts) {
      const delay = calculateBackoff(job.attempts);
      await scheduleRetry(job.id, delay);
    } else {
      await markJobFailed(job.id, error);
      await logEmailFailure(job, error);
      await alertMonitoring('email_delivery_failed', { jobId: job.id, userId: job.userId });
    }
  }
}
```

**Email Provider Integration:**
- Primary: Resend (API key from `RESEND_API_KEY` environment variable)
- Fallback: Secondary provider (optional)
- Rate limiting: Respect Resend's rate limits (100 emails/second on paid plans)
- Monitoring: Track delivery rates, bounce rates, complaint rates via Resend webhooks

### Observability and Logging

**Structured Log Schema:**

All authentication events follow a consistent schema:

```typescript
interface AuthLogEvent {
  // Event identification
  eventId: string;           // Unique event ID (UUID)
  eventType: string;         // 'auth.signup' | 'auth.login' | 'auth.logout' | etc.
  timestamp: string;         // ISO 8601 timestamp
  
  // User context
  userId?: string;           // User ID (if authenticated)
  email?: string;            // Email (hashed for PII protection)
  
  // Request context
  ipAddress: string;         // Client IP address
  userAgent: string;         // Client user agent
  requestId: string;         // Request correlation ID
  
  // Outcome
  outcome: 'success' | 'failure' | 'error';
  errorCode?: string;        // Error code if failed
  errorMessage?: string;     // Error message if failed
  
  // Additional context
  metadata?: Record<string, unknown>;
}
```

**Event Types:**

```typescript
// Authentication events
'auth.signup.attempt'          // User attempts registration
'auth.signup.success'          // Registration successful
'auth.signup.failure'          // Registration failed (validation, duplicate)

'auth.login.attempt'           // User attempts sign-in
'auth.login.success'           // Sign-in successful
'auth.login.failure'           // Sign-in failed (invalid credentials, unverified)

'auth.logout.success'          // Sign-out successful

'auth.verify_email.attempt'    // Email verification attempted
'auth.verify_email.success'    // Email verified
'auth.verify_email.failure'    // Verification failed (expired, invalid)

'auth.reset_password.request'  // Password reset requested
'auth.reset_password.success'  // Password reset successful
'auth.reset_password.failure'  // Password reset failed

// Security events
'auth.rate_limit.exceeded'     // Rate limit exceeded
'auth.token.tampered'          // Token signature invalid
'auth.session.tampered'        // Session cookie tampered
'auth.reauth.required'         // Re-authentication required
'auth.reauth.failure'          // Re-authentication failed

// Email events
'email.queued'                 // Email job queued
'email.sent'                   // Email sent successfully
'email.failed'                 // Email delivery failed
'email.retry'                  // Email retry scheduled
```

**Monitoring Rules:**

```typescript
// Alert on high authentication failure rate
if (count('auth.login.failure', last_5_minutes) > 100) {
  alert('high_auth_failure_rate', {
    severity: 'warning',
    count: count,
    threshold: 100,
  });
}

// Alert on rate limit abuse
if (count('auth.rate_limit.exceeded', last_5_minutes) > 50) {
  alert('rate_limit_abuse', {
    severity: 'warning',
    count: count,
    threshold: 50,
  });
}

// Alert on email delivery failures
if (count('email.failed', last_15_minutes) > 10) {
  alert('email_delivery_issues', {
    severity: 'critical',
    count: count,
    threshold: 10,
  });
}

// Alert on token tampering
if (count('auth.token.tampered', last_5_minutes) > 5) {
  alert('potential_attack', {
    severity: 'critical',
    count: count,
    threshold: 5,
  });
}
```

**Log Correlation:**

All logs include a `requestId` for tracing a single request across services:

```typescript
// Middleware sets requestId
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || generateUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

// All logs include requestId
logger.info('auth.login.attempt', {
  requestId: req.requestId,
  userId: user.id,
  ipAddress: req.ip,
  // ...
});
```

**Metrics to Track:**

```typescript
// Counters
'auth.signup.total'            // Total signups
'auth.login.total'             // Total sign-ins
'auth.login.success'           // Successful sign-ins
'auth.login.failure'           // Failed sign-ins
'auth.rate_limit.exceeded'     // Rate limit hits
'email.sent'                   // Emails sent
'email.failed'                 // Email failures

// Gauges
'auth.sessions.active'         // Active sessions count
'auth.users.total'             // Total users
'auth.users.verified'          // Verified users
'email.queue.size'             // Email queue size

// Histograms
'auth.login.duration'          // Sign-in duration
'auth.session.validation.duration'  // Session validation duration
'email.delivery.duration'      // Email delivery duration
```

## Components and Interfaces

### Database Schema

**users table:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**sessions table:**
```typescript
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});
```

**verification_tokens table:**
```typescript
export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(), // 'email_verification' | 'password_reset'
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**user_roles table:**
```typescript
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### API Endpoints

**POST /api/auth/signup**
- Request: `{ email, password, name }`
- Response: `{ message: "Account created. Please check your email." }`
- Errors: 400 (validation), 409 (duplicate email), 429 (rate limit)

**POST /api/auth/login**
- Request: `{ email, password }`
- Response: `{ user: { id, email, name, emailVerified } }`
- Errors: 400 (validation), 401 (invalid credentials), 403 (unverified), 429 (rate limit)

**POST /api/auth/logout**
- Request: none (uses cookie)
- Response: `{ message: "Signed out successfully" }`

**GET /api/auth/me**
- Request: none (uses cookie)
- Response: `{ user: { id, email, name, emailVerified, roles } }`
- Errors: 401 (not authenticated)

**GET /api/auth/verify-email?token=...**
- Redirects to /sign-in with success message
- Errors: 400 (invalid token), 410 (already used)

**POST /api/auth/forgot-password**
- Request: `{ email }`
- Response: `{ message: "If an account exists, a reset link has been sent." }`

**POST /api/auth/reset-password**
- Request: `{ token, password }`
- Response: `{ message: "Password reset successfully." }`
- Errors: 400 (invalid token), 410 (already used)

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

### Session
```typescript
interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}
```

### VerificationToken
```typescript
interface VerificationToken {
  id: string;
  userId: string;
  token: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}
```

### UserRole
```typescript
interface UserRole {
  id: string;
  userId: string;
  role: string;
  resourceType: 'team' | 'project';
  resourceId: string;
  createdAt: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Valid registration creates user with hashed password
*For any* valid registration data (email, password, name), creating a user account should result in a user record with a hashed password that can be verified against the original password.
**Validates: Requirements 1.1**

### Property 2: Password validation enforces security requirements
*For any* password string, validation should reject passwords that don't meet requirements (8+ chars, uppercase, lowercase, number, special char) and accept passwords that do.
**Validates: Requirements 1.3**

### Property 3: Registration creates verification token
*For any* newly created user account, a verification token should be generated with a valid expiration timestamp.
**Validates: Requirements 1.4**

### Property 4: Validation errors are field-specific
*For any* registration data with invalid fields, the error response should contain specific error messages for each invalid field.
**Validates: Requirements 1.5**

### Property 5: Valid verification marks user as verified
*For any* user with a valid verification token, using the token should mark the user's emailVerified field as true.
**Validates: Requirements 2.1**

### Property 6: New verification token invalidates previous tokens
*For any* user with an existing verification token, requesting a new token should invalidate the previous token.
**Validates: Requirements 2.4**

### Property 7: Valid credentials create session
*For any* verified user with correct credentials, signing in should create a session record with a valid expiration timestamp.
**Validates: Requirements 3.1, 3.4**

### Property 8: Rate limiting blocks excessive sign-in attempts
*For any* IP address or email, exceeding the rate limit (5 per IP per minute, 3 per email per 15 minutes) should result in 429 responses.
**Validates: Requirements 3.5**

### Property 9: Valid session grants access
*For any* authenticated user with a valid session cookie, requests to protected resources should be allowed.
**Validates: Requirements 4.1**

### Property 10: Session validation performs all security checks
*For any* session cookie, validation should verify signature, expiration, and database existence.
**Validates: Requirements 4.4**

### Property 11: Rolling renewal extends session expiration
*For any* valid session accessed within its lifetime, the expiration timestamp should be extended.
**Validates: Requirements 4.3**

### Property 12: Sign-out invalidates session
*For any* authenticated user, signing out should delete the session from the database and clear the cookie.
**Validates: Requirements 5.1**

### Property 13: Sign-out preserves other sessions
*For any* user with multiple active sessions, signing out from one session should not affect the other sessions.
**Validates: Requirements 5.5**

### Property 14: Sign-out logs event
*For any* sign-out action, a log entry should be created with user ID and timestamp.
**Validates: Requirements 5.4**

### Property 15: Protected routes reject signed-out users
*For any* user who has signed out, attempts to access protected routes should be rejected.
**Validates: Requirements 5.3**

### Property 16: Password reset creates time-limited token
*For any* password reset request, a token should be created with an expiration of 1 hour.
**Validates: Requirements 6.1**

### Property 17: Password reset invalidates all sessions
*For any* user who resets their password, all existing sessions should be invalidated.
**Validates: Requirements 6.2**

### Property 18: Verified users receive default roles
*For any* newly verified user, default roles from the RBAC configuration should be assigned.
**Validates: Requirements 7.1**

### Property 19: Team membership assigns appropriate roles
*For any* user who creates or joins a team, TEAM_* roles should be assigned based on membership type.
**Validates: Requirements 7.2**

### Property 20: Editor roles mark billable seats
*For any* user assigned PROJECT_OWNER or PROJECT_EDITOR role, they should be marked as a billable TEAM_EDITOR seat.
**Validates: Requirements 7.3**

### Property 21: Role changes update billable seat counts
*For any* user whose role changes, billable seat counts should be recalculated according to plan limits.
**Validates: Requirements 7.4**

### Property 22: Role assignments are validated and logged
*For any* role assignment, permissions should be validated against the roles configuration and the assignment should be logged.
**Validates: Requirements 7.5**

### Property 23: Passwords are hashed securely
*For any* stored password, it should be hashed (not plaintext) and verifiable against the original password.
**Validates: Requirements 8.1**

### Property 24: Session cookies have security attributes
*For any* issued session cookie, it should have HTTP-only, Secure, and SameSite=Lax attributes set.
**Validates: Requirements 8.2**

### Property 25: Auth endpoints validate input with Zod
*For any* authentication endpoint request with invalid data, the response should contain Zod validation errors.
**Validates: Requirements 8.3**

### Property 26: Auth events are logged with required fields
*For any* authentication event (sign-in, sign-up, password reset), a log entry should be created with timestamp, user ID, IP address, and outcome.
**Validates: Requirements 8.4**

### Property 27: Session IDs are cryptographically random
*For any* set of created sessions, session IDs should be unique and unpredictable.
**Validates: Requirements 8.5**

### Property 28: Failed re-authentication blocks sensitive operations
*For any* sensitive operation with failed re-authentication, the operation should be blocked and logged.
**Validates: Requirements 9.5**

### Property 29: Auth state changes invalidate cache
*For any* sign-in or sign-out action, cached session data should be invalidated and re-fetched.
**Validates: Requirements 10.2**

### Property 30: API functions return typed user objects
*For any* auth API function call, the returned user object should match the expected type schema.
**Validates: Requirements 10.3**

### Property 31: Permission hooks return correct boolean results
*For any* permission check, the hook should return a boolean based on RBAC rules.
**Validates: Requirements 10.4**

### Property 32: API responses match Zod schemas
*For any* authentication API response, it should validate against the defined Zod schema.
**Validates: Requirements 10.5**

### Property 33: IP-based rate limiting enforces limits
*For any* IP address making sign-in requests, exceeding 5 attempts per minute should result in rate limiting.
**Validates: Requirements 11.1**

### Property 34: Email-based rate limiting enforces limits
*For any* email with sign-in requests, exceeding 3 attempts per 15 minutes should result in rate limiting.
**Validates: Requirements 11.2**

### Property 35: Password reset rate limiting enforces limits
*For any* email with reset requests, exceeding 3 requests per hour should result in rate limiting.
**Validates: Requirements 11.3**

### Property 36: Rate limit responses include retry-after header
*For any* rate-limited request, the response should have status 429 and include a retry-after header.
**Validates: Requirements 11.4**

### Property 37: Rate limit violations are logged
*For any* rate limit violation, a log entry should be created with IP address, email (if provided), and timestamp.
**Validates: Requirements 11.5**

### Property 38: Server-side layout validates sessions
*For any* protected route render, session validation should occur on the server before rendering content.
**Validates: Requirements 12.4**

## Error Handling

### Error Categories

**Validation Errors (400)**
- Invalid email format
- Password too short or doesn't meet complexity requirements
- Missing required fields
- Malformed request body

**Authentication Errors (401)**
- Invalid credentials
- Session expired or invalid
- Missing authentication cookie

**Authorization Errors (403)**
- Email not verified
- Insufficient permissions for operation

**Conflict Errors (409)**
- Email already registered
- Duplicate session

**Gone Errors (410)**
- Verification token already used
- Password reset token already used

**Rate Limit Errors (429)**
- Too many sign-in attempts
- Too many password reset requests

**Server Errors (500)**
- Database connection failure
- Email service unavailable
- Unexpected errors

### Error Response Format

All errors follow a consistent JSON structure:

```typescript
{
  error: {
    code: string;        // Machine-readable error code
    message: string;     // Human-readable error message
    field?: string;      // Field name for validation errors
    details?: unknown;   // Additional error context
  }
}
```

### Postgres Error Mapping

- `23505` (unique_violation) → 409 Conflict: "Email already registered"
- `23503` (foreign_key_violation) → 422 Unprocessable: "Invalid reference"
- `23514` (check_violation) → 422 Unprocessable: "Constraint violation"
- Connection errors → 500 Internal Server Error
- Timeout errors → 504 Gateway Timeout

### Security Considerations

- Never reveal whether an email exists in the system (password reset, registration)
- Use generic error messages for authentication failures
- Log all security-relevant errors with context
- Rate limit error responses to prevent information leakage

## Testing Strategy

### Unit Testing

**Validation Logic:**
- Test Zod schemas with valid and invalid inputs
- Test password strength validation
- Test email format validation
- Test token expiration logic

**Utility Functions:**
- Test password hashing and verification
- Test token generation and signing
- Test cookie serialization/deserialization
- Test rate limit calculations

**RBAC Logic:**
- Test role assignment rules
- Test permission checking
- Test billable seat calculations

### Property-Based Testing

The system will use **fast-check** for property-based testing in TypeScript/JavaScript. Each correctness property will be implemented as a property-based test that runs 100+ iterations with randomly generated inputs.

**Test Configuration:**
```typescript
import fc from 'fast-check';

// Configure property tests to run 100 iterations minimum
const propertyConfig = { numRuns: 100 };
```

**Generator Examples:**

```typescript
// Generate valid emails
const emailArb = fc.emailAddress();

// Generate valid passwords (8+ chars, mixed case, number, special)
const passwordArb = fc.string({ minLength: 8 })
  .filter(s => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s));

// Generate user registration data
const registrationArb = fc.record({
  email: emailArb,
  password: passwordArb,
  name: fc.string({ minLength: 1, maxLength: 120 }),
});

// Generate UUIDs
const uuidArb = fc.uuid();

// Generate timestamps
const timestampArb = fc.date().map(d => d.toISOString());
```

**Property Test Structure:**

Each property test should:
1. Generate random valid inputs
2. Execute the operation
3. Assert the property holds
4. Clean up test data

Example:
```typescript
test('Property 1: Valid registration creates user with hashed password', () => {
  fc.assert(
    fc.asyncProperty(registrationArb, async (data) => {
      // Create user
      const user = await createUser(data);
      
      // Verify password is hashed (not plaintext)
      expect(user.passwordHash).not.toBe(data.password);
      expect(user.passwordHash.length).toBeGreaterThan(0);
      
      // Verify password can be verified
      const isValid = await verifyPassword(data.password, user.passwordHash);
      expect(isValid).toBe(true);
      
      // Cleanup
      await deleteUser(user.id);
    }),
    propertyConfig
  );
});
```

### Integration Testing

**API Endpoint Tests:**
- Test complete registration flow
- Test sign-in with valid/invalid credentials
- Test email verification flow
- Test password reset flow
- Test session management
- Test rate limiting behavior

**Database Tests:**
- Test user creation and retrieval
- Test session CRUD operations
- Test token generation and validation
- Test role assignment
- Test concurrent session handling

**RBAC Integration:**
- Test role assignment on user verification
- Test billable seat tracking
- Test permission checks

### End-to-End Testing (Playwright)

**Critical User Flows:**
1. New user registration → email verification → sign-in → dashboard
2. Existing user sign-in → access protected route → sign-out
3. Password reset → sign-in with new password
4. Multiple device sessions → sign-out from one device
5. Rate limiting → wait → successful sign-in

**Test Scenarios:**
- Happy path: Complete registration and sign-in
- Error path: Invalid credentials, unverified email
- Security: Tampered cookies, expired tokens
- Concurrency: Multiple simultaneous sign-ins

### Test Data Management

**Fixtures:**
- Create reusable test users with known credentials
- Generate test sessions with various expiration states
- Create test tokens (valid, expired, used)

**Cleanup:**
- Delete test data after each test
- Use transactions for database tests
- Reset rate limit counters between tests

### Mocking External Dependencies

**Email Service Mocking:**

For unit and integration tests, mock the email service to avoid sending real emails:

```typescript
// tests/mocks/email.mock.ts
export class MockEmailService {
  private sentEmails: EmailJob[] = [];
  private shouldFail = false;
  
  async sendEmail(job: EmailJob): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Email delivery failed');
    }
    this.sentEmails.push(job);
  }
  
  getSentEmails(): EmailJob[] {
    return this.sentEmails;
  }
  
  getLastEmail(): EmailJob | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }
  
  simulateFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
  
  reset(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}

// Usage in tests
beforeEach(() => {
  mockEmailService.reset();
});

test('registration sends verification email', async () => {
  await registerUser({ email: 'test@example.com', password: 'Test123!', name: 'Test' });
  
  const email = mockEmailService.getLastEmail();
  expect(email).toBeDefined();
  expect(email.type).toBe('verification');
  expect(email.to).toBe('test@example.com');
});

test('email retry logic on failure', async () => {
  mockEmailService.simulateFailure(true);
  
  await registerUser({ email: 'test@example.com', password: 'Test123!', name: 'Test' });
  
  // Verify job is queued for retry
  const job = await getEmailJob(userId);
  expect(job.attempts).toBe(1);
  expect(job.scheduledFor).toBeGreaterThan(Date.now());
});
```

**Email Queue Mocking:**

For testing the queue behavior without a real queue system:

```typescript
// tests/mocks/queue.mock.ts
export class MockEmailQueue {
  private jobs: Map<string, EmailJob> = new Map();
  private processedJobs: EmailJob[] = [];
  
  async enqueue(job: EmailJob): Promise<void> {
    const key = `${job.userId}-${job.tokenId || job.type}`;
    
    // Idempotency: ignore duplicate jobs
    if (this.jobs.has(key)) {
      return;
    }
    
    this.jobs.set(key, job);
  }
  
  async process(): Promise<void> {
    for (const [key, job] of this.jobs.entries()) {
      this.processedJobs.push(job);
      this.jobs.delete(key);
    }
  }
  
  getQueueSize(): number {
    return this.jobs.size;
  }
  
  getProcessedJobs(): EmailJob[] {
    return this.processedJobs;
  }
  
  reset(): void {
    this.jobs.clear();
    this.processedJobs = [];
  }
}

// Usage in tests
test('email queue is idempotent', async () => {
  const job = createEmailJob({ userId: 'user1', tokenId: 'token1' });
  
  await mockQueue.enqueue(job);
  await mockQueue.enqueue(job); // Duplicate
  
  expect(mockQueue.getQueueSize()).toBe(1);
});
```

**Redis Rate Limiter Mocking:**

For testing rate limiting without a real Redis instance:

```typescript
// tests/mocks/rate-limiter.mock.ts
export class MockRateLimiter {
  private counters: Map<string, { count: number; resetAt: number }> = new Map();
  
  async checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const counter = this.counters.get(key);
    
    if (!counter || counter.resetAt < now) {
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    
    if (counter.count >= limit) {
      return false;
    }
    
    counter.count++;
    return true;
  }
  
  async getRemainingAttempts(key: string, limit: number): Promise<number> {
    const counter = this.counters.get(key);
    if (!counter || counter.resetAt < Date.now()) {
      return limit;
    }
    return Math.max(0, limit - counter.count);
  }
  
  async reset(key: string): void {
    this.counters.delete(key);
  }
  
  resetAll(): void {
    this.counters.clear();
  }
}

// Usage in tests
beforeEach(() => {
  mockRateLimiter.resetAll();
});

test('rate limiting blocks after limit exceeded', async () => {
  const key = 'ip:192.168.1.1';
  
  // Make 5 requests (limit)
  for (let i = 0; i < 5; i++) {
    const allowed = await mockRateLimiter.checkLimit(key, 5, 60000);
    expect(allowed).toBe(true);
  }
  
  // 6th request should be blocked
  const allowed = await mockRateLimiter.checkLimit(key, 5, 60000);
  expect(allowed).toBe(false);
});

test('rate limit resets after window expires', async () => {
  const key = 'ip:192.168.1.1';
  
  // Exhaust limit
  for (let i = 0; i < 5; i++) {
    await mockRateLimiter.checkLimit(key, 5, 100); // 100ms window
  }
  
  // Wait for window to expire
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Should be allowed again
  const allowed = await mockRateLimiter.checkLimit(key, 5, 100);
  expect(allowed).toBe(true);
});
```

**In-Memory Redis for Integration Tests:**

For integration tests that need Redis-like behavior:

```typescript
// tests/setup.ts
import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient>;

beforeAll(async () => {
  // Use redis-mock or ioredis-mock for in-memory Redis
  redisClient = createClient({
    socket: {
      host: 'localhost',
      port: 6379,
    },
  });
  
  await redisClient.connect();
});

afterAll(async () => {
  await redisClient.quit();
});

afterEach(async () => {
  // Clear all keys between tests
  await redisClient.flushAll();
});
```

**Test Configuration:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.mock.ts',
      ],
    },
  },
});
```

### Coverage Goals

- **Unit tests**: 90%+ coverage for service layer
- **Property tests**: All 38 correctness properties implemented
- **Integration tests**: All API endpoints covered
- **E2E tests**: All critical user flows covered

### CI/CD Integration

Tests run in this order:
1. Type checking (`tsc --noEmit`)
2. Linting (`eslint`)
3. Unit tests (`vitest`)
4. Property-based tests (`vitest` with fast-check)
5. Integration tests (with test database)
6. E2E tests (`playwright`)

All tests must pass before merging to main branch.

## Security Considerations

### Password Security

- **Hashing**: Use Argon2id with appropriate memory and iteration parameters
- **Minimum requirements**: 8 characters, mixed case, number, special character
- **Storage**: Never log or expose password hashes
- **Comparison**: Use constant-time comparison to prevent timing attacks

### Session Security

- **Cookie attributes**: HTTP-only, Secure (HTTPS only), SameSite=Lax
- **Token generation**: Cryptographically random session IDs (32+ bytes)
- **Expiration**: Short-lived sessions (7 days) with rolling renewal
- **Rotation**: Issue new session ID after authentication events
- **Invalidation**: Delete sessions on sign-out and password change

### Token Security

- **Signing**: Use HMAC-SHA256 with secret key
- **Expiration**: Email verification (24 hours), password reset (1 hour)
- **One-time use**: Mark tokens as used after consumption
- **Invalidation**: Invalidate all tokens on password change

### Rate Limiting

- **Sign-in**: 5 attempts per IP per minute, 3 per email per 15 minutes
- **Password reset**: 3 requests per email per hour
- **Registration**: 10 registrations per IP per hour
- **Storage**: Use in-memory store (Redis) for rate limit counters
- **Response**: Return 429 with Retry-After header

### Input Validation

- **Zod schemas**: Validate all inputs at API boundaries
- **Sanitization**: Trim whitespace, normalize email case
- **Length limits**: Enforce maximum lengths for all string fields
- **Type coercion**: Use Zod coercion for numbers and dates

### CSRF Protection

- **SameSite cookies**: Use SameSite=Lax to prevent CSRF
- **State parameter**: Use state parameter for OAuth flows
- **Origin checking**: Verify Origin/Referer headers for state-changing requests

### SQL Injection Prevention

- **Parameterized queries**: Drizzle ORM uses parameterized queries by default
- **No raw SQL**: Avoid raw SQL queries where possible
- **Input validation**: Validate all inputs before database operations

### Logging and Monitoring

- **Security events**: Log all authentication events (success and failure)
- **PII protection**: Never log passwords, tokens, or session IDs
- **Structured logging**: Use structured format for easy parsing
- **Alerting**: Alert on suspicious patterns (brute force, token tampering)

### Compliance

- **GDPR**: Provide user data export and deletion
- **Password storage**: Follow OWASP password storage guidelines
- **Session management**: Follow OWASP session management guidelines
- **Audit trail**: Maintain audit log of authentication events

## Performance Considerations

### Database Optimization

**Indexes:**
- `users.email` (unique index for fast lookups)
- `sessions.token` (unique index for session validation)
- `sessions.user_id` (index for user session queries)
- `verification_tokens.token` (unique index for token validation)
- `user_roles(user_id, resource_type, resource_id)` (composite index)

**Connection Pooling:**
- Pool size: 10-20 connections for typical load
- Use PgBouncer in transaction mode for serverless environments
- Set connection timeout: 3 seconds
- Set statement timeout: 5 seconds

**Query Optimization:**
- Use `SELECT` with specific columns instead of `SELECT *`
- Batch role assignments in transactions
- Use `RETURNING` clause to avoid extra queries

### Caching Strategy

**Client-Side (React Query):**
- Cache session data for 5 minutes
- Invalidate on sign-in/sign-out
- Background refetch on window focus
- Retry failed requests with exponential backoff

**Server-Side (Redis):**
- Cache rate limit counters (TTL matches limit window)
- Cache user roles (TTL 5 minutes, invalidate on role change)
- Cache session validation results (TTL 1 minute)

### Response Times

**Target SLAs:**
- Sign-in: < 500ms (p95)
- Session validation: < 100ms (p95)
- Registration: < 1s (p95)
- Password reset: < 500ms (p95)

**Optimization Techniques:**
- Use database indexes for fast lookups
- Minimize database round trips
- Use connection pooling
- Cache frequently accessed data
- Use async/await efficiently

### Scalability

**Horizontal Scaling:**
- Stateless API servers (session state in database)
- Load balancer with sticky sessions (optional)
- Shared Redis for rate limiting
- Database read replicas for session validation

**Vertical Scaling:**
- Increase database connection pool size
- Add more CPU/memory to API servers
- Use faster storage for database

## Deployment Considerations

### Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secret key for token signing (32+ characters)
- `BETTER_AUTH_URL`: Base URL for the application
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email service credentials

### Database Migrations

**Migration Strategy:**
- Generate migrations with `drizzle-kit generate`
- Apply migrations before deployment
- Test migrations on staging environment
- Keep rollback plan for each migration

**Initial Migrations:**
1. Create `users` table
2. Create `sessions` table
3. Create `verification_tokens` table
4. Create `user_roles` table
5. Create indexes

### Email Service

**Provider:**
- Resend (https://resend.com)
- API key configured via `RESEND_API_KEY` environment variable
- Official SDK: `resend` npm package

**Email Templates:**
- Email verification
- Password reset
- Welcome email
- Security alerts

**Resend Configuration:**
```typescript
// server/email/client.ts
import { Resend } from 'resend';
import { env } from '@/lib/env';

export const resend = new Resend(env.RESEND_API_KEY);

// Send email with Resend
export async function sendEmail(job: EmailJob) {
  const { data, error } = await resend.emails.send({
    from: 'UI SyncUp <noreply@yourdomain.com>',
    to: job.to,
    subject: job.subject,
    html: renderTemplate(job.template, job.data),
  });
  
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
  
  return data;
}
```

**Rate Limits:**
- Free tier: 100 emails/day, 3,000 emails/month
- Paid tier: 100 emails/second
- Implement exponential backoff for rate limit errors

### Monitoring

**Metrics to Track:**
- Sign-in success/failure rate
- Session creation rate
- Token validation rate
- Rate limit hit rate
- API response times
- Database query times
- Error rates by endpoint

**Alerts:**
- High authentication failure rate (potential attack)
- Database connection pool exhaustion
- Email service failures
- High rate limit hit rate

### Rollback Plan

**Database Rollback:**
- Keep previous migration version
- Test rollback on staging
- Document rollback procedure

**Code Rollback:**
- Use feature flags for new auth features
- Keep previous deployment version
- Test rollback procedure

## Future Enhancements

### OAuth Providers

- Google OAuth (already configured)
- GitHub OAuth
- Microsoft OAuth
- Apple Sign-In

### Multi-Factor Authentication

- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification codes
- Backup codes

### Advanced Security

- Device fingerprinting
- Anomaly detection
- IP geolocation
- Suspicious activity alerts

### User Experience

- Remember me option (longer session)
- Passwordless sign-in (magic links)
- Social login
- Single Sign-On (SSO)

### Compliance

- GDPR data export
- CCPA compliance
- SOC 2 compliance
- Audit logs
