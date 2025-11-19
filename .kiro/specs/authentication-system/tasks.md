# Implementation Tasks

## Phase 1: Database Schema & Infrastructure

### Task 1.1: Set up Drizzle ORM configuration
**Description:** Configure Drizzle ORM for PostgreSQL with proper connection pooling and migration setup.

**Acceptance Criteria:**
- [ ] Create `drizzle.config.ts` with schema path and output directory
- [ ] Configure database connection in `src/server/db/client.ts`
- [ ] Set up connection pooling (10-20 connections)
- [ ] Add database scripts to `package.json` (generate, migrate, studio)
- [ ] Verify connection works with test query

**Dependencies:** None

**Estimated Effort:** 2 hours

---

### Task 1.2: Create users table schema
**Description:** Define the users table schema with Drizzle ORM including all required fields and constraints.

**Acceptance Criteria:**
- [ ] Create `src/server/db/schema/users.ts`
- [ ] Define users table with id, email, emailVerified, passwordHash, name, createdAt, updatedAt
- [ ] Add unique constraint on email
- [ ] Add indexes for email lookups
- [ ] Export schema from `src/server/db/schema/index.ts`

**Dependencies:** Task 1.1

**Estimated Effort:** 1 hour

---

### Task 1.3: Create sessions table schema
**Description:** Define the sessions table schema for managing user sessions.

**Acceptance Criteria:**
- [ ] Create `src/server/db/schema/sessions.ts`
- [ ] Define sessions table with id, userId, token, expiresAt, createdAt, ipAddress, userAgent
- [ ] Add foreign key to users table with cascade delete
- [ ] Add unique index on token
- [ ] Add index on userId for efficient user session queries

**Dependencies:** Task 1.2

**Estimated Effort:** 1 hour

---

### Task 1.4: Create verification_tokens table schema
**Description:** Define the verification_tokens table for email verification and password reset tokens.

**Acceptance Criteria:**
- [ ] Create `src/server/db/schema/verification_tokens.ts`
- [ ] Define table with id, userId, token, type, expiresAt, usedAt, createdAt
- [ ] Add foreign key to users table with cascade delete
- [ ] Add unique index on token
- [ ] Add index on userId and type

**Dependencies:** Task 1.2

**Estimated Effort:** 1 hour

---

### Task 1.5: Create user_roles table schema
**Description:** Define the user_roles table for RBAC integration.

**Acceptance Criteria:**
- [ ] Create `src/server/db/schema/user_roles.ts`
- [ ] Define table with id, userId, role, resourceType, resourceId, createdAt
- [ ] Add foreign key to users table with cascade delete
- [ ] Add composite unique constraint on (userId, resourceType, resourceId)
- [ ] Add indexes for efficient role queries

**Dependencies:** Task 1.2

**Estimated Effort:** 1 hour

---

### Task 1.6: Generate and apply initial migrations
**Description:** Generate SQL migrations from Drizzle schemas and apply to database.

**Acceptance Criteria:**
- [ ] Run `bun db:generate` to create migration files
- [ ] Review generated SQL migrations
- [ ] Run `bun db:migrate` to apply migrations
- [ ] Verify all tables and indexes created correctly
- [ ] Test rollback procedure

**Dependencies:** Tasks 1.2, 1.3, 1.4, 1.5

**Estimated Effort:** 1 hour

---

## Phase 2: Core Authentication Services

### Task 2.1: Implement password hashing utilities
**Description:** Create utilities for hashing and verifying passwords using Argon2.

**Acceptance Criteria:**
- [ ] Install `@node-rs/argon2` package
- [ ] Create `src/server/auth/password.ts`
- [ ] Implement `hashPassword(password: string): Promise<string>`
- [ ] Implement `verifyPassword(password: string, hash: string): Promise<boolean>`
- [ ] Use appropriate Argon2id parameters (memory cost, iterations)
- [ ] Add unit tests for hashing and verification

**Dependencies:** None

**Estimated Effort:** 2 hours

---

### Task 2.2: Implement token generation and signing
**Description:** Create utilities for generating and verifying signed tokens for email verification and password reset.

**Acceptance Criteria:**
- [ ] Create `src/server/auth/tokens.ts`
- [ ] Implement `generateToken(userId, type, expiresInMs): Promise<string>`
- [ ] Implement `verifyToken(token, type): Promise<{ userId } | null>`
- [ ] Use HMAC-SHA256 for token signing with `BETTER_AUTH_SECRET`
- [ ] Store tokens in database with expiration
- [ ] Add unit tests for token generation and verification

**Dependencies:** Task 1.4

**Estimated Effort:** 3 hours

---

### Task 2.3: Implement cookie management
**Description:** Create utilities for managing HTTP-only session cookies.

**Acceptance Criteria:**
- [ ] Create `src/server/auth/cookies.ts`
- [ ] Implement `setSessionCookie(response, sessionToken)`
- [ ] Implement `getSessionCookie(): string | null`
- [ ] Implement `clearSessionCookie(response)`
- [ ] Set HTTP-only, Secure, SameSite=Lax attributes
- [ ] Configure appropriate max-age (7 days)
- [ ] Add unit tests for cookie operations

**Dependencies:** None

**Estimated Effort:** 2 hours

---

### Task 2.4: Implement session management
**Description:** Create session CRUD operations and validation logic.

**Acceptance Criteria:**
- [ ] Create `src/server/auth/session.ts`
- [ ] Implement `createSession(userId, ipAddress, userAgent): Promise<string>`
- [ ] Implement `getSession(): Promise<SessionUser | null>`
- [ ] Implement `extendSession(sessionId): Promise<void>`
- [ ] Implement `deleteSession(sessionId): Promise<void>`
- [ ] Implement `deleteAllUserSessions(userId): Promise<void>`
- [ ] Generate cryptographically random session tokens
- [ ] Add unit tests for all session operations

**Dependencies:** Tasks 1.3, 2.3

**Estimated Effort:** 4 hours

---

### Task 2.5: Implement RBAC utilities
**Description:** Create utilities for role assignment and permission checking.

**Acceptance Criteria:**
- [ ] Create `src/config/roles.ts` with role definitions and permissions
- [ ] Create `src/server/auth/rbac.ts`
- [ ] Implement `assignRole(userId, role, resourceType, resourceId)`
- [ ] Implement `getUserRoles(userId): Promise<UserRole[]>`
- [ ] Implement `hasPermission(userId, permission, resourceId): Promise<boolean>`
- [ ] Implement `updateBillableSeats(teamId): Promise<void>`
- [ ] Add unit tests for RBAC operations

**Dependencies:** Task 1.5

**Estimated Effort:** 4 hours

---

## Phase 3: Email Service

### Task 3.1: Set up Resend email client
**Description:** Configure Resend SDK and create email sending utilities.

**Acceptance Criteria:**
- [ ] Install `resend` package
- [ ] Add `RESEND_API_KEY` to environment schema in `src/lib/env.ts`
- [ ] Create `src/server/email/client.ts` with Resend client
- [ ] Implement `sendEmail(job: EmailJob): Promise<void>`
- [ ] Handle Resend API errors and rate limits
- [ ] Add unit tests with mocked Resend client

**Dependencies:** None

**Estimated Effort:** 2 hours

---

### Task 3.2: Create email templates
**Description:** Create HTML email templates for verification and password reset.

**Acceptance Criteria:**
- [ ] Create `src/server/email/templates/` directory
- [ ] Create `verification-email.tsx` template with React Email
- [ ] Create `password-reset-email.tsx` template
- [ ] Create `welcome-email.tsx` template
- [ ] Create `security-alert-email.tsx` template
- [ ] Implement `renderTemplate(template, data): string`
- [ ] Test templates render correctly

**Dependencies:** Task 3.1

**Estimated Effort:** 3 hours

---

### Task 3.3: Implement email queue system
**Description:** Create job queue for reliable, asynchronous email delivery.

**Acceptance Criteria:**
- [ ] Create `src/server/db/schema/email_jobs.ts` table
- [ ] Create `src/server/email/queue.ts`
- [ ] Implement `enqueueEmail(job: EmailJob): Promise<void>`
- [ ] Implement idempotency by userId + tokenId
- [ ] Implement `processEmailQueue(): Promise<void>`
- [ ] Add retry logic with exponential backoff (30s, 5m, 30m)
- [ ] Add unit tests for queue operations

**Dependencies:** Tasks 3.1, 3.2

**Estimated Effort:** 4 hours

---

### Task 3.4: Create email worker
**Description:** Create background worker to process email queue.

**Acceptance Criteria:**
- [ ] Create `src/server/email/worker.ts`
- [ ] Implement job processing with error handling
- [ ] Implement retry scheduling on failure
- [ ] Implement failure logging and alerting after max retries
- [ ] Add graceful shutdown handling
- [ ] Add monitoring for queue size and processing rate
- [ ] Add integration tests for worker

**Dependencies:** Task 3.3

**Estimated Effort:** 3 hours

---

## Phase 4: Rate Limiting

### Task 4.1: Implement rate limiter
**Description:** Create rate limiting utilities using Redis or in-memory store.

**Acceptance Criteria:**
- [ ] Install `ioredis` package (or use in-memory Map for MVP)
- [ ] Create `src/server/auth/rate-limiter.ts`
- [ ] Implement `checkLimit(key, limit, windowMs): Promise<boolean>`
- [ ] Implement `getRemainingAttempts(key, limit): Promise<number>`
- [ ] Support multiple rate limit rules (IP, email)
- [ ] Return 429 with Retry-After header when exceeded
- [ ] Add unit tests with mocked Redis

**Dependencies:** None

**Estimated Effort:** 3 hours

---

### Task 4.2: Add rate limiting middleware
**Description:** Create middleware to apply rate limits to auth endpoints.

**Acceptance Criteria:**
- [ ] Create `src/server/auth/rate-limit-middleware.ts`
- [ ] Implement IP-based rate limiting (5 per minute for sign-in)
- [ ] Implement email-based rate limiting (3 per 15 minutes for sign-in)
- [ ] Implement password reset rate limiting (3 per hour)
- [ ] Log rate limit violations with IP and email
- [ ] Add integration tests for rate limiting

**Dependencies:** Task 4.1

**Estimated Effort:** 2 hours

---

## Phase 5: Validation Schemas

### Task 5.1: Create Zod validation schemas
**Description:** Define Zod schemas for all authentication inputs and outputs.

**Acceptance Criteria:**
- [ ] Update `src/features/auth/utils/validators.ts`
- [ ] Create `signUpSchema` with email, password, name validation
- [ ] Create `signInSchema` with email, password validation
- [ ] Create `forgotPasswordSchema` with email validation
- [ ] Create `resetPasswordSchema` with token, password validation
- [ ] Create `verifyEmailSchema` with token validation
- [ ] Add password complexity validation (8+ chars, mixed case, number, special)
- [ ] Add unit tests for all schemas

**Dependencies:** None

**Estimated Effort:** 2 hours

---

### Task 5.2: Create API response schemas
**Description:** Define Zod schemas for API responses to ensure type safety.

**Acceptance Criteria:**
- [ ] Create `src/features/auth/api/types.ts`
- [ ] Define `UserResponse` schema
- [ ] Define `SessionResponse` schema
- [ ] Define `ErrorResponse` schema
- [ ] Define `SuccessResponse` schema
- [ ] Export TypeScript types from schemas
- [ ] Add unit tests for schema validation

**Dependencies:** None

**Estimated Effort:** 1 hour

---

## Phase 6: API Routes

### Task 6.1: Implement POST /api/auth/signup
**Description:** Create registration endpoint with validation and email verification.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/signup/route.ts`
- [ ] Validate request body with `signUpSchema`
- [ ] Check for duplicate email (return 409)
- [ ] Hash password with Argon2
- [ ] Create user record with emailVerified=false
- [ ] Generate verification token
- [ ] Enqueue verification email
- [ ] Return 201 with success message
- [ ] Log signup events
- [ ] Add integration tests

**Dependencies:** Tasks 2.1, 2.2, 3.3, 5.1

**Estimated Effort:** 3 hours

---

### Task 6.2: Implement GET /api/auth/verify-email
**Description:** Create email verification endpoint.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/verify-email/route.ts`
- [ ] Validate token from query params
- [ ] Verify token signature and expiration
- [ ] Check if token already used (return 410)
- [ ] Mark user as verified
- [ ] Mark token as used
- [ ] Assign default roles via RBAC
- [ ] Redirect to sign-in with success message
- [ ] Log verification events
- [ ] Add integration tests

**Dependencies:** Tasks 2.2, 2.5, 5.1

**Estimated Effort:** 3 hours

---

### Task 6.3: Implement POST /api/auth/login
**Description:** Create sign-in endpoint with rate limiting and session creation.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/login/route.ts`
- [ ] Apply rate limiting middleware
- [ ] Validate request body with `signInSchema`
- [ ] Find user by email
- [ ] Verify password hash
- [ ] Check email is verified (return 403 if not)
- [ ] Create session with IP and user agent
- [ ] Set session cookie
- [ ] Return user data
- [ ] Log login events
- [ ] Add integration tests

**Dependencies:** Tasks 2.1, 2.4, 4.2, 5.1

**Estimated Effort:** 3 hours

---

### Task 6.4: Implement POST /api/auth/logout
**Description:** Create sign-out endpoint to invalidate sessions.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/logout/route.ts`
- [ ] Get session from cookie
- [ ] Delete session from database
- [ ] Clear session cookie
- [ ] Return success message
- [ ] Log logout events
- [ ] Add integration tests

**Dependencies:** Task 2.4

**Estimated Effort:** 2 hours

---

### Task 6.5: Implement GET /api/auth/me
**Description:** Create endpoint to get current user session data.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/me/route.ts`
- [ ] Get session from cookie
- [ ] Validate session (signature, expiration, database)
- [ ] Extend session expiration (rolling renewal)
- [ ] Get user data with roles
- [ ] Return user data
- [ ] Return 401 if not authenticated
- [ ] Add integration tests

**Dependencies:** Tasks 2.4, 2.5

**Estimated Effort:** 2 hours

---

### Task 6.6: Implement POST /api/auth/forgot-password
**Description:** Create password reset request endpoint.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/forgot-password/route.ts`
- [ ] Apply rate limiting middleware
- [ ] Validate request body with `forgotPasswordSchema`
- [ ] Find user by email (silently fail if not found)
- [ ] Generate password reset token (1 hour expiration)
- [ ] Invalidate previous reset tokens
- [ ] Enqueue password reset email
- [ ] Return success message (always, to prevent email enumeration)
- [ ] Log reset request events
- [ ] Add integration tests

**Dependencies:** Tasks 2.2, 3.3, 4.2, 5.1

**Estimated Effort:** 3 hours

---

### Task 6.7: Implement POST /api/auth/reset-password
**Description:** Create password reset endpoint.

**Acceptance Criteria:**
- [ ] Create `src/app/api/auth/reset-password/route.ts`
- [ ] Validate request body with `resetPasswordSchema`
- [ ] Verify token signature and expiration
- [ ] Check if token already used (return 410)
- [ ] Hash new password
- [ ] Update user password hash
- [ ] Mark token as used
- [ ] Invalidate all user sessions
- [ ] Return success message
- [ ] Log password reset events
- [ ] Add integration tests

**Dependencies:** Tasks 2.1, 2.2, 2.4, 5.1

**Estimated Effort:** 3 hours

---

## Phase 7: Client-Side Integration

### Task 7.1: Create useSession hook
**Description:** Create React Query hook for accessing session data.

**Acceptance Criteria:**
- [ ] Update `src/features/auth/hooks/use-session.ts`
- [ ] Use React Query to fetch `/api/auth/me`
- [ ] Cache session data for 5 minutes
- [ ] Return loading, error, and data states
- [ ] Add retry logic with exponential backoff
- [ ] Add unit tests with mocked API

**Dependencies:** Task 6.5

**Estimated Effort:** 2 hours

---

### Task 7.2: Create useSignIn hook
**Description:** Create React Query mutation hook for sign-in.

**Acceptance Criteria:**
- [ ] Update `src/features/auth/hooks/use-sign-in.ts`
- [ ] Use React Query mutation to POST `/api/auth/login`
- [ ] Invalidate session cache on success
- [ ] Handle validation errors
- [ ] Handle rate limit errors
- [ ] Return mutation state and handlers
- [ ] Add unit tests with mocked API

**Dependencies:** Task 6.3

**Estimated Effort:** 2 hours

---

### Task 7.3: Create useSignUp hook
**Description:** Create React Query mutation hook for registration.

**Acceptance Criteria:**
- [ ] Update `src/features/auth/hooks/use-sign-up.ts`
- [ ] Use React Query mutation to POST `/api/auth/signup`
- [ ] Handle validation errors
- [ ] Handle duplicate email errors
- [ ] Return mutation state and handlers
- [ ] Add unit tests with mocked API

**Dependencies:** Task 6.1

**Estimated Effort:** 2 hours

---

### Task 7.4: Create useSignOut hook
**Description:** Create React Query mutation hook for sign-out.

**Acceptance Criteria:**
- [ ] Create `src/features/auth/hooks/use-sign-out.ts`
- [ ] Use React Query mutation to POST `/api/auth/logout`
- [ ] Clear session cache on success
- [ ] Redirect to sign-in page
- [ ] Return mutation state and handlers
- [ ] Add unit tests with mocked API

**Dependencies:** Task 6.4

**Estimated Effort:** 1 hour

---

### Task 7.5: Create password reset hooks
**Description:** Create hooks for forgot password and reset password flows.

**Acceptance Criteria:**
- [ ] Create `src/features/auth/hooks/use-forgot-password.ts`
- [ ] Create `src/features/auth/hooks/use-reset-password.ts`
- [ ] Use React Query mutations for both endpoints
- [ ] Handle validation and error states
- [ ] Return mutation state and handlers
- [ ] Add unit tests with mocked API

**Dependencies:** Tasks 6.6, 6.7

**Estimated Effort:** 2 hours

---

## Phase 8: UI Components

### Task 8.1: Update SignUpForm component
**Description:** Connect sign-up form to real authentication API.

**Acceptance Criteria:**
- [ ] Update `src/features/auth/components/sign-up-form.tsx`
- [ ] Use `useSignUp` hook
- [ ] Display validation errors from API
- [ ] Display success message after registration
- [ ] Show loading state during submission
- [ ] Handle duplicate email errors
- [ ] Add component tests

**Dependencies:** Task 7.3

**Estimated Effort:** 2 hours

---

### Task 8.2: Update SignInForm component
**Description:** Connect sign-in form to real authentication API.

**Acceptance Criteria:**
- [ ] Update `src/features/auth/components/sign-in-form.tsx`
- [ ] Use `useSignIn` hook
- [ ] Display validation errors from API
- [ ] Display authentication errors
- [ ] Show loading state during submission
- [ ] Handle rate limit errors with retry-after
- [ ] Redirect to dashboard on success
- [ ] Add component tests

**Dependencies:** Task 7.2

**Estimated Effort:** 2 hours

---

### Task 8.3: Create ForgotPasswordForm component
**Description:** Create form for requesting password reset.

**Acceptance Criteria:**
- [ ] Create `src/features/auth/components/forgot-password-form.tsx`
- [ ] Use `useForgotPassword` hook
- [ ] Email input with validation
- [ ] Display success message
- [ ] Show loading state during submission
- [ ] Handle rate limit errors
- [ ] Add component tests

**Dependencies:** Task 7.5

**Estimated Effort:** 2 hours

---

### Task 8.4: Create ResetPasswordForm component
**Description:** Create form for resetting password with token.

**Acceptance Criteria:**
- [ ] Create `src/features/auth/components/reset-password-form.tsx`
- [ ] Use `useResetPassword` hook
- [ ] Password and confirm password inputs
- [ ] Display password strength indicator
- [ ] Display validation errors
- [ ] Show loading state during submission
- [ ] Redirect to sign-in on success
- [ ] Add component tests

**Dependencies:** Task 7.5

**Estimated Effort:** 2 hours

---

### Task 8.5: Create RoleGate component
**Description:** Create component for conditional rendering based on user roles.

**Acceptance Criteria:**
- [ ] Create `src/features/auth/components/role-gate.tsx`
- [ ] Accept `roles` prop (array of required roles)
- [ ] Use `useSession` hook to get user roles
- [ ] Render children if user has any required role
- [ ] Render fallback or null if unauthorized
- [ ] Add component tests

**Dependencies:** Task 7.1

**Estimated Effort:** 1 hour

---

## Phase 9: Route Protection

### Task 9.1: Implement server-side session check
**Description:** Add session validation to protected layout.

**Acceptance Criteria:**
- [ ] Update `src/app/(protected)/layout.tsx`
- [ ] Call `getSession()` on server side
- [ ] Redirect to `/sign-in` if no session
- [ ] Pass session data to client components
- [ ] Add integration tests

**Dependencies:** Task 2.4

**Estimated Effort:** 2 hours

---

### Task 9.2: Implement guest-only route protection
**Description:** Redirect authenticated users away from sign-in/sign-up pages.

**Acceptance Criteria:**
- [ ] Update `src/app/(public)/sign-in/page.tsx`
- [ ] Update `src/app/(public)/sign-up/page.tsx`
- [ ] Check session on server side
- [ ] Redirect to dashboard if authenticated
- [ ] Add integration tests

**Dependencies:** Task 2.4

**Estimated Effort:** 1 hour

---

### Task 9.3: Create password reset pages
**Description:** Create pages for forgot password and reset password flows.

**Acceptance Criteria:**
- [ ] Create `src/app/(public)/forgot-password/page.tsx`
- [ ] Create `src/app/(public)/reset-password/page.tsx`
- [ ] Render ForgotPasswordForm component
- [ ] Render ResetPasswordForm component
- [ ] Handle token from query params
- [ ] Add page tests

**Dependencies:** Tasks 8.3, 8.4

**Estimated Effort:** 2 hours

---

## Phase 10: Logging and Monitoring

### Task 10.1: Implement structured logging
**Description:** Create logging utilities with structured event schema.

**Acceptance Criteria:**
- [ ] Update `src/lib/logger.ts` with auth event types
- [ ] Implement `logAuthEvent(eventType, context)` function
- [ ] Include eventId, timestamp, userId, ipAddress, outcome
- [ ] Hash email addresses for PII protection
- [ ] Add requestId correlation
- [ ] Configure log levels (info, warn, error)
- [ ] Add unit tests

**Dependencies:** None

**Estimated Effort:** 3 hours

---

### Task 10.2: Add logging to all auth endpoints
**Description:** Add structured logging to all authentication operations.

**Acceptance Criteria:**
- [ ] Log signup attempts, successes, and failures
- [ ] Log login attempts, successes, and failures
- [ ] Log logout events
- [ ] Log email verification attempts
- [ ] Log password reset requests and completions
- [ ] Log rate limit violations
- [ ] Log security events (token tampering, session tampering)
- [ ] Verify logs include all required fields

**Dependencies:** Task 10.1

**Estimated Effort:** 2 hours

---

### Task 10.3: Set up monitoring alerts
**Description:** Configure monitoring rules and alerts for auth system.

**Acceptance Criteria:**
- [ ] Document monitoring rules in deployment guide
- [ ] Define alert thresholds (high failure rate, rate limit abuse, etc.)
- [ ] Configure metrics collection (counters, gauges, histograms)
- [ ] Set up email/Slack alerts for critical events
- [ ] Create monitoring dashboard
- [ ] Test alerts trigger correctly

**Dependencies:** Task 10.2

**Estimated Effort:** 3 hours

---

## Phase 11: Testing

### Task 11.1: Write property-based tests
**Description:** Implement all 38 correctness properties as property-based tests.

**Acceptance Criteria:**
- [ ] Install `fast-check` package
- [ ] Create test generators for emails, passwords, users, sessions
- [ ] Implement Property 1-10 tests (registration, verification, sign-in, sessions)
- [ ] Implement Property 11-20 tests (sign-out, password reset, RBAC)
- [ ] Implement Property 21-30 tests (security, API types, cache)
- [ ] Implement Property 31-38 tests (rate limiting, route protection)
- [ ] Configure tests to run 100+ iterations
- [ ] Verify all tests pass

**Dependencies:** All Phase 6 tasks

**Estimated Effort:** 8 hours

---

### Task 11.2: Write integration tests
**Description:** Create integration tests for complete authentication flows.

**Acceptance Criteria:**
- [ ] Test complete registration → verification → sign-in flow
- [ ] Test sign-in with invalid credentials
- [ ] Test sign-in with unverified email
- [ ] Test password reset flow
- [ ] Test session validation and renewal
- [ ] Test rate limiting behavior
- [ ] Test concurrent session handling
- [ ] Use test database for integration tests

**Dependencies:** All Phase 6 tasks

**Estimated Effort:** 6 hours

---

### Task 11.3: Write E2E tests
**Description:** Create Playwright tests for critical user flows.

**Acceptance Criteria:**
- [ ] Test new user registration and email verification
- [ ] Test existing user sign-in and dashboard access
- [ ] Test password reset flow
- [ ] Test sign-out from multiple devices
- [ ] Test rate limiting with multiple attempts
- [ ] Test protected route access control
- [ ] Configure Playwright for CI/CD

**Dependencies:** All Phase 8 and 9 tasks

**Estimated Effort:** 6 hours

---

## Phase 12: Documentation and Deployment

### Task 12.1: Update environment configuration
**Description:** Document all required environment variables.

**Acceptance Criteria:**
- [ ] Update `.env.example` with all auth-related variables
- [ ] Update `docs/ENVIRONMENT_CONFIG.md` with descriptions
- [ ] Document Resend API key setup
- [ ] Document database connection strings
- [ ] Document better-auth secret generation
- [ ] Add validation for all required variables

**Dependencies:** None

**Estimated Effort:** 1 hour

---

### Task 12.2: Create deployment guide
**Description:** Document deployment steps and considerations.

**Acceptance Criteria:**
- [ ] Update `docs/DEPLOYMENT.md` with auth system setup
- [ ] Document database migration steps
- [ ] Document email service configuration
- [ ] Document monitoring setup
- [ ] Document rollback procedures
- [ ] Add troubleshooting section

**Dependencies:** All previous tasks

**Estimated Effort:** 2 hours

---

### Task 12.3: Create user documentation
**Description:** Create end-user documentation for authentication features.

**Acceptance Criteria:**
- [ ] Document registration process
- [ ] Document email verification
- [ ] Document password reset process
- [ ] Document session management
- [ ] Add FAQ section
- [ ] Add screenshots/diagrams

**Dependencies:** All Phase 8 tasks

**Estimated Effort:** 2 hours

---

## Summary

**Total Tasks:** 60
**Estimated Total Effort:** 130 hours (~3-4 weeks for 1 developer)

**Critical Path:**
1. Phase 1: Database Schema (7 hours)
2. Phase 2: Core Services (15 hours)
3. Phase 3: Email Service (12 hours)
4. Phase 4: Rate Limiting (5 hours)
5. Phase 5: Validation (3 hours)
6. Phase 6: API Routes (19 hours)
7. Phase 7: Client Hooks (9 hours)
8. Phase 8: UI Components (9 hours)
9. Phase 9: Route Protection (5 hours)
10. Phase 10: Logging (8 hours)
11. Phase 11: Testing (20 hours)
12. Phase 12: Documentation (5 hours)

**Recommended Approach:**
- Start with Phase 1-2 to establish foundation
- Implement Phase 3-6 for core functionality
- Add Phase 7-9 for client integration
- Complete Phase 10-11 for production readiness
- Finish with Phase 12 for deployment
