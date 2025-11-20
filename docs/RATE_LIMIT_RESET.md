# Rate Limit Reset Guide (Development)

When testing authentication, you might encounter rate limit errors like:
- "Too many sign-in attempts for this account. Please try again later."
- "Too many password reset requests. Please try again later."

This guide shows you how to reset rate limits during development.

## Rate Limit Rules

The app has these rate limits to prevent brute-force attacks:

| Action | Limit | Window | Key |
|--------|-------|--------|-----|
| Sign-in (by IP) | 5 attempts | 1 minute | `signin:ip:{ip}` |
| Sign-in (by email) | 3 attempts | 15 minutes | `signin:email:{email}` |
| Password reset | 3 requests | 1 hour | `reset:email:{email}` |
| Sign-up (by IP) | 10 registrations | 1 hour | `signup:ip:{ip}` |

## How to Reset Rate Limits

### Option 1: Use the Dev Auth Page UI (Easiest) ⭐

1. Go to `http://localhost:3000/dev/auth`
2. Click the **"Reset Rate Limits"** button
3. Done! All rate limits are cleared

**Note**: You need to be signed in to access this page. If you're locked out, use Option 2 or 3.

### Option 2: Use the Shell Script

```bash
# Clear all rate limits
./scripts/reset-rate-limit.sh

# Clear rate limit for specific email
./scripts/reset-rate-limit.sh user@example.com
```

### Option 3: Direct API Call with cURL

```bash
# Clear all rate limits
curl -X POST http://localhost:3000/api/auth/dev/reset-rate-limit \
  -H "Content-Type: application/json"

# Clear specific email rate limit
curl -X POST http://localhost:3000/api/auth/dev/reset-rate-limit \
  -H "Content-Type: application/json" \
  -d '{"key": "signin:email:user@example.com"}'

# Clear specific IP rate limit
curl -X POST http://localhost:3000/api/auth/dev/reset-rate-limit \
  -H "Content-Type: application/json" \
  -d '{"key": "signin:ip:127.0.0.1"}'
```

## Common Scenarios

### Scenario 1: Locked Out During Sign-In Testing

**Problem**: Tried wrong password 3 times, now getting "Too many sign-in attempts"

**Solution**:
```bash
./scripts/reset-rate-limit.sh your-email@example.com
```

### Scenario 2: Testing Rate Limit Behavior

**Problem**: Want to test rate limiting without waiting 15 minutes

**Solution**:
1. Trigger the rate limit (try signing in 3+ times with wrong password)
2. Verify you see the error message
3. Run `./scripts/reset-rate-limit.sh`
4. Verify you can sign in again immediately

### Scenario 3: Multiple Test Accounts Blocked

**Problem**: Testing with many accounts and they're all rate-limited

**Solution**:
```bash
# Clear all rate limits at once
./scripts/reset-rate-limit.sh
```

## Rate Limit Storage

**Development**: Rate limits are stored in-memory (cleared on server restart)
**Production**: Should use Redis for distributed rate limiting across multiple servers

To clear rate limits in development, you can also just restart the dev server:
```bash
# Stop the server (Ctrl+C)
# Start it again
bun dev
```

## Testing Rate Limits

To test that rate limiting works correctly:

1. **Test IP-based rate limit**:
   ```bash
   # Try signing in 6 times quickly with wrong password
   # Should see "Too many sign-in attempts" after 5th attempt
   ```

2. **Test email-based rate limit**:
   ```bash
   # Try signing in 4 times with wrong password for same email
   # Should see "Too many sign-in attempts" after 3rd attempt
   ```

3. **Test reset functionality**:
   ```bash
   ./scripts/reset-rate-limit.sh
   # Should be able to sign in again immediately
   ```

## Production Considerations

⚠️ **Important**: The reset endpoint is **disabled in production** for security reasons.

In production:
- Rate limits automatically expire after their window period
- Use Redis for distributed rate limiting
- Monitor rate limit violations in logs
- Consider implementing CAPTCHA for repeated violations

## Troubleshooting

**"This endpoint is only available in development mode"**
- The reset endpoint is disabled in production
- Check that `NODE_ENV=development` in your `.env.local`

**Rate limits not clearing**
- Make sure the dev server is running
- Check that you're hitting the correct endpoint
- Try restarting the dev server (clears in-memory store)

**Still getting rate limit errors after reset**
- Check if you're using the correct email/IP in the reset command
- Try clearing all rate limits: `./scripts/reset-rate-limit.sh`
- Restart the dev server as a last resort
