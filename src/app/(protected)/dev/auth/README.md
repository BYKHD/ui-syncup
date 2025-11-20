# Dev Auth Testing Page

**Location:** `/dev/auth` (protected route)

## Purpose

This page provides a comprehensive testing dashboard for the authentication system during development. It allows developers to test and verify authentication features without going through the full email verification flow or setting up multiple devices.

## Features

### 1. User Information Display
- User ID, email, name
- Email verification status (verified/unverified badge)
- Quick copy buttons for user ID and email

### 2. Session Information
- Current session expiration time
- Time remaining until expiration
- Session details (IP address, user agent)

### 3. Active Sessions List
- View all active sessions across devices
- See which session is current
- Monitor session creation and expiration times
- Refresh sessions list on demand

### 4. User Roles Display
- View all assigned roles (TEAM_*, PROJECT_*)
- See resource type and resource ID for each role
- Useful for testing RBAC integration

### 5. Testing Actions

#### Sign Out (Current Device)
- Signs out from the current session only
- Other sessions remain active
- Tests single-device sign-out behavior

#### Force Verify Email
- Bypasses email verification flow
- Immediately marks email as verified
- Only available for unverified accounts
- Only works in development mode

#### Invalidate Session Cache
- Clears React Query cache for session data
- Forces refetch from server
- Tests cache invalidation behavior

#### Copy User ID / Email
- Quick clipboard copy for testing
- Useful for database queries or API testing

#### Refresh Sessions
- Refetches active sessions list
- Tests multi-device session tracking

#### Delete Account (Irreversible)
- Permanently deletes user account
- Removes all associated data:
  - All sessions (all devices)
  - All verification tokens
  - All user roles
  - User record
- Redirects to sign-in page
- Tests cleanup and cascade deletion

## Testing Scenarios

### 1. Email Verification Flow
1. Sign up with a new account (email will be unverified)
2. Navigate to `/dev/auth`
3. Verify "Unverified" badge is shown
4. Click "Force Verify Email"
5. Refresh page to see "Verified" badge

### 2. Multi-Device Sessions
1. Sign in from multiple browsers/devices
2. Navigate to `/dev/auth` on any device
3. Check "Active Sessions" section
4. Verify all sessions are listed
5. Sign out from one device
6. Refresh sessions list
7. Verify session count decreased by 1
8. Verify other sessions still active

### 3. Session Cache Invalidation
1. Navigate to `/dev/auth`
2. Note current session data
3. Click "Invalidate Session Cache"
4. Verify session data refetches
5. Verify data remains consistent

### 4. Account Deletion
1. Navigate to `/dev/auth`
2. Click "Delete Account"
3. Confirm deletion in dialog
4. Verify redirect to sign-in page
5. Attempt to sign in with deleted credentials
6. Verify sign-in fails (account not found)

### 5. Session Expiration
1. Navigate to `/dev/auth`
2. Check "Time Remaining" in Session Information
3. Note expiration time (7 days by default)
4. Make requests to trigger rolling renewal
5. Refresh page and verify expiration extended

## API Endpoints Used

- `GET /api/auth/me` - Fetch current session
- `POST /api/auth/logout` - Sign out
- `POST /api/auth/dev/force-verify` - Force email verification (dev only)
- `GET /api/auth/dev/sessions` - List all sessions (dev only)
- `DELETE /api/auth/delete-account` - Delete account (dev only)

## Security Notes

⚠️ **Development Only**

This page and its associated endpoints are intended for development and testing only:

- Force verify bypasses email verification security
- Session listing exposes session details
- Account deletion is irreversible

In production:
- This page should be removed or protected behind admin authentication
- Force verify endpoint should be disabled
- Session listing should be restricted
- Account deletion should require additional verification

## Removal Plan

This page is temporary and should be removed when other features are implemented:

1. Remove `/src/app/(protected)/dev/auth/` directory
2. Remove `/src/app/api/auth/dev/` directory
3. Remove dev-only hooks:
   - `use-force-verify.ts`
   - `use-sessions.ts`
   - `use-delete-account.ts` (or move to user settings)
4. Update logger to remove dev event types (optional)

## Related Files

- Page: `src/app/(protected)/dev/auth/page.tsx`
- Hooks: `src/features/auth/hooks/use-{sessions,force-verify,delete-account}.ts`
- API Routes: `src/app/api/auth/dev/{force-verify,sessions}/route.ts`
- API Route: `src/app/api/auth/delete-account/route.ts`
- Logger: `src/lib/logger.ts` (auth event types)
