# Design Specification

## Architecture Overview
[High-level system design and component relationships - include diagram or ASCII art if helpful]

**Example:**
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  Auth API    │─────▶│  Database   │
│  (React)    │◀─────│  (Express)   │◀─────│ (Postgres)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Redis     │
                     │ (Sessions)   │
                     └──────────────┘
```

**Architecture Pattern:** Three-tier architecture with presentation, business logic, and data layers
**Communication:** RESTful API with JSON payloads
**Authentication Flow:** JWT-based stateless authentication with Redis for token blacklist

---

## Technical Approach
[Technologies, frameworks, patterns to be used - be specific with versions]

**Frontend:**
- React 18.2+ with TypeScript
- React Router for navigation
- Axios for HTTP requests
- Context API for auth state management
- React Hook Form for form validation

**Backend:**
- Node.js 18+ with Express 4.18+
- TypeScript for type safety
- JWT for token generation (jsonwebtoken 9.0+)
- bcrypt for password hashing (bcrypt 5.1+)
- express-validator for input validation

**Database:**
- PostgreSQL 14+ for user data
- Redis 7+ for token blacklist and rate limiting

**Design Patterns:**
- Repository pattern for data access
- Middleware pattern for authentication checks
- Factory pattern for token generation
- Strategy pattern for different auth methods (future OAuth)

---

## Component Design
[Detailed design of major components - describe responsibility and interactions]

### Frontend Components

#### AuthProvider (Context)
**Responsibility:** Manage global authentication state
**State:**
```typescript
{
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean
}
```
**Methods:**
- `login(email, password)` - Authenticate user
- `logout()` - Clear auth state
- `register(email, password)` - Create new account
- `resetPassword(email)` - Initiate password reset

#### LoginForm Component
**Responsibility:** Render login UI and handle submission
**Props:** `onSuccess?: () => void`
**State:** `{ email, password, errors, isSubmitting }`
**Validation:** Email format, password min length

#### RegisterForm Component
**Responsibility:** Render registration UI with validation
**Props:** `onSuccess?: () => void`
**State:** `{ email, password, confirmPassword, errors, isSubmitting }`
**Validation:** Email format, password strength, password match

#### ProtectedRoute Component
**Responsibility:** Wrap routes requiring authentication
**Props:** `{ children: ReactNode, redirectTo?: string }`
**Behavior:** Redirect to login if not authenticated

### Backend Components

#### AuthController
**Responsibility:** Handle HTTP requests for auth endpoints
**Methods:**
- `register(req, res)` - Create new user
- `login(req, res)` - Authenticate and issue token
- `logout(req, res)` - Invalidate token
- `resetPassword(req, res)` - Send reset email
- `confirmReset(req, res)` - Update password with token

#### AuthService
**Responsibility:** Business logic for authentication
**Methods:**
- `createUser(email, password)` - Hash password, save user
- `validateCredentials(email, password)` - Check credentials
- `generateToken(userId)` - Create JWT
- `verifyToken(token)` - Validate JWT
- `blacklistToken(token)` - Add to Redis blacklist

#### UserRepository
**Responsibility:** Database operations for users
**Methods:**
- `create(userData)` - Insert new user
- `findByEmail(email)` - Query user by email
- `findById(id)` - Query user by ID
- `updatePassword(id, hashedPassword)` - Update password

#### AuthMiddleware
**Responsibility:** Protect routes requiring authentication
**Behavior:**
- Extract token from Authorization header
- Verify token signature and expiration
- Check token not in blacklist
- Attach user to request object
- Return 401 if invalid

---

## Data Models
[Database schemas, data structures, types - include all fields with types and constraints]

### Database Schema

#### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);
```

### TypeScript Interfaces

#### User Model
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}
```

#### User DTO (Data Transfer Object)
```typescript
interface UserDTO {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
}
```

#### Auth Request/Response Types
```typescript
interface RegisterRequest {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: UserDTO;
  expiresIn: number;
}

interface ResetPasswordRequest {
  email: string;
}

interface ConfirmResetRequest {
  token: string;
  newPassword: string;
}
```

### Redis Data Structures

#### Token Blacklist
```
Key: blacklist:{token}
Value: userId
TTL: 24 hours (token expiration)
```

#### Rate Limiting
```
Key: ratelimit:login:{ip}
Value: attempt count
TTL: 60 seconds
```

---

## API Design
[Endpoints, interfaces, contracts - include full request/response examples]

### Base URL
`/api/v1/auth`

### Endpoints

#### POST /register
**Description:** Create new user account
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```
**Response (201):**
```json
{
  "message": "Registration successful. Please check your email.",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```
**Errors:**
- 400: Invalid email format or weak password
- 409: Email already registered

#### POST /login
**Description:** Authenticate user and receive token
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```
**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "emailVerified": true,
    "createdAt": "2026-01-15T10:30:00Z"
  },
  "expiresIn": 86400
}
```
**Errors:**
- 400: Missing email or password
- 401: Invalid credentials
- 429: Too many login attempts

#### POST /logout
**Description:** Invalidate current token
**Headers:** `Authorization: Bearer {token}`
**Response (200):**
```json
{
  "message": "Logout successful"
}
```

#### POST /reset-password
**Description:** Request password reset email
**Request:**
```json
{
  "email": "user@example.com"
}
```
**Response (200):**
```json
{
  "message": "If email exists, reset link has been sent"
}
```

#### POST /reset-password/confirm
**Description:** Complete password reset with token
**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123"
}
```
**Response (200):**
```json
{
  "message": "Password reset successful"
}
```
**Errors:**
- 400: Invalid or expired token
- 400: Weak password

#### GET /verify-email/:token
**Description:** Verify email address
**Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

---

## Integration Points
[How this connects with other systems - be specific about data flow]

### Email Service Integration
**Service:** SendGrid API
**Purpose:** Send verification and password reset emails
**Trigger:** User registration, password reset request
**Data Flow:**
1. Auth service generates verification/reset token
2. Token stored in database with expiration
3. Email service called with template and token
4. User clicks link in email
5. Frontend calls verify/reset endpoint with token

### User Profile Service
**Integration:** Auth token passed in Authorization header
**Data Flow:**
1. User logs in via auth service
2. Receives JWT token
3. Frontend includes token in requests to profile service
4. Profile service validates token (shared secret or public key)
5. Profile service extracts userId from token

### Admin Dashboard
**Integration:** Protected routes using auth middleware
**Data Flow:**
1. Admin logs in, receives token with admin role claim
2. Dashboard routes check for valid token + admin role
3. Middleware validates token and checks role
4. Access granted/denied based on role

**File References:**
#[[file:src/services/email/templates/verification.html]]
#[[file:src/services/email/templates/password-reset.html]]
#[[file:docs/api-gateway-config.yaml]]

---

## Security Considerations
[Authentication, authorization, data protection - specific implementation details]

### Password Security
- Hash with bcrypt, salt rounds: 12
- Minimum length: 8 characters
- Require: 1 uppercase, 1 lowercase, 1 number
- Reject common passwords (use list of 10k most common)
- Never log or display passwords

### Token Security
- JWT signed with HS256 algorithm
- Secret key: 256-bit random string from environment variable
- Token expiration: 24 hours
- Include claims: userId, email, issuedAt, expiresAt
- Blacklist tokens on logout (store in Redis)

### API Security
- Rate limiting: 5 requests/minute per IP for login
- CORS: Whitelist specific origins only
- Helmet.js for security headers
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via input sanitization

### Data Protection
- HTTPS required for all endpoints
- Passwords never stored in plain text
- Sensitive data (tokens) not logged
- Database credentials in environment variables
- Regular security audits and dependency updates

### GDPR Compliance
- User consent for data storage
- Right to data export (future)
- Right to deletion (future)
- Data retention policy: 2 years inactive accounts

---

## Performance Considerations
[Optimization strategies, caching, scaling - with specific metrics]

### Database Optimization
- Index on email column for fast lookups
- Connection pooling: max 20 connections
- Query timeout: 5 seconds
- Use prepared statements for repeated queries

### Caching Strategy
- Redis for token blacklist (in-memory, fast lookup)
- Cache user data after login (TTL: 5 minutes)
- Rate limit counters in Redis (TTL: 60 seconds)

### API Performance
- Response time target: < 2 seconds for login
- Async password hashing (don't block event loop)
- Batch email sending for multiple verifications
- Compression middleware for responses

### Scaling Strategy
- Stateless API (JWT tokens, no server sessions)
- Horizontal scaling: multiple API instances behind load balancer
- Database read replicas for high read load
- Redis cluster for distributed caching

### Monitoring
- Log response times for all endpoints
- Alert if login time > 3 seconds
- Track failed login attempts
- Monitor database connection pool usage

---

## Error Handling
[How errors are caught, logged, and handled - include error codes and messages]

### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

### Error Codes

#### Client Errors (4xx)
- `AUTH_001`: Invalid email format
- `AUTH_002`: Weak password
- `AUTH_003`: Email already registered
- `AUTH_004`: Invalid credentials
- `AUTH_005`: Token expired
- `AUTH_006`: Token invalid
- `AUTH_007`: Rate limit exceeded
- `AUTH_008`: Email not verified

#### Server Errors (5xx)
- `AUTH_500`: Database connection failed
- `AUTH_501`: Email service unavailable
- `AUTH_502`: Token generation failed

### Error Handling Strategy

**Frontend:**
- Display user-friendly error messages
- Log detailed errors to console (dev mode)
- Show generic message for 5xx errors
- Retry logic for network failures (max 3 attempts)

**Backend:**
- Try-catch blocks around all async operations
- Global error handler middleware
- Log errors with context (userId, endpoint, timestamp)
- Never expose stack traces in production
- Send 5xx errors to error tracking service (Sentry)

**Example Error Handler:**
```typescript
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'AUTH_500';
  
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message || 'Internal server error'
    },
    timestamp: new Date().toISOString(),
    path: req.path
  });
});
```

---

## Testing Strategy
[Unit, integration, e2e testing approach - include coverage targets]

### Unit Tests
**Target Coverage:** 80%+
**Tools:** Jest, React Testing Library

**Frontend Tests:**
- Component rendering with different props
- Form validation logic
- Auth context state management
- Error handling in components

**Backend Tests:**
- AuthService methods (token generation, validation)
- Password hashing and comparison
- Input validation functions
- Repository methods (mocked database)

**Example:**
```typescript
describe('AuthService', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'SecurePass123';
    const hash = await authService.hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });
});
```

### Integration Tests
**Target Coverage:** Key user flows
**Tools:** Supertest, Jest

**Test Scenarios:**
- Complete registration flow (POST /register → verify email)
- Login flow (POST /login → receive token)
- Protected route access (with/without valid token)
- Password reset flow (request → confirm)
- Token expiration and refresh

**Example:**
```typescript
describe('POST /api/v1/auth/login', () => {
  it('should return token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'SecurePass123' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

### E2E Tests
**Target Coverage:** Critical paths
**Tools:** Playwright or Cypress

**Test Scenarios:**
- User registers, verifies email, logs in
- User logs in, accesses protected page, logs out
- User forgets password, resets via email, logs in with new password
- Invalid login attempts trigger rate limiting

### Security Tests
- Penetration testing for common vulnerabilities
- SQL injection attempts
- XSS attack vectors
- Brute force login attempts
- Token manipulation attempts

### Performance Tests
**Tools:** Artillery or k6
- Load test: 1000 concurrent users logging in
- Stress test: Gradual increase to find breaking point
- Spike test: Sudden traffic surge
- Target: < 2s response time under normal load

---

## Trade-offs and Decisions
[Key technical decisions and their rationale - document why choices were made]

### Decision 1: JWT vs Session-Based Auth
**Chosen:** JWT (stateless tokens)
**Rationale:**
- ✅ Easier horizontal scaling (no shared session store)
- ✅ Works well with microservices architecture
- ✅ Reduces database queries for auth checks
- ❌ Cannot invalidate tokens without blacklist
- ❌ Larger payload size than session IDs

**Mitigation:** Use Redis blacklist for logout, keep token expiration short (24h)

### Decision 2: bcrypt vs Argon2 for Password Hashing
**Chosen:** bcrypt
**Rationale:**
- ✅ Battle-tested, widely used
- ✅ Good library support in Node.js
- ✅ Team familiarity
- ❌ Argon2 is newer and potentially more secure

**Future:** Consider migrating to Argon2 in next major version

### Decision 3: Email Verification Required vs Optional
**Chosen:** Required
**Rationale:**
- ✅ Prevents fake accounts
- ✅ Ensures valid email for password reset
- ✅ Reduces spam/abuse
- ❌ Adds friction to signup process
- ❌ Requires email service dependency

**Mitigation:** Clear messaging, resend verification option

### Decision 4: Password Strength Requirements
**Chosen:** Min 8 chars, 1 uppercase, 1 number
**Rationale:**
- ✅ Balances security and usability
- ✅ Industry standard
- ❌ More complex rules frustrate users

**Alternative Considered:** Passphrase-based (4+ words) - may implement as option

### Decision 5: Token Storage Location (Frontend)
**Chosen:** localStorage
**Rationale:**
- ✅ Simple implementation
- ✅ Persists across browser sessions
- ❌ Vulnerable to XSS attacks
- ❌ Not accessible from different subdomains

**Mitigation:** Strict CSP headers, input sanitization
**Alternative:** httpOnly cookies (more secure but requires CSRF protection)

### Decision 6: Rate Limiting Strategy
**Chosen:** IP-based with Redis
**Rationale:**
- ✅ Prevents brute force attacks
- ✅ Fast lookup with Redis
- ❌ Can block legitimate users behind shared IP (corporate networks)

**Mitigation:** Higher limit (5/min), clear error message, manual override for support

---

## Deployment Architecture
[How this will be deployed and scaled]

**Environment:**
- Development: Local Docker containers
- Staging: AWS ECS with RDS and ElastiCache
- Production: AWS ECS with Multi-AZ RDS and ElastiCache cluster

**Infrastructure:**
- Load balancer: AWS ALB
- API instances: 2-10 (auto-scaling based on CPU)
- Database: PostgreSQL RDS (Multi-AZ)
- Cache: Redis ElastiCache (cluster mode)
- Email: SendGrid API

**CI/CD:**
- GitHub Actions for automated testing
- Deploy to staging on merge to develop
- Deploy to production on merge to main (with approval)

---

## Monitoring and Observability
[How to monitor system health and debug issues]

**Metrics to Track:**
- Login success/failure rate
- Registration rate
- Token validation time
- Database query time
- Email delivery rate
- API response times (p50, p95, p99)

**Logging:**
- Structured JSON logs
- Log levels: ERROR, WARN, INFO, DEBUG
- Include: timestamp, userId, endpoint, duration, statusCode
- Centralized logging: CloudWatch or ELK stack

**Alerts:**
- Login failure rate > 20%
- API response time > 3s
- Database connection errors
- Email service failures
- Rate limit triggers > 100/min

**Dashboards:**
- Real-time auth metrics
- Error rate trends
- User registration funnel
- Performance metrics
