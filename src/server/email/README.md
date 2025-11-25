# Email Infrastructure

This module provides email sending functionality using Resend API with React-based email templates.

## Overview

The email infrastructure consists of:
- **Client**: Resend API integration for sending emails
- **Templates**: React components for email content
- **Renderer**: Converts React components to HTML strings
- **Queue**: (To be implemented in task 10) Job queue for reliable email delivery

## Environment Variables

Required environment variables (already configured in `src/lib/env.ts`):

```env
RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=noreply@your-domain.com
```

## Usage

### Basic Email Sending

```typescript
import { sendEmail, renderTemplate, getEmailSubject } from '@/server/email';

// Create email template
const template = {
  type: 'verification' as const,
  data: {
    name: 'John Doe',
    verificationUrl: 'https://example.com/verify?token=abc123',
  },
};

// Render template to HTML
const htmlContent = renderTemplate(template);
const subject = getEmailSubject(template);

// Create email job
const job = {
  id: 'job_123',
  userId: 'user_123',
  tokenId: 'token_123',
  type: 'verification' as const,
  to: 'user@example.com',
  subject,
  template,
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date().toISOString(),
  scheduledFor: new Date().toISOString(),
};

// Send email
await sendEmail(job, htmlContent);
```

## Available Templates

### 1. Verification Email

Sent when a user registers for a new account.

```typescript
const template = {
  type: 'verification' as const,
  data: {
    name: 'John Doe',
    verificationUrl: 'https://example.com/verify?token=abc123',
  },
};
```

**Subject**: "Verify your email address - UI SyncUp"

### 2. Password Reset Email

Sent when a user requests to reset their password.

```typescript
const template = {
  type: 'password_reset' as const,
  data: {
    name: 'John Doe',
    resetUrl: 'https://example.com/reset?token=xyz789',
  },
};
```

**Subject**: "Reset your password - UI SyncUp"

### 3. Welcome Email

Sent after a user successfully verifies their email.

```typescript
const template = {
  type: 'welcome' as const,
  data: {
    name: 'John Doe',
    dashboardUrl: 'https://example.com/dashboard',
  },
};
```

**Subject**: "Welcome to UI SyncUp!"

### 4. Security Alert Email

Sent when important security events occur on the account.

```typescript
// Password changed alert
const template = {
  type: 'security_alert' as const,
  data: {
    name: 'John Doe',
    alertType: 'password_changed' as const,
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.1',
  },
};

// New sign-in alert
const template = {
  type: 'security_alert' as const,
  data: {
    name: 'John Doe',
    alertType: 'new_signin' as const,
    timestamp: new Date().toISOString(),
    ipAddress: '10.0.0.1',
    location: 'San Francisco, CA',
    device: 'Chrome on macOS',
  },
};

// Suspicious activity alert
const template = {
  type: 'security_alert' as const,
  data: {
    name: 'John Doe',
    alertType: 'suspicious_activity' as const,
    timestamp: new Date().toISOString(),
    actionUrl: 'https://example.com/security',
  },
};
```

**Subjects**:
- "Your password was changed - UI SyncUp"
- "New sign-in to your account - UI SyncUp"
- "Security alert for your account - UI SyncUp"

## Template Structure

All email templates follow a consistent structure:

1. **HTML wrapper** with proper meta tags
2. **Container div** with background color and padding
3. **Header** with title and branding
4. **Body content** with clear messaging
5. **Call-to-action button** (when applicable)
6. **Additional information** and security tips
7. **Footer** with branding and legal text

## Error Handling

The `sendEmail` function includes comprehensive error handling:

- Logs all email sending attempts
- Logs successful deliveries with email ID
- Logs failures with error details
- Throws errors for retry logic (to be implemented in queue)

## Testing

Run tests with:

```bash
bun test src/server/email/__tests__/render-template.test.tsx --run
```

Tests cover:
- Template rendering for all email types
- Subject generation for all email types
- Content verification (names, URLs, etc.)

## Future Enhancements (Task 10)

The email queue system will add:
- **Idempotent job submission** (userId + tokenId)
- **Retry logic** with exponential backoff (30s, 5m, 30m)
- **Background worker** for processing queue
- **Failure logging** and alerting after max retries
- **Job status tracking** (pending, sent, failed)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Route Handler                     │
│  (e.g., POST /api/auth/signup)                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Email Queue (Task 10)                       │
│  - Enqueue job with template data                       │
│  - Idempotency check (userId + tokenId)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Background Worker (Task 10)                 │
│  - Process jobs from queue                              │
│  - Retry logic with exponential backoff                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              renderTemplate()                            │
│  - Convert React component to HTML string               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              sendEmail()                                 │
│  - Send via Resend API                                  │
│  - Log success/failure                                  │
└─────────────────────────────────────────────────────────┘
```

## Security Considerations

- Never log email content or tokens
- Use HTTPS for all verification/reset URLs
- Set appropriate token expiration times
- Include security tips in all emails
- Use consistent branding to prevent phishing

## Resend Configuration

- **Free tier**: 100 emails/day, 3,000 emails/month
- **Paid tier**: 100 emails/second
- **Rate limiting**: Implement exponential backoff for rate limit errors
- **Webhooks**: Can be configured for delivery tracking (future enhancement)

## Related Files

- `src/lib/env.ts` - Environment variable validation
- `src/lib/logger.ts` - Logging utility
- `src/server/email/client.ts` - Resend client and sendEmail function
- `src/server/email/render-template.tsx` - Template renderer
- `src/server/email/templates/` - Email template components
- `.env.example` - Environment variable documentation
