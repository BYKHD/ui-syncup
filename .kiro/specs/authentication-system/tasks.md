# Implementation Tasks

This task list has been refreshed based on the current codebase state. The following infrastructure is already in place:
- ✅ Database client configured (`src/lib/db.ts`)
- ✅ Environment validation with Zod (`src/lib/env.ts`)
- ✅ Basic auth validators (`src/features/auth/utils/validators.ts`)
- ✅ Mock auth hooks (`src/features/auth/hooks/use-sign-in.ts`, etc.)
- ✅ Dependencies installed: `drizzle-orm`, `postgres`, `better-auth`, `resend`, `zod`

## Phase 1: Database Schema & Core Infrastructure

- [x] 1. Set up Drizzle configuration and database schema
  - Create `drizzle.config.ts` with schema path and migrations directory
  - Add database scripts to `package.json` (db:generate, db:migrate, db:studio, db:push)
  - Create `src/server/db/schema/` directory structure
  - Create `users` table schema with id, email, emailVerified, passwordHash, name, timestamps
  - Create `sessions` table schema with id, userId, token, expiresAt, ipAddress, userAgent
  - Create `verification_tokens` table schema with id, userId, token, type, expiresAt, usedAt
  - Create `user_roles` table schema with id, userId, role, resourceType, resourceId
  - Create `email_jobs` table schema for email queue
  - Add appropriate indexes (email unique, token unique, userId foreign keys)
  - Export all schemas from `src/server/db/schema/index.ts`
  - Generate and review initial migration
  - _Validates: Requirements 1.1, 2.1, 3.1, 4.1, 6.1, 7.1_

- [x] 2. Install missing dependencies
  - Install `@node-rs/argon2` for password hashing
  - Install `fast-check` for property-based testing
  - Install `ioredis` or use in-memory Map for rate limiting
  - _Validates: Requirements 8.1_

## Phase 2: Core Authentication Services

- [x] 3. Implement password hashing utilities
  - Create `src/server/auth/password.ts`
  - Implement `hashPassword(password: string): Promise<string>` using Argon2id
  - Implement `verifyPassword(password: string, hash: string): Promise<boolean>`
  - Use appropriate Argon2id parameters (memory cost: 65536, iterations: 3)
  - _Validates: Requirements 1.1, 8.1_

- [x] 3.1 Write property test for password hashing
  - **Property 23: Passwords are hashed securely**
  - **Validates: Requirements 8.1**

- [x] 4. Implement token generation and verification
  - Create `src/server/auth/tokens.ts`
  - Implement `generateToken(userId, type, expiresInMs): Promise<string>` with HMAC-SHA256
  - Implement `verifyToken(token, type): Promise<{ userId } | null>`
  - Store tokens in database with expiration
  - Implement token invalidation logic
  - _Validates: Requirements 1.4, 2.1, 2.4, 6.1_

- [x] 4.1 Write property test for token generation
  - **Property 3: Registration creates verification token**
  - **Validates: Requirements 1.4**

- [x] 4.2 Write property test for token invalidation
  - **Property 6: New verification token invalidates previous tokens**
  - **Validates: Requirements 2.4**

- [x] 5. Implement cookie management
  - Create `src/server/auth/cookies.ts`
  - Implement `setSessionCookie(response, sessionToken)` with HTTP-only, Secure, SameSite=Lax
  - Implement `getSessionCookie(): string | null`
  - Implement `clearSessionCookie(response)`
  - Configure 7-day max-age
  - _Validates: Requirements 3.1, 4.1, 8.2_

- [x] 5.1 Write property test for cookie security attributes
  - **Property 24: Session cookies have security attributes**
  - **Validates: Requirements 8.2**

- [x] 6. Implement session management
  - Create `src/server/auth/session.ts`
  - Implement `createSession(userId, ipAddress, userAgent): Promise<string>` with crypto-random tokens
  - Implement `getSession(): Promise<SessionUser | null>` with validation
  - Implement `extendSession(sessionId): Promise<void>` for rolling renewal
  - Implement `deleteSession(sessionId): Promise<void>`
  - Implement `deleteAllUserSessions(userId): Promise<void>`
  - _Validates: Requirements 3.1, 3.4, 4.1, 4.3, 4.4, 5.1, 8.5_

- [x] 6.1 Write property test for session creation
  - **Property 7: Valid credentials create session**
  - **Validates: Requirements 3.1, 3.4**

- [x] 6.2 Write property test for session validation
  - **Property 10: Session validation performs all security checks**
  - **Validates: Requirements 4.4**

- [x] 6.3 Write property test for rolling renewal
  - **Property 11: Rolling renewal extends session expiration**
  - **Validates: Requirements 4.3**

- [x] 6.4 Write property test for session ID randomness
  - **Property 27: Session IDs are cryptographically random**
  - **Validates: Requirements 8.5**

- [x] 7. Implement RBAC utilities
  - Create `src/config/roles.ts` with role definitions (TEAM_*, PROJECT_*) and permissions map
  - Create `src/server/auth/rbac.ts`
  - Implement `assignRole(userId, role, resourceType, resourceId): Promise<void>`
  - Implement `getUserRoles(userId): Promise<UserRole[]>`
  - Implement `hasPermission(userId, permission, resourceId): Promise<boolean>`
  - Implement `updateBillableSeats(teamId): Promise<void>`
  - Create `docs/RBAC.md` with comprehensive documentation
  - _Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7.1 Write property test for role assignment
  - **Property 18: Verified users receive default roles**
  - **Validates: Requirements 7.1**

- [x] 7.2 Write property test for billable seats
  - **Property 20: Editor roles mark billable seats**
  - **Validates: Requirements 7.3**

## Phase 3: Rate Limiting

- [x] 8. Implement rate limiter
  - Create `src/server/auth/rate-limiter.ts`
  - Implement `checkLimit(key, limit, windowMs): Promise<boolean>` using in-memory Map or Redis
  - Implement `getRemainingAttempts(key, limit): Promise<number>`
  - Support IP-based and email-based rate limiting
  - Return 429 with Retry-After header when exceeded
  - _Validates: Requirements 3.5, 11.1, 11.2, 11.3, 11.4_

- [x] 8.1 Write property test for IP rate limiting
  - **Property 33: IP-based rate limiting enforces limits**
  - **Validates: Requirements 11.1**

- [x] 8.2 Write property test for email rate limiting
  - **Property 34: Email-based rate limiting enforces limits**
  - **Validates: Requirements 11.2**

- [x] 8.3 Write property test for rate limit responses
  - **Property 36: Rate limit responses include retry-after header**
  - **Validates: Requirements 11.4**

## Phase 4: Email Service

- [x] 9. Set up email infrastructure
  - Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `src/lib/env.ts`
  - Create `src/server/email/client.ts` with Resend SDK
  - Implement `sendEmail(job: EmailJob): Promise<void>` with error handling
  - Create `src/server/email/templates/` directory
  - Create email templates: `verification-email.tsx`, `password-reset-email.tsx`, `welcome-email.tsx`, `security-alert-email.tsx`
  - Implement `renderTemplate(template, data): string`
  - _Validates: Requirements 1.4, 6.1_

- [x] 10. Implement email queue system
  - Create `src/server/email/queue.ts`
  - Implement `enqueueEmail(job: EmailJob): Promise<void>` with idempotency (userId + tokenId)
  - Implement `processEmailQueue(): Promise<void>` with retry logic (30s, 5m, 30m)
  - Create `src/server/email/worker.ts` for background processing
  - Implement failure logging and alerting after max retries
  - _Validates: Requirements 1.4, 6.1_

## Phase 5: Validation Schemas

- [x] 11. Enhance validation schemas
  - Update `src/features/auth/utils/validators.ts`
  - Enhance `signUpSchema` with password complexity (8+ chars, uppercase, lowercase, number, special)
  - Create `forgotPasswordSchema` with email validation
  - Create `resetPasswordSchema` with token and password validation
  - Create `verifyEmailSchema` with token validation
  - Create `src/features/auth/api/types.ts` with response schemas (UserResponse, SessionResponse, ErrorResponse, SuccessResponse)
  - _Validates: Requirements 1.3, 1.5, 8.3_

- [x] 11.1 Write property test for password validation
  - **Property 2: Password validation enforces security requirements**
  - **Validates: Requirements 1.3**

- [x] 11.2 Write property test for validation errors
  - **Property 4: Validation errors are field-specific**
  - **Validates: Requirements 1.5**

- [x] 11.3 Write property test for Zod validation
  - **Property 25: Auth endpoints validate input with Zod**
  - **Validates: Requirements 8.3**

## Phase 6: API Routes

- [x] 12. Implement POST /api/auth/signup
  - Create `src/app/api/auth/signup/route.ts`
  - Validate request body with enhanced `signUpSchema`
  - Check for duplicate email (return 409)
  - Hash password with Argon2
  - Create user record with emailVerified=false
  - Generate verification token
  - Enqueue verification email
  - Return 201 with success message
  - _Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 12.1 Write property test for user creation
  - **Property 1: Valid registration creates user with hashed password**
  - **Validates: Requirements 1.1**

- [x] 13. Implement GET /api/auth/verify-email
  - Create `src/app/api/auth/verify-email/route.ts`
  - Validate token from query params
  - Verify token signature and expiration
  - Check if token already used (return 410)
  - Mark user as verified
  - Mark token as used
  - Assign default roles via RBAC
  - Redirect to sign-in with success message
  - _Validates: Requirements 2.1, 2.2, 2.3, 2.5, 7.1_

- [x] 13.1 Write property test for email verification
  - **Property 5: Valid verification marks user as verified**
  - **Validates: Requirements 2.1**

- [x] 14. Implement POST /api/auth/login
  - Create `src/app/api/auth/login/route.ts`
  - Apply rate limiting (5 per IP/min, 3 per email/15min)
  - Validate request body with `signInSchema`
  - Find user by email
  - Verify password hash
  - Check email is verified (return 403 if not)
  - Create session with IP and user agent
  - Set session cookie
  - Return user data
  - _Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 14.1 Write property test for rate limiting
  - **Property 8: Rate limiting blocks excessive sign-in attempts**
  - **Validates: Requirements 3.5**

- [x] 15. Implement GET /api/auth/me
  - Create `src/app/api/auth/me/route.ts`
  - Get session from cookie
  - Validate session (signature, expiration, database)
  - Extend session expiration (rolling renewal)
  - Get user data with roles
  - Return user data or 401
  - _Validates: Requirements 4.1, 4.3, 4.4, 10.1_

- [x] 15.1 Write property test for session access
  - **Property 9: Valid session grants access**
  - **Validates: Requirements 4.1**

- [x] 16. Implement POST /api/auth/logout
  - Create `src/app/api/auth/logout/route.ts`
  - Get session from cookie
  - Delete session from database
  - Clear session cookie
  - Return success message
  - _Validates: Requirements 5.1, 5.2, 5.4_

- [x] 16.1 Write property test for sign-out
  - **Property 12: Sign-out invalidates session**
  - **Validates: Requirements 5.1**

- [x] 16.2 Write property test for multi-device sessions
  - **Property 13: Sign-out preserves other sessions**
  - **Validates: Requirements 5.5**

- [x] 17. Implement POST /api/auth/forgot-password
  - Create `src/app/api/auth/forgot-password/route.ts`
  - Apply rate limiting (3 per email/hour)
  - Validate request body with `forgotPasswordSchema`
  - Find user by email (silently fail if not found)
  - Generate password reset token (1 hour expiration)
  - Invalidate previous reset tokens
  - Enqueue password reset email
  - Return success message (always)
  - _Validates: Requirements 6.1, 6.5_

- [x] 17.1 Write property test for reset token creation
  - **Property 16: Password reset creates time-limited token**
  - **Validates: Requirements 6.1**

- [x] 18. Implement POST /api/auth/reset-password
  - Create `src/app/api/auth/reset-password/route.ts`
  - Validate request body with `resetPasswordSchema`
  - Verify token signature and expiration
  - Check if token already used (return 410)
  - Hash new password
  - Update user password hash
  - Mark token as used
  - Invalidate all user sessions
  - Return success message
  - _Validates: Requirements 6.2, 6.3, 6.4_

- [x] 18.1 Write property test for session invalidation
  - **Property 17: Password reset invalidates all sessions**
  - **Validates: Requirements 6.2**

- [x] 19. Checkpoint - Ensure all API tests pass
  - Run all property-based tests
  - Verify all API endpoints return correct status codes
  - Verify error handling works correctly
  - Ask the user if questions arise

## Phase 7: Client-Side Integration

- [x] 20. Update useSession hook
  - Update `src/features/auth/hooks/use-session.ts`
  - Replace mock with React Query to fetch `/api/auth/me`
  - Cache session data for 5 minutes
  - Add retry logic with exponential backoff
  - Return loading, error, and data states
  - _Validates: Requirements 10.1, 10.2_

- [x] 20.1 Write property test for cache invalidation
  - **Property 29: Auth state changes invalidate cache**
  - **Validates: Requirements 10.2**

- [x] 21. Update useSignIn hook
  - Update `src/features/auth/hooks/use-sign-in.ts`
  - Replace mock with React Query mutation to POST `/api/auth/login`
  - Invalidate session cache on success
  - Handle validation errors
  - Handle rate limit errors with retry-after
  - Redirect to dashboard on success
  - _Validates: Requirements 3.1, 3.5_

- [x] 22. Update useSignUp hook
  - Update `src/features/auth/hooks/use-sign-up.ts`
  - Replace mock with React Query mutation to POST `/api/auth/signup`
  - Handle validation errors
  - Handle duplicate email errors (409)
  - Display success message
  - _Validates: Requirements 1.1, 1.2_

- [x] 23. Create useSignOut hook
  - Create `src/features/auth/hooks/use-sign-out.ts`
  - Use React Query mutation to POST `/api/auth/logout`
  - Clear session cache on success
  - Redirect to sign-in page
  - _Validates: Requirements 5.1, 5.2_

- [x] 24. Create password reset hooks
  - Create `src/features/auth/hooks/use-forgot-password.ts`
  - Create `src/features/auth/hooks/use-reset-password.ts`
  - Use React Query mutations for both endpoints
  - Handle validation and error states
  - _Validates: Requirements 6.1, 6.2_

## Phase 8: UI Components

- [x] 25. Update SignUpForm component
  - Update `src/features/auth/components/sign-up-form.tsx`
  - Use real `useSignUp` hook
  - Display validation errors from API
  - Display success message after registration
  - Show loading state during submission
  - Handle duplicate email errors
  - _Validates: Requirements 1.1, 1.2, 1.5_

- [x] 26. Update SignInForm component
  - Update `src/features/auth/components/sign-in-form.tsx`
  - Use real `useSignIn` hook
  - Display validation errors from API
  - Display authentication errors
  - Show loading state during submission
  - Handle rate limit errors with retry-after
  - Redirect to dashboard on success
  - _Validates: Requirements 3.1, 3.2, 3.5_

- [x] 27. Create ForgotPasswordForm component
  - Create `src/features/auth/components/forgot-password-form.tsx`
  - Use `useForgotPassword` hook
  - Email input with validation
  - Display success message
  - Show loading state during submission
  - Handle rate limit errors
  - _Validates: Requirements 6.1, 6.5_

- [x] 28. Create ResetPasswordForm component
  - Create `src/features/auth/components/reset-password-form.tsx`
  - Use `useResetPassword` hook
  - Password and confirm password inputs
  - Display password strength indicator (reuse existing component)
  - Display validation errors
  - Show loading state during submission
  - Redirect to sign-in on success
  - _Validates: Requirements 6.2, 6.3, 6.4_

- [x] 29. Create RoleGate component
  - Create `src/features/auth/components/role-gate.tsx`
  - Accept `roles` prop (array of required roles)
  - Use `useSession` hook to get user roles
  - Render children if user has any required role
  - Render fallback or null if unauthorized
  - _Validates: Requirements 10.4_

- [x] 29.1 Write property test for permission checks
  - **Property 31: Permission hooks return correct boolean results**
  - **Validates: Requirements 10.4**

## Phase 9: Route Protection

- [x] 30. Implement server-side session check
  - Update `src/app/(protected)/layout.tsx`
  - Call `getSession()` on server side
  - Redirect to `/sign-in` if no session
  - Pass session data to client components
  - _Validates: Requirements 12.4, 12.5_

- [x] 30.1 Write property test for server-side validation
  - **Property 38: Server-side layout validates sessions**
  - **Validates: Requirements 12.4**

- [x] 31. Implement guest-only route protection
  - Update `src/app/(public)/sign-in/page.tsx`
  - Update `src/app/(public)/sign-up/page.tsx`
  - Check session on server side
  - Redirect to dashboard if authenticated
  - _Validates: Requirements 12.1, 12.2_

- [x] 32. Create password reset pages
  - Create `src/app/(public)/forgot-password/page.tsx`
  - Create `src/app/(public)/reset-password/page.tsx`
  - Render ForgotPasswordForm component
  - Render ResetPasswordForm component
  - Handle token from query params
  - _Validates: Requirements 6.1, 6.2_

- [x] 32.1 Write property test for route protection
  - **Property 15: Protected routes reject signed-out users**
  - **Validates: Requirements 5.3**

## Phase 10: Logging and Monitoring

- [x] 33. Implement structured logging
  - Update `src/lib/logger.ts` with auth event types
  - Implement `logAuthEvent(eventType, context)` function
  - Include eventId, timestamp, userId, ipAddress, outcome
  - Hash email addresses for PII protection
  - Add requestId correlation
  - Configure log levels (info, warn, error)
  - _Validates: Requirements 8.4_

- [x] 33.1 Write property test for auth event logging
  - **Property 26: Auth events are logged with required fields**
  - **Validates: Requirements 8.4**

- [x] 33.2 Write property test for sign-out logging
  - **Property 14: Sign-out logs event**
  - **Validates: Requirements 5.4**

- [x] 33.3 Write property test for rate limit logging
  - **Property 37: Rate limit violations are logged**
  - **Validates: Requirements 11.5**

- [x] 34. Add logging to all auth endpoints
  - Log signup attempts, successes, and failures
  - Log login attempts, successes, and failures
  - Log logout events
  - Log email verification attempts
  - Log password reset requests and completions
  - Log rate limit violations
  - Log security events (token tampering, session tampering)
  - _Validates: Requirements 8.4, 11.5_

- [ ] 35. Document monitoring setup
  - Update `docs/DEPLOYMENT.md` with monitoring rules
  - Define alert thresholds (high failure rate, rate limit abuse, etc.)
  - Document metrics collection (counters, gauges, histograms)
  - Document email/Slack alert configuration
  - Add troubleshooting section
  - _Validates: Requirements 8.4_

## Phase 11: Testing & Documentation

- [ ] 36. Write remaining property-based tests
  - Install and configure `fast-check`
  - Create test generators for emails, passwords, users, sessions
  - Implement any remaining properties not covered by inline tests
  - Configure tests to run 100+ iterations
  - Verify all 38 properties pass
  - _Validates: All requirements_

- [ ] 37. Write integration tests
  - Test complete registration → verification → sign-in flow
  - Test sign-in with invalid credentials
  - Test sign-in with unverified email
  - Test password reset flow
  - Test session validation and renewal
  - Test rate limiting behavior
  - Test concurrent session handling
  - Use test database for integration tests
  - _Validates: All requirements_

- [ ] 38. Write E2E tests
  - Test new user registration and email verification
  - Test existing user sign-in and dashboard access
  - Test password reset flow
  - Test sign-out from multiple devices
  - Test rate limiting with multiple attempts
  - Test protected route access control
  - Configure Playwright for CI/CD
  - _Validates: All requirements_

- [ ] 39. Update environment configuration
  - Update `.env.example` with all auth-related variables
  - Update `docs/ENVIRONMENT_CONFIG.md` with descriptions
  - Document Resend API key setup
  - Document database connection strings
  - Document better-auth secret generation
  - _Validates: All requirements_

- [ ] 40. Final checkpoint - Production readiness
  - Ensure all tests pass (unit, property, integration, E2E)
  - Verify all API endpoints work correctly
  - Verify email delivery works
  - Verify rate limiting works
  - Verify logging works
  - Review security checklist
  - Ask the user if questions arise

## Summary

**Total Tasks:** 65 (40 implementation + 25 property tests)
**Estimated Total Effort:** ~100-120 hours for comprehensive implementation with full test coverage

**Critical Path:**
1. Phase 1: Database Schema (8 hours)
2. Phase 2: Core Services (16 hours)
3. Phase 3: Rate Limiting (4 hours)
4. Phase 4: Email Service (8 hours)
5. Phase 5: Validation (3 hours)
6. Phase 6: API Routes (20 hours)
7. Phase 7: Client Hooks (8 hours)
8. Phase 8: UI Components (10 hours)
9. Phase 9: Route Protection (5 hours)
10. Phase 10: Logging (6 hours)
11. Phase 11: Testing & Documentation (12 hours)

**Key Changes from Original:**
- Consolidated related tasks to reduce overhead
- All test tasks are now required for comprehensive quality assurance
- Removed redundant tasks (existing infrastructure already in place)
- Streamlined from 60 to 65 focused tasks (40 implementation + 25 property tests)
- Property tests are co-located with implementation tasks for better context
- Added checkpoints for validation
- Full test coverage ensures production-ready authentication system
