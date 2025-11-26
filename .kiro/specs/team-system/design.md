# Design Document

## Overview

The Team Management system provides organizational structure for UI SyncUp, enabling users to create teams, manage members with a two-tier role hierarchy, and collaborate on projects. Built on PostgreSQL with Drizzle ORM, it integrates seamlessly with the existing authentication system, RBAC framework, and plan-based billing model.

The architecture follows a layered approach:
- **Transport layer**: API routes in `app/api/teams/*` handle HTTP requests/responses
- **Service layer**: Server-side logic in `server/teams/*` manages team operations, invitations, and member management
- **Data layer**: Database schema in `server/db/schema/` with Drizzle ORM
- **Client layer**: React hooks in `features/teams/hooks/` provide typed access to team state

Key design principles:
- **Two-tier role system**: Management roles (OWNER/ADMIN) control settings; operational roles (EDITOR/MEMBER/VIEWER) determine billing
- **Soft deletes**: Teams are soft-deleted with 30-day retention for recovery
- **Plan enforcement**: Free plan limits enforced at API layer before operations
- **Invitation-based onboarding**: Users join teams via time-limited invitation tokens
- **Context persistence**: Last active team stored in database and cookie for seamless experience

## Architecture

### System Components

The system consists of four main layers:

1. **Client Layer** (`features/teams/`)
   - React components for member management, settings
   - Onboarding screen for team creation (reuses auth onboarding components)
   - React Query hooks for team state management
   - Client-side validation with Zod schemas

2. **API Layer** (`app/api/teams/`)
   - Route handlers for team endpoints
   - Input validation and rate limiting
   - HTTP response formatting

3. **Service Layer** (`server/teams/`)
   - Team CRUD operations
   - Invitation management (create, resend, cancel, accept)
   - Member management (add, remove, update roles)
   - Plan limit enforcement
   - Slug generation and uniqueness

4. **Data Layer** (`server/db/`)
   - PostgreSQL database with Drizzle ORM
   - Tables: teams, team_members, team_invitations
   - Indexes for efficient lookups

### Data Flow Examples

**Team Creation Flow:**
1. User submits team name and description via onboarding page (`/onboarding`)
2. `POST /api/teams` validates with Zod, generates unique slug
3. Creates team record with plan="free"
4. Assigns creator as TEAM_OWNER + TEAM_EDITOR
5. Sets team as user's lastActiveTeamId
6. Returns team data, client caches in React Query
7. Redirects to projects page with new team context

**Invitation Flow:**
1. Team owner/admin sends invitation with email and roles
2. `POST /api/teams/:teamId/invitations` validates roles and plan limits
3. Generates signed invitation token (7-day expiration)
4. Enqueues invitation email with unique link
5. User clicks link: `GET /api/teams/invitations/:token/accept`
6. Validates token, adds user to team with roles
7. Marks invitation as used, notifies inviter

**Team Switching Flow:**
1. User selects team from switcher
2. `POST /api/teams/:teamId/switch` validates access
3. Updates user.lastActiveTeamId in database
4. Sets team_id cookie
5. Invalidates cached team data
6. Reloads page with new team context

**Member Role Update Flow:**
1. Team owner/admin updates member's operational role
2. `PATCH /api/teams/:teamId/members/:userId` validates permissions
3. Checks if demotion from TEAM_EDITOR (checks project ownership)
4. Updates role assignments in database
5. Recalculates billable seats
6. Logs role change event
7. Returns updated member data

**Team Deletion Flow:**
1. Team owner initiates deletion (requires re-auth)
2. `DELETE /api/teams/:teamId` validates ownership
3. Offers data export option
4. Soft-deletes team (sets deletedAt timestamp)
5. Hides team from all interfaces
6. Schedules permanent deletion after 30 days
7. Redirects user to onboarding

## Components and Interfaces

### Onboarding Integration

The team creation experience is integrated into the existing onboarding flow rather than using a modal dialog. This approach:

- **Reuses existing components**: Leverages `OnboardingForm` and `PlanSelector` from `features/auth/components`
- **Consistent UX**: Maintains the same full-page onboarding experience users see during initial signup
- **Simplified state management**: Avoids modal state complexity and dialog z-index issues
- **Better mobile experience**: Full-page layout works better on mobile devices than modals
- **Component reusability**: The onboarding page at `/onboarding` serves both initial signup and subsequent team creation

**Onboarding Page Structure:**
```typescript
// app/(protected)/onboarding/page.tsx
// Handles both initial user onboarding and team creation
// Checks if user has teams:
//   - No teams: Show plan selector + team creation form
//   - Has teams: Redirect to last active team or team switcher
```

**Shared Components:**
- `OnboardingForm`: Team name, description input (from `features/auth/components`)
- `PlanSelector`: Free/Pro plan selection (from `features/auth/components`)
- Form validation and submission logic reused across auth and team features

### Database Schema

**teams table:**
```typescript
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull(),
  description: text("description"),
  image: text("image"),
  planId: varchar("plan_id", { length: 20 }).notNull().default("free"),
  billableSeats: integer("billable_seats").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  // Partial unique index: only enforce uniqueness for non-deleted teams
  slugUniqueIdx: uniqueIndex("teams_slug_unique_idx").on(table.slug).where(sql`deleted_at IS NULL`),
  slugIdx: index("teams_slug_idx").on(table.slug),
  planIdx: index("teams_plan_idx").on(table.planId),
}));
```

**Note on Slug Uniqueness:** The partial unique index ensures that only active (non-deleted) teams must have unique slugs. This allows slug reuse after a team is soft-deleted, preventing the 30-day retention period from blocking new teams with the same name.

**team_members table:**
```typescript
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  managementRole: varchar("management_role", { length: 20 }), // TEAM_OWNER | TEAM_ADMIN | null
  operationalRole: varchar("operational_role", { length: 20 }).notNull(), // TEAM_EDITOR | TEAM_MEMBER | TEAM_VIEWER
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  invitedBy: uuid("invited_by").references(() => users.id),
}, (table) => ({
  teamUserIdx: uniqueIndex("team_members_team_user_idx").on(table.teamId, table.userId),
  userIdx: index("team_members_user_idx").on(table.userId),
  teamIdx: index("team_members_team_idx").on(table.teamId),
}));
```

**team_invitations table:**
```typescript
export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 hash of token
  managementRole: varchar("management_role", { length: 20 }), // TEAM_OWNER | TEAM_ADMIN | null
  operationalRole: varchar("operational_role", { length: 20 }).notNull(), // TEAM_EDITOR | TEAM_MEMBER | TEAM_VIEWER
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: uniqueIndex("team_invitations_token_hash_idx").on(table.tokenHash),
  teamEmailIdx: index("team_invitations_team_email_idx").on(table.teamId, table.email),
  expiresIdx: index("team_invitations_expires_idx").on(table.expiresAt),
}));
```

**Security Note on Invitation Tokens:** The database stores only a SHA-256 hash of the invitation token (not the raw token). The raw token is sent in the invitation email. When a user accepts an invitation, the system hashes the provided token and looks up the matching hash. This prevents token theft if the database is compromised.

**users table (updated):**
```typescript
export const users = pgTable("users", {
  // ... existing fields
  lastActiveTeamId: uuid("last_active_team_id").references(() => teams.id, { onDelete: "set null" }),
});
```

### API Endpoints

**POST /api/teams**
- Request: `{ name, description? }`
- Response: `{ team: { id, name, slug, planId, ... } }`
- Errors: 400 (validation), 409 (duplicate slug), 401 (not authenticated)

**GET /api/teams**
- Request: none (uses session)
- Response: `{ teams: [{ id, name, slug, planId, memberCount, role }], pagination }`
- Errors: 401 (not authenticated)

**GET /api/teams/:teamId**
- Request: none (uses session)
- Response: `{ team: { id, name, slug, description, image, planId, billableSeats, memberCount, createdAt } }`
- Errors: 401 (not authenticated), 403 (no access), 404 (not found)

**PATCH /api/teams/:teamId**
- Request: `{ name?, description?, image? }`
- Response: `{ team: { id, name, slug, ... } }`
- Errors: 400 (validation), 401 (not authenticated), 403 (not owner/admin), 404 (not found)

**DELETE /api/teams/:teamId**
- Request: none (requires re-auth)
- Response: `{ message: "Team deleted successfully" }`
- Errors: 401 (not authenticated), 403 (not owner), 404 (not found)

**POST /api/teams/:teamId/switch**
- Request: none
- Response: `{ team: { id, name, slug, planId } }`
- Errors: 401 (not authenticated), 403 (no access), 404 (not found)

**GET /api/teams/:teamId/members**
- Request: query params for pagination
- Response: `{ members: [{ id, userId, name, email, managementRole, operationalRole, joinedAt }], pagination }`
- Errors: 401 (not authenticated), 403 (no access), 404 (not found)

**PATCH /api/teams/:teamId/members/:userId**
- Request: `{ managementRole?, operationalRole? }`
- Response: `{ member: { id, userId, managementRole, operationalRole } }`
- Errors: 400 (validation), 401 (not authenticated), 403 (insufficient permissions), 404 (not found), 409 (project ownership conflict)

**DELETE /api/teams/:teamId/members/:userId**
- Request: none
- Response: `{ message: "Member removed successfully" }`
- Errors: 401 (not authenticated), 403 (insufficient permissions), 404 (not found), 409 (project ownership conflict, member owns projects)

**POST /api/teams/:teamId/invitations**
- Request: `{ email, managementRole?, operationalRole }`
- Response: `{ invitation: { id, email, roles, expiresAt } }`
- Errors: 400 (validation), 401 (not authenticated), 403 (not owner/admin), 409 (already member), 429 (rate limit)

**GET /api/teams/:teamId/invitations**
- Request: query params for pagination
- Response: `{ invitations: [{ id, email, roles, invitedBy, expiresAt, status }], pagination }`
- Errors: 401 (not authenticated), 403 (not owner/admin), 404 (not found)

**POST /api/teams/:teamId/invitations/:invitationId/resend**
- Request: none
- Response: `{ invitation: { id, email, expiresAt } }`
- Errors: 401 (not authenticated), 403 (not owner/admin), 404 (not found), 410 (already used/cancelled)

**DELETE /api/teams/:teamId/invitations/:invitationId**
- Request: none
- Response: `{ message: "Invitation cancelled successfully" }`
- Errors: 401 (not authenticated), 403 (not owner/admin), 404 (not found)

**GET /api/teams/invitations/:token/accept**
- Request: none (token in URL)
- Response: Redirects to team page
- Errors: 400 (invalid token), 410 (expired/used/cancelled), 409 (already member)

**POST /api/teams/:teamId/export**
- Request: none
- Response: `{ message: "Export queued", jobId }`
- Errors: 401 (not authenticated), 403 (not owner), 404 (not found), 429 (rate limit)

## Data Models

### Team
```typescript
interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  planId: 'free' | 'pro';
  billableSeats: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### TeamMember
```typescript
interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  managementRole: 'TEAM_OWNER' | 'TEAM_ADMIN' | null;
  operationalRole: 'TEAM_EDITOR' | 'TEAM_MEMBER' | 'TEAM_VIEWER';
  joinedAt: string;
  invitedBy: string | null;
}
```

### TeamInvitation
```typescript
interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  token: string;
  managementRole: 'TEAM_OWNER' | 'TEAM_ADMIN' | null;
  operationalRole: 'TEAM_EDITOR' | 'TEAM_MEMBER' | 'TEAM_VIEWER';
  invitedBy: string;
  expiresAt: string;
  usedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}
```

### TeamWithMemberInfo
```typescript
interface TeamWithMemberInfo extends Team {
  memberCount: number;
  myManagementRole: 'TEAM_OWNER' | 'TEAM_ADMIN' | null;
  myOperationalRole: 'TEAM_EDITOR' | 'TEAM_MEMBER' | 'TEAM_VIEWER';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Team creation assigns correct roles
*For any* valid team creation data (name, description), creating a team should result in the creator being assigned both TEAM_OWNER and TEAM_EDITOR roles.
**Validates: Requirements 1.1**

### Property 2: Slug generation produces URL-friendly unique slugs
*For any* team name (including special characters), the generated slug should contain only lowercase letters, numbers, and hyphens, and be unique across all teams.
**Validates: Requirements 1.2, 13.2**

### Property 3: New teams get free plan
*For any* team creation, the team should be assigned the "free" plan with appropriate limits.
**Validates: Requirements 1.3**

### Property 4: Duplicate slug names get numeric suffixes
*For any* team name that generates a duplicate slug, the system should append a numeric suffix to ensure uniqueness.
**Validates: Requirements 1.4**

### Property 5: Team creation is logged
*For any* team creation, a log entry should be created containing team ID, creator ID, and timestamp.
**Validates: Requirements 1.5, 14.1**

### Property 6: Invitations have 7-day expiration
*For any* invitation created by TEAM_OWNER or TEAM_ADMIN, the invitation token should have an expiration date exactly 7 days in the future.
**Validates: Requirements 2.1**

### Property 7: Invitation acceptance adds user with correct roles
*For any* valid invitation token, accepting it should add the user to the team with the pre-assigned management and operational roles.
**Validates: Requirements 2.3**

### Property 8: Accepted invitations are marked used
*For any* invitation acceptance, the invitation should be marked as used, logged, and trigger a notification to the inviter.
**Validates: Requirements 2.4**

### Property 9: Invalid invitations are rejected
*For any* expired or already-used invitation token, acceptance attempts should be rejected with an appropriate error.
**Validates: Requirements 2.5**

### Property 10: Invitation resend invalidates old token
*For any* invitation resend, the old token should become invalid and a new token with extended expiration should be created.
**Validates: Requirements 2A.2**

### Property 11: Cancelled invitations cannot be used
*For any* cancelled invitation, attempts to accept it should be rejected.
**Validates: Requirements 2A.3**

### Property 12: Invitation rate limiting enforced
*For any* team, sending more than 10 invitations within an hour should be blocked.
**Validates: Requirements 2A.5**

### Property 13: Management roles require operational roles
*For any* role assignment with a management role (TEAM_OWNER, TEAM_ADMIN), an operational role must be assigned simultaneously or the operation should be rejected.
**Validates: Requirements 3.1, 13.3**

### Property 14: TEAM_EDITOR assignment increments billable seats
*For any* member role change to TEAM_EDITOR, the team's billable seat count should increase by 1 (if not already TEAM_EDITOR).
**Validates: Requirements 3.2**

### Property 15: Demotion blocked when projects owned
*For any* member who owns projects, attempting to demote them from TEAM_EDITOR should be blocked with an error listing owned projects.
**Validates: Requirements 3.3, 15.3**

### Property 16: Member removal blocked when projects owned
*For any* member who owns projects, attempting to remove them should be blocked with an error listing owned projects.
**Validates: Requirements 3.4**

### Property 17: Role changes recalculate billable seats
*For any* role change, the team's billable seat count should be recalculated to reflect the current number of TEAM_EDITOR members.
**Validates: Requirements 3.5**

### Property 18: Name changes regenerate slug
*For any* team name update that changes the name significantly, a new slug should be generated.
**Validates: Requirements 4.1**

### Property 19: Setting updates are logged with old and new values
*For any* team setting update, a log entry should be created containing the changed fields, old values, and new values.
**Validates: Requirements 4.5, 14.3**

### Property 20: Team deletion is soft delete
*For any* team deletion, the team should be soft-deleted (deletedAt timestamp set) rather than permanently deleted.
**Validates: Requirements 5.2**

### Property 21: Soft-deleted teams are hidden
*For any* soft-deleted team, it should not appear in team lists and access attempts should be denied.
**Validates: Requirements 5.3**

### Property 22: Data export generates complete JSON
*For any* team, requesting data export should generate a JSON file containing all team data, projects, issues, and annotations.
**Validates: Requirements 5A.2**

### Property 23: Export rate limiting enforced
*For any* team, requesting more than 1 export within 24 hours should be blocked.
**Validates: Requirements 5A.5**

### Property 24: Ownership transfer updates roles correctly
*For any* ownership transfer, the new owner should receive TEAM_OWNER role and the old owner should be demoted to TEAM_ADMIN.
**Validates: Requirements 6.2**

### Property 25: Ownership transfer sends notifications
*For any* ownership transfer, notification emails should be queued for both the old and new owners.
**Validates: Requirements 6.3**

### Property 26: Ownership transfer to non-member rejected
*For any* ownership transfer attempt to a user who is not a team member, the operation should be rejected.
**Validates: Requirements 6.4**

### Property 27: Ownership transfer is logged
*For any* ownership transfer, a log entry should be created containing old owner ID, new owner ID, and timestamp.
**Validates: Requirements 6.5, 14.4**

### Property 28: Team admin can invite with operational roles
*For any* user with TEAM_ADMIN role, they should be able to create invitations with any operational role.
**Validates: Requirements 7.1**

### Property 29: Team admin cannot assign TEAM_OWNER
*For any* user with TEAM_ADMIN role, attempting to assign TEAM_OWNER role should be rejected.
**Validates: Requirements 7.2**

### Property 30: Team admin cannot remove owner
*For any* user with TEAM_ADMIN role, attempting to remove the team owner should be rejected.
**Validates: Requirements 7.3**

### Property 31: Team admin cannot change management roles
*For any* user with TEAM_ADMIN role, attempting to change management roles should be rejected.
**Validates: Requirements 7.4**

### Property 32: Admin actions are logged
*For any* member management action by TEAM_ADMIN, a log entry should be created with admin ID and affected member ID.
**Validates: Requirements 7.5**

### Property 33: Member list includes all members with required fields
*For any* team, fetching the member list should return all members with their management role, operational role, and join date.
**Validates: Requirements 8.2**

### Property 34: Settings access denied without permission
*For any* user without TEAM_OWNER or TEAM_ADMIN role, attempting to access team settings should be denied and redirected.
**Validates: Requirements 8.4**

### Property 35: Team switching updates database and cookie
*For any* team switch, both the database (user.lastActiveTeamId) and cookie should be updated with the new team ID.
**Validates: Requirements 9.2, 9.3**

### Property 36: Last active team loads from database first
*For any* user accessing the application, the last active team should be loaded from the database, falling back to cookie if database is unavailable.
**Validates: Requirements 9.4**

### Property 37: Deleted active team triggers auto-switch
*For any* user whose last active team is deleted, they should be automatically switched to their first available team or redirected to onboarding.
**Validates: Requirements 9A.1**

### Property 38: Lost access triggers auto-switch
*For any* user who loses access to their last active team, they should be automatically switched to their first available team.
**Validates: Requirements 9A.2**

### Property 39: Database wins cookie conflicts
*For any* mismatch between cookie and database for last active team, the database value should be used and the cookie updated.
**Validates: Requirements 9A.3**

### Property 40: Invalid team access shows error and redirects
*For any* attempt to access a team without permission, an error message should be displayed and the user redirected to team switcher.
**Validates: Requirements 9A.4**

### Property 41: Free plan member limit enforced
*For any* team on the free plan, attempting to add an 11th member should be rejected with a specific error code.
**Validates: Requirements 10.1, 10.5**

### Property 42: Cache invalidation on team changes
*For any* team data change (name, members, settings), cached team data should be invalidated and trigger re-fetch.
**Validates: Requirements 12.2**

### Property 43: API responses match Zod schemas
*For any* team API call, the response should validate against the defined Zod schema.
**Validates: Requirements 12.3, 12.5**

### Property 44: Permission hooks return correct booleans
*For any* permission check, the hook should return a boolean based on the user's roles and the required permission.
**Validates: Requirements 12.4**

### Property 45: Pagination returns consistent page sizes
*For any* paginated team list API call, the response should return the requested page size with cursor-based navigation.
**Validates: Requirements 12A.1**

### Property 46: API errors have standardized shape
*For any* team API error, the response should include error code, message, and field-specific validation errors in a standardized format.
**Validates: Requirements 12A.4**

### Property 47: Team name validation enforced
*For any* team name, validation should ensure it is between 2 and 50 characters and contains only allowed characters.
**Validates: Requirements 13.1**

### Property 48: Billable seats count only TEAM_EDITOR
*For any* team, the billable seat count should equal the number of unique users with TEAM_EDITOR operational role.
**Validates: Requirements 13.4**

### Property 49: Zod validation returns field-specific errors
*For any* invalid team operation input, Zod validation should return field-specific error messages.
**Validates: Requirements 13.5**

### Property 50: Member changes are logged
*For any* member addition or removal, a log entry should be created with member ID, roles, and actor ID.
**Validates: Requirements 14.2**

### Property 51: Operation failures are logged with context
*For any* failed team operation, a log entry should be created with user ID, team ID, and error details.
**Validates: Requirements 14.5**

### Property 52: Leaving removes all team roles
*For any* member who leaves a team, all their team-level role assignments should be removed.
**Validates: Requirements 15.2**

### Property 53: Owner cannot leave without transfer
*For any* team owner attempting to leave, the operation should be blocked until ownership is transferred.
**Validates: Requirements 15.4**

### Property 54: Leaving is logged and notifies admins
*For any* member leaving a team, a log entry should be created and notifications sent to team admins.
**Validates: Requirements 15.5**

### Property 55: Onboarding page redirects verified users
*For any* user who completes email verification without an invitation, they should be redirected to `/onboarding`.
**Validates: Requirements 16.1**

### Property 56: Existing users can create teams via onboarding
*For any* existing user navigating to create a new team, they should be redirected to `/onboarding` and see the same interface as initial onboarding.
**Validates: Requirements 17.1, 17.2**

### Property 57: Team creation switches active team
*For any* user creating a team through onboarding, the new team should automatically become their active team.
**Validates: Requirements 17.3**

### Property 58: Onboarding completion redirects to projects
*For any* user completing team creation through onboarding, they should be redirected to the projects page with the new team context.
**Validates: Requirements 17.4**

## Error Handling

### Error Categories

**Validation Errors (400)**
- Invalid team name (too short, too long, invalid characters)
- Invalid email format for invitations
- Invalid role combinations (management without operational)
- Missing required fields
- Malformed request body

**Authentication Errors (401)**
- Not authenticated
- Session expired or invalid
- Missing authentication cookie

**Authorization Errors (403)**
- Insufficient permissions for operation
- Not a team owner/admin
- Cannot modify team owner
- Cannot access team settings

**Not Found Errors (404)**
- Team not found
- Member not found
- Invitation not found

**Conflict Errors (409)**
- Duplicate team slug
- User already a team member
- Member owns projects (cannot demote/remove)
- Invitation already used

**Gone Errors (410)**
- Invitation expired
- Invitation cancelled
- Team soft-deleted

**Limit Errors (422)**
- Plan limit reached (members, projects, issues)
- Cannot add more billable seats on free plan

**Rate Limit Errors (429)**
- Too many invitations sent
- Too many export requests

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

### Error Codes

```typescript
// Validation errors
INVALID_TEAM_NAME = "INVALID_TEAM_NAME"
INVALID_EMAIL = "INVALID_EMAIL"
INVALID_ROLE_COMBINATION = "INVALID_ROLE_COMBINATION"
MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"

// Authorization errors
INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
NOT_TEAM_OWNER = "NOT_TEAM_OWNER"
NOT_TEAM_ADMIN = "NOT_TEAM_ADMIN"
CANNOT_MODIFY_OWNER = "CANNOT_MODIFY_OWNER"

// Conflict errors
DUPLICATE_TEAM_SLUG = "DUPLICATE_TEAM_SLUG"
ALREADY_TEAM_MEMBER = "ALREADY_TEAM_MEMBER"
MEMBER_OWNS_PROJECTS = "MEMBER_OWNS_PROJECTS"
INVITATION_ALREADY_USED = "INVITATION_ALREADY_USED"

// Limit errors
PLAN_LIMIT_MEMBERS = "PLAN_LIMIT_MEMBERS"
PLAN_LIMIT_PROJECTS = "PLAN_LIMIT_PROJECTS"
PLAN_LIMIT_ISSUES = "PLAN_LIMIT_ISSUES"

// Rate limit errors
RATE_LIMIT_INVITATIONS = "RATE_LIMIT_INVITATIONS"
RATE_LIMIT_EXPORTS = "RATE_LIMIT_EXPORTS"

// Gone errors
INVITATION_EXPIRED = "INVITATION_EXPIRED"
INVITATION_CANCELLED = "INVITATION_CANCELLED"
TEAM_DELETED = "TEAM_DELETED"
```

### Security Considerations

- Never reveal team existence to unauthorized users
- Use generic error messages for authorization failures
- Log all security-relevant errors with context
- Rate limit all mutation endpoints

## Testing Strategy

### Unit Testing

**Validation Logic:**
- Test Zod schemas with valid and invalid inputs
- Test team name validation
- Test slug generation with edge cases
- Test role combination validation

**Utility Functions:**
- Test slug generation and uniqueness
- Test billable seat calculation
- Test plan limit checking
- Test role validation

**RBAC Integration:**
- Test permission checks for team operations
- Test role hierarchy enforcement
- Test management + operational role pairing

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
// Generate valid team names
const teamNameArb = fc.string({ minLength: 2, maxLength: 50 })
  .filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s));

// Generate team descriptions
const teamDescriptionArb = fc.option(fc.string({ maxLength: 500 }));

// Generate team creation data
const teamDataArb = fc.record({
  name: teamNameArb,
  description: teamDescriptionArb,
});

// Generate role combinations
const managementRoleArb = fc.option(fc.constantFrom('TEAM_OWNER', 'TEAM_ADMIN'));
const operationalRoleArb = fc.constantFrom('TEAM_EDITOR', 'TEAM_MEMBER', 'TEAM_VIEWER');

const roleAssignmentArb = fc.record({
  managementRole: managementRoleArb,
  operationalRole: operationalRoleArb,
});

// Generate UUIDs
const uuidArb = fc.uuid();

// Generate emails
const emailArb = fc.emailAddress();
```

**Property Test Structure:**

Each property test should:
1. Generate random valid inputs
2. Execute the operation
3. Assert the property holds
4. Clean up test data

Example:
```typescript
test('Property 1: Team creation assigns correct roles', () => {
  fc.assert(
    fc.asyncProperty(teamDataArb, async (data) => {
      // Create team
      const team = await createTeam(data, userId);
      
      // Verify creator has both roles
      const roles = await getTeamMemberRoles(team.id, userId);
      expect(roles.managementRole).toBe('TEAM_OWNER');
      expect(roles.operationalRole).toBe('TEAM_EDITOR');
      
      // Cleanup
      await deleteTeam(team.id);
    }),
    propertyConfig
  );
});
```

### Integration Testing

**API Endpoint Tests:**
- Test complete team creation flow
- Test invitation flow (create, send, accept)
- Test member management (add, update roles, remove)
- Test team switching
- Test plan limit enforcement
- Test rate limiting behavior

**Database Tests:**
- Test team CRUD operations
- Test member CRUD operations
- Test invitation CRUD operations
- Test soft delete behavior
- Test concurrent operations

**RBAC Integration:**
- Test permission enforcement on all endpoints
- Test role-based access control
- Test management + operational role pairing

### End-to-End Testing (Playwright)

**Critical User Flows:**
1. New user onboarding → team creation → projects page
2. Team owner invites member → member accepts → member joins team
3. Team owner updates member roles → billable seats recalculated
4. User switches teams → context updated → page reloads
5. Team owner deletes team → soft delete → data hidden
6. User with multiple teams → last active team persisted → returns to same team

**Test Scenarios:**
- Happy path: Complete onboarding and team creation
- Error path: Invalid team names, duplicate slugs
- Security: Unauthorized access attempts, permission checks
- Concurrency: Multiple simultaneous team operations

### Test Data Management

**Fixtures:**
- Create reusable test teams with known data
- Generate test members with various role combinations
- Create test invitations (valid, expired, used)

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
  
  async sendEmail(job: EmailJob): Promise<void> {
    this.sentEmails.push(job);
  }
  
  getSentEmails(): EmailJob[] {
    return this.sentEmails;
  }
  
  getLastEmail(): EmailJob | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }
  
  reset(): void {
    this.sentEmails = [];
  }
}

// Usage in tests
beforeEach(() => {
  mockEmailService.reset();
});

test('invitation sends email', async () => {
  await createInvitation({ teamId, email: 'test@example.com', roles });
  
  const email = mockEmailService.getLastEmail();
  expect(email).toBeDefined();
  expect(email.type).toBe('team_invitation');
  expect(email.to).toBe('test@example.com');
});
```

## Observability and Logging

### Structured Log Schema

All team events follow a consistent schema:

```typescript
interface TeamLogEvent {
  // Event identification
  eventId: string;           // Unique event ID (UUID)
  eventType: string;         // 'team.create' | 'team.update' | etc.
  timestamp: string;         // ISO 8601 timestamp
  
  // User context
  userId: string;            // User performing the action
  actorRole?: string;        // Actor's role in the team
  
  // Team context
  teamId: string;            // Team ID
  teamName?: string;         // Team name
  
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

### Event Types

```typescript
// Team events
'team.create.success'          // Team created
'team.create.failure'          // Team creation failed
'team.update.success'          // Team settings updated
'team.delete.success'          // Team soft-deleted
'team.export.requested'        // Data export requested

// Member events
'team.member.add.success'      // Member added
'team.member.remove.success'   // Member removed
'team.member.role_change.success'  // Member role changed
'team.member.leave.success'    // Member left team

// Invitation events
'team.invitation.create.success'   // Invitation created
'team.invitation.accept.success'   // Invitation accepted
'team.invitation.resend.success'   // Invitation resent
'team.invitation.cancel.success'   // Invitation cancelled
'team.invitation.expire'           // Invitation expired

// Ownership events
'team.ownership.transfer.success'  // Ownership transferred

// Context events
'team.switch.success'          // User switched teams
'team.context.invalid'         // Invalid team context detected

// Limit events
'team.limit.reached'           // Plan limit reached
'team.rate_limit.exceeded'     // Rate limit exceeded
```

### Monitoring Rules

```typescript
// Alert on high team creation rate
if (count('team.create.success', last_5_minutes) > 50) {
  alert('high_team_creation_rate', {
    severity: 'warning',
    count: count,
    threshold: 50,
  });
}

// Alert on invitation spam
if (count('team.rate_limit.exceeded', last_5_minutes) > 20) {
  alert('invitation_spam_detected', {
    severity: 'warning',
    count: count,
    threshold: 20,
  });
}

// Alert on plan limit hits
if (count('team.limit.reached', last_15_minutes) > 100) {
  alert('high_plan_limit_hits', {
    severity: 'info',
    count: count,
    threshold: 100,
  });
}

// Alert on invalid context errors
if (count('team.context.invalid', last_5_minutes) > 10) {
  alert('team_context_issues', {
    severity: 'critical',
    count: count,
    threshold: 10,
  });
}
```

### Metrics to Track

```typescript
// Counters
'team.create.total'            // Total teams created
'team.member.add.total'        // Total members added
'team.invitation.sent.total'   // Total invitations sent
'team.switch.total'            // Total team switches
'team.limit.reached.total'     // Total limit hits

// Gauges
'team.active.count'            // Active teams count
'team.members.avg'             // Average members per team
'team.billable_seats.total'    // Total billable seats across all teams

// Histograms
'team.create.duration'         // Team creation duration
'team.invitation.accept.duration'  // Invitation acceptance duration
'team.member.add.duration'     // Member addition duration
```

## Integration with Existing Systems

### Authentication System Integration

The team system integrates with the existing authentication system:

1. **Session Context**: Team operations require valid session
2. **User Verification**: Only verified users can create teams
3. **Re-authentication**: Sensitive operations (delete, transfer) require re-auth
4. **Onboarding Flow**: New users without invitations go through onboarding at `/onboarding`
5. **Component Reuse**: Team creation reuses `OnboardingForm` and `PlanSelector` from `features/auth/components`
6. **Unified Experience**: Same full-page onboarding layout for initial signup and team creation

### RBAC System Integration

The team system uses the existing RBAC framework:

1. **Role Assignment**: Uses `assignRole` from `server/auth/rbac.ts`
2. **Permission Checks**: Uses `hasPermission` and `requirePermission`
3. **Role Validation**: Enforces management + operational role pairing
4. **Billable Seat Tracking**: Uses `updateBillableSeats` from RBAC

### Plan System Integration

The team system enforces plan limits:

1. **Limit Checking**: Uses `PLANS` from `config/tiers.ts`
2. **Usage Tracking**: Counts members, projects, issues
3. **Limit Enforcement**: Blocks operations when limits reached
4. **Upgrade Prompts**: Shows "Coming Soon" for Pro plan

### Email System Integration

The team system uses the existing email infrastructure:

1. **Invitation Emails**: Uses email queue for invitation delivery
2. **Notification Emails**: Sends notifications for ownership transfer, member changes
3. **Expiration Reminders**: Sends reminders for expiring invitations
4. **Export Emails**: Sends download links for data exports

## Performance Considerations

### Database Optimization

1. **Indexes**: Add indexes on frequently queried columns (slug, userId, teamId)
2. **Pagination**: Use cursor-based pagination for large member lists
3. **Soft Deletes**: Filter out soft-deleted teams in queries
4. **Caching**: Cache team data in React Query with 5-minute stale time

### API Optimization

1. **Batch Operations**: Support bulk member additions
2. **Optimistic Updates**: Update UI immediately, rollback on failure
3. **Debouncing**: Debounce team switcher to prevent rapid switches
4. **Rate Limiting**: Prevent abuse with rate limits on mutations

### Client Optimization

1. **Code Splitting**: Lazy load team settings components
2. **Suspense**: Use React Suspense for loading states
3. **Prefetching**: Prefetch team data on hover
4. **Memoization**: Memoize expensive computations (billable seats)

## Security Considerations

### Access Control

1. **Server-Side Checks**: Always validate permissions on server
2. **Team Context**: Validate user has access to team before operations
3. **Role Hierarchy**: Enforce role hierarchy (owner > admin > member)
4. **Invitation Tokens**: Use cryptographically secure tokens with hash-based storage

### Invitation Token Security (Critical)

**Problem:** Storing raw invitation tokens in the database creates a security vulnerability. If the database is compromised, an attacker could use valid pending invitations to join teams.

**Solution:** Store only a SHA-256 hash of the token:
1. Generate a cryptographically secure random token (64 characters)
2. Hash the token using SHA-256
3. Store the hash in the database
4. Send the raw token in the invitation email
5. When accepting, hash the provided token and look up the matching hash

**Implementation:**
```typescript
// Token generation
const rawToken = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

// Store tokenHash in database, send rawToken in email

// Token verification
const providedHash = crypto.createHash('sha256').update(providedToken).digest('hex');
const invitation = await db.query.teamInvitations.findFirst({
  where: eq(teamInvitations.tokenHash, providedHash)
});
```

### Data Protection

1. **Soft Deletes**: Retain data for 30 days for recovery
2. **Slug Reuse**: Partial unique index allows slug reuse after soft delete
3. **Audit Logs**: Log all team operations for compliance
4. **Data Export**: Provide data export before deletion
5. **PII Protection**: Hash emails in logs
6. **Token Security**: Store only hashed invitation tokens

### Rate Limiting

1. **Invitation Spam**: Limit to 10 invitations per hour per team
2. **Export Abuse**: Limit to 1 export per day per team
3. **Team Creation**: Limit to 5 teams per hour per user
4. **API Calls**: General rate limit of 100 requests per minute per user

## Critical Design Decisions

### 1. Slug Uniqueness with Soft Deletes

**Problem:** A unique constraint on `slug` combined with soft deletes prevents slug reuse. If team "acme" is soft-deleted, no one can create a new team with slug "acme" for 30 days.

**Solution:** Use a partial unique index that only enforces uniqueness for non-deleted teams:
```sql
CREATE UNIQUE INDEX teams_slug_unique_idx ON teams (slug) WHERE deleted_at IS NULL;
```

This allows immediate slug reuse after soft deletion while maintaining uniqueness for active teams.

### 2. Project Ownership Blocking

**Problem:** If a member who owns projects is removed or demoted, those projects become orphaned.

**Solution:** Block both demotion and removal operations for members who own projects:
- Check project ownership before any role change that removes TEAM_EDITOR
- Check project ownership before member removal
- Return error with list of owned projects
- Require ownership transfer before proceeding

**Implementation:**
```typescript
// Before demotion or removal
const ownedProjects = await getProjectsByOwner(userId, teamId);
if (ownedProjects.length > 0) {
  throw new ConflictError('MEMBER_OWNS_PROJECTS', {
    projects: ownedProjects.map(p => ({ id: p.id, name: p.name }))
  });
}
```

### 3. Invitation Token Security

**Problem:** Storing raw tokens allows database compromise to lead to unauthorized team access.

**Solution:** Store only SHA-256 hashes of tokens (see Security Considerations section above).

### 4. Team Context Synchronization

**Problem:** Cookie and database can disagree on last active team, causing confusion.

**Solution:** Always prioritize database value and update cookie to match:
```typescript
const dbTeamId = user.lastActiveTeamId;
const cookieTeamId = cookies().get('team_id')?.value;

if (dbTeamId !== cookieTeamId) {
  // Database wins, update cookie
  cookies().set('team_id', dbTeamId);
}
```

## Migration Strategy

### Database Migration

1. **Create Tables**: Add teams, team_members, team_invitations tables
2. **Update Users**: Add lastActiveTeamId column to users table
3. **Indexes**: Add indexes for performance including partial unique index for slugs
4. **Constraints**: Add foreign keys and unique constraints

### Data Migration

1. **Existing Users**: No automatic team creation (users go through onboarding)
2. **Existing Projects**: Projects remain unassigned until teams are created
3. **Existing Roles**: Migrate existing roles to new team-based roles

### Feature Flags

1. **Team Creation**: Enable team creation for all users
2. **Invitations**: Enable invitation system
3. **Pro Plan**: Keep Pro plan disabled with "Coming Soon" badge
4. **Data Export**: Enable data export feature

## Future Enhancements

### Phase 2 Features

1. **Pro Plan**: Implement Stripe integration for Pro plan billing
   - **Billing Model**: Charge per TEAM_EDITOR seat at $8/month
   - **Proration**: Implement prorated charges for mid-cycle seat additions
   - **Seat Tracking**: billableSeats field tracks current count, not historical billing
   - **Billing Sync**: Webhook to sync Stripe subscription with billableSeats count
   - **Downgrade Handling**: Block seat reduction if it would exceed new limit
2. **Team Templates**: Pre-configured team setups for common use cases
3. **Team Analytics**: Usage statistics and activity dashboards
4. **Team Branding**: Custom colors, logos, and themes
5. **SSO Integration**: Enterprise SSO for team authentication

### Phase 3 Features

1. **Team Workspaces**: Multiple workspaces per team
2. **Team Automation**: Automated workflows and integrations
3. **Team Reporting**: Advanced reporting and exports
4. **Team Compliance**: GDPR, CCPA, SOC 2 compliance features
5. **Team API**: Public API for team management

