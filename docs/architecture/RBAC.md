# Role-Based Access Control (RBAC) Documentation

## Overview

UI SyncUp uses a comprehensive Role-Based Access Control (RBAC) system to manage user permissions across teams and projects. This document explains the role hierarchy, permissions model, billable seats calculation, and how to use the RBAC utilities in your code.

## Table of Contents

- [Role Hierarchy](#role-hierarchy)
- [Permissions Model](#permissions-model)
- [Billable Seats](#billable-seats)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

---

## Role Hierarchy

### Team Roles (Two-Tier Hierarchy)

Team roles are split into **management roles** (control team settings) and **operational roles** (determine billing and content access).

#### Management Roles (Not Billable)

| Role | Description | Billable |
|------|-------------|----------|
| **TEAM_OWNER** | Full control over team, billing, and members. Can transfer ownership and delete team. Must also have an operational role. | ❌ No (by itself) |
| **TEAM_ADMIN** | Manage team members, projects, and integrations. Cannot delete team or transfer ownership. Must also have an operational role. | ❌ No (by itself) |

#### Operational Roles (Determine Billing)

| Role | Level | Description | Billable |
|------|-------|-------------|----------|
| **TEAM_EDITOR** | 3 | Create and manage issues and annotations. Automatically assigned when user becomes PROJECT_OWNER or PROJECT_EDITOR. | ✅ Yes ($8/month) |
| **TEAM_MEMBER** | 2 | View projects and comment on issues. Can be assigned to projects. | ❌ No |
| **TEAM_VIEWER** | 1 | View-only access to projects and issues. No modifications. | ❌ No |

#### Role Combinations

Users have **one management role** (optional) + **one operational role** (required):

- `TEAM_OWNER` + `TEAM_EDITOR` → Billed 1 seat (owner who creates issues)
- `TEAM_OWNER` + `TEAM_MEMBER` → Billed 0 seats (owner who only manages)
- `TEAM_ADMIN` + `TEAM_VIEWER` → Billed 0 seats (admin with read-only)
- `TEAM_EDITOR` (no management) → Billed 1 seat (designer/QA)
- `TEAM_MEMBER` (no management) → Billed 0 seats (developer)

### Project Roles

Project roles apply to a specific project. Users can have different roles in different projects.

| Role | Level | Description | Billable |
|------|-------|-------------|----------|
| **PROJECT_OWNER** | 4 | Full control over project and its issues. Can manage project members. | ✅ Yes |
| **PROJECT_EDITOR** | 3 | Create and manage issues and annotations. Cannot manage project settings. | ✅ Yes |
| **PROJECT_DEVELOPER** | 2 | Update issue status and comment. Typical developer workflow. | ❌ No |
| **PROJECT_VIEWER** | 1 | View-only access to project and issues. No modifications. | ❌ No |

### Role Hierarchy Rules

1. **Management roles are separate from operational roles** - TEAM_OWNER/ADMIN control settings, operational roles control content access
2. **Users must have both a management role AND an operational role** if they need both capabilities
3. **Billing is determined solely by operational role** - TEAM_EDITOR is the only billable team role
4. **Higher operational roles inherit lower role permissions** (EDITOR > MEMBER > VIEWER)
5. **Team roles do not automatically grant project roles** - users must be explicitly assigned to projects
6. **Project roles only apply to that specific project** - they don't grant access to other projects
7. **TEAM_OWNER and TEAM_ADMIN can access team settings** regardless of their operational role

---

## Permissions Model

### Permission Categories

Permissions are organized into four categories:

1. **Team Permissions** - Control team-level operations
2. **Project Permissions** - Control project-level operations
3. **Issue Permissions** - Control issue management
4. **Annotation Permissions** - Control annotation management

### Team Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `team:view` | View team details and members | All team roles |
| `team:update` | Update team settings | OWNER, ADMIN |
| `team:delete` | Delete the team | OWNER only |
| `team:manage_members` | Add/remove team members | OWNER, ADMIN |
| `team:manage_billing` | Manage billing and subscription | OWNER, ADMIN |
| `team:manage_settings` | Manage team settings | OWNER, ADMIN |
| `team:transfer_ownership` | Transfer team ownership | OWNER only |

### Project Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `project:view` | View project details | All roles |
| `project:create` | Create new projects | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR |
| `project:update` | Update project settings | TEAM_OWNER, TEAM_ADMIN, PROJECT_OWNER |
| `project:delete` | Delete the project | TEAM_OWNER, TEAM_ADMIN, PROJECT_OWNER |
| `project:manage_members` | Add/remove project members | TEAM_OWNER, TEAM_ADMIN, PROJECT_OWNER |
| `project:manage_settings` | Manage project settings | TEAM_OWNER, TEAM_ADMIN, PROJECT_OWNER |

### Issue Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `issue:view` | View issues | All roles |
| `issue:create` | Create new issues | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR |
| `issue:update` | Update issue details and status | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR, PROJECT_DEVELOPER |
| `issue:delete` | Delete issues | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR |
| `issue:assign` | Assign issues to users | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR |
| `issue:comment` | Comment on issues | All roles except VIEWER |

### Annotation Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `annotation:view` | View annotations | All roles |
| `annotation:create` | Create new annotations | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR |
| `annotation:update` | Update annotations | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR |
| `annotation:delete` | Delete annotations | TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR, PROJECT_OWNER, PROJECT_EDITOR |
| `annotation:comment` | Comment on annotations | All roles except VIEWER |

---

## Billable Seats

### Billing Model

UI SyncUp uses a **per-editor seat** billing model:

- **Free Plan**: Up to 10 members, 1 project, 25 issues
- **Pro Plan**: $8/month per TEAM_EDITOR seat, unlimited members, 50 projects, unlimited issues

### Billable Roles

**Only operational roles determine billing. Management roles are not billable by themselves.**

**Team Operational Roles:**
- ✅ **TEAM_EDITOR** - Billable ($8/month)
- ❌ TEAM_MEMBER - Free
- ❌ TEAM_VIEWER - Free

**Team Management Roles (not billable by themselves):**
- ❌ TEAM_OWNER - Free (but must also have an operational role)
- ❌ TEAM_ADMIN - Free (but must also have an operational role)

**Project Roles (auto-promote to TEAM_EDITOR):**
- ✅ PROJECT_OWNER → automatically assigns TEAM_EDITOR (billable)
- ✅ PROJECT_EDITOR → automatically assigns TEAM_EDITOR (billable)
- ❌ PROJECT_DEVELOPER - Free
- ❌ PROJECT_VIEWER - Free

### Billable Seat Calculation

Billable seats are calculated as the **unique count of users** with any billable role in the team:

```typescript
// Example: Team with 5 users
// User A: TEAM_OWNER → 1 billable seat
// User B: TEAM_ADMIN → 1 billable seat
// User C: PROJECT_OWNER (Project 1) → 1 billable seat
// User D: PROJECT_EDITOR (Project 1), PROJECT_EDITOR (Project 2) → 1 billable seat (counted once)
// User E: PROJECT_DEVELOPER (Project 1) → 0 billable seats (free)
// Total: 4 billable seats × $8 = $32/month
```

### Automatic Seat Management

When a user is assigned a billable role:
1. The system automatically marks them as a TEAM_EDITOR
2. Billable seat count is recalculated
3. If on Free plan and limit is exceeded, the operation is blocked
4. If on Pro plan, the seat is added and billing is updated

---

## Usage Examples

### Assigning Roles

```typescript
import { assignRole, TEAM_ROLES, PROJECT_ROLES } from '@/server/auth/rbac';

// Assign team owner role
await assignRole({
  userId: 'user_123',
  role: TEAM_ROLES.TEAM_OWNER,
  resourceType: 'team',
  resourceId: 'team_456',
});

// Assign project editor role
await assignRole({
  userId: 'user_789',
  role: PROJECT_ROLES.PROJECT_EDITOR,
  resourceType: 'project',
  resourceId: 'project_abc',
});

// Assign multiple roles at once (transactional)
await assignRoles([
  {
    userId: 'user_123',
    role: TEAM_ROLES.TEAM_OWNER,
    resourceType: 'team',
    resourceId: 'team_456',
  },
  {
    userId: 'user_123',
    role: PROJECT_ROLES.PROJECT_OWNER,
    resourceType: 'project',
    resourceId: 'project_abc',
  },
]);
```

### Checking Permissions

```typescript
import { hasPermission, PERMISSIONS } from '@/server/auth/rbac';

// Check if user can create issues in a project
const canCreate = await hasPermission({
  userId: 'user_123',
  permission: PERMISSIONS.ISSUE_CREATE,
  resourceId: 'project_456',
  resourceType: 'project',
});

if (canCreate) {
  // Allow issue creation
} else {
  // Show error message
}

// Check multiple permissions
import { hasAllPermissions, hasAnyPermission } from '@/server/auth/rbac';

// User must have ALL permissions
const canManageProject = await hasAllPermissions(
  'user_123',
  [PERMISSIONS.PROJECT_UPDATE, PERMISSIONS.PROJECT_MANAGE_MEMBERS],
  'project_456',
  'project'
);

// User must have ANY permission
const canInteract = await hasAnyPermission(
  'user_123',
  [PERMISSIONS.ISSUE_CREATE, PERMISSIONS.ISSUE_COMMENT],
  'project_456',
  'project'
);
```

### Requiring Permissions (Guards)

```typescript
import { requirePermission, requireRole } from '@/server/auth/rbac';

// In API route handler
export async function POST(request: Request) {
  const session = await getSession();
  const { projectId } = await request.json();

  // Throw error if user doesn't have permission
  await requirePermission({
    userId: session.userId,
    permission: PERMISSIONS.ISSUE_CREATE,
    resourceId: projectId,
    resourceType: 'project',
  });

  // Continue with issue creation...
}

// Require specific role
await requireRole(
  session.userId,
  TEAM_ROLES.TEAM_ADMIN,
  'team',
  teamId
);
```

### Querying User Roles

```typescript
import {
  getUserRoles,
  getUserTeamRoles,
  getUserProjectRoles,
  getHighestTeamRole,
  getHighestProjectRole,
} from '@/server/auth/rbac';

// Get all roles for a user
const allRoles = await getUserRoles('user_123');

// Get team roles
const teamRoles = await getUserTeamRoles('user_123', 'team_456');

// Get project roles
const projectRoles = await getUserProjectRoles('user_123', 'project_789');

// Get highest role (for display purposes)
const highestTeamRole = await getHighestTeamRole('user_123', 'team_456');
// Returns: 'TEAM_OWNER' | 'TEAM_ADMIN' | ... | null

const highestProjectRole = await getHighestProjectRole('user_123', 'project_789');
// Returns: 'PROJECT_OWNER' | 'PROJECT_EDITOR' | ... | null
```

### Managing Billable Seats

```typescript
import {
  calculateBillableSeats,
  updateBillableSeats,
  canAddBillableSeat,
} from '@/server/auth/rbac';

// Calculate current billable seats
const seatCount = await calculateBillableSeats('team_456');
console.log(`Team has ${seatCount} billable seats`);

// Check if team can add more seats
const canAdd = await canAddBillableSeat('team_456', 'free');
if (!canAdd) {
  throw new Error('Team has reached the maximum number of billable seats for the Free plan');
}

// Update billable seats (called automatically when roles change)
await updateBillableSeats('team_456');
```

### Updating Roles

```typescript
import { updateRole, removeRole, demoteWithOwnershipTransfer, getOwnedProjects } from '@/server/auth/rbac';

// Upgrade user's role (always safe)
await updateRole(
  'user_123',
  TEAM_ROLES.TEAM_MEMBER,  // old role
  TEAM_ROLES.TEAM_EDITOR,  // new role
  'team',
  'team_456'
);

// Demote user (may fail if they're PROJECT_OWNER)
try {
  await updateRole(
    'user_123',
    TEAM_ROLES.TEAM_EDITOR,  // old role
    TEAM_ROLES.TEAM_VIEWER,  // new role
    'team',
    'team_456'
  );
} catch (error) {
  if (error.message.includes('DEMOTION_BLOCKED')) {
    // User is PROJECT_OWNER, need to transfer ownership first
    const ownedProjects = await getOwnedProjects('user_123');
    console.log('User owns projects:', ownedProjects);
    // Show UI to select new owners
  }
}

// Safe demotion with ownership transfer
await demoteWithOwnershipTransfer(
  'user_123',
  'team_456',
  'TEAM_VIEWER',
  {
    'project_1': 'user_789', // Transfer project_1 to user_789
    'project_2': 'user_789', // Transfer project_2 to user_789
  }
);

// Remove a role
await removeRole({
  userId: 'user_123',
  role: PROJECT_ROLES.PROJECT_EDITOR,
  resourceType: 'project',
  resourceId: 'project_789',
});
```

---

## API Reference

### Role Assignment Functions

#### `assignRole(assignment: RoleAssignment): Promise<UserRole>`

Assign a role to a user for a specific resource.

**Parameters:**
- `assignment.userId` - User ID
- `assignment.role` - Role to assign (from `TEAM_ROLES` or `PROJECT_ROLES`)
- `assignment.resourceType` - Resource type (`'team'` or `'project'`)
- `assignment.resourceId` - Resource ID

**Returns:** Created user role record

**Throws:** Error if role is invalid or doesn't match resource type

---

#### `assignRoles(assignments: RoleAssignment[]): Promise<UserRole[]>`

Assign multiple roles to a user at once (transactional).

**Parameters:**
- `assignments` - Array of role assignments

**Returns:** Array of created user role records

---

#### `removeRole(assignment: RoleAssignment): Promise<boolean>`

Remove a role from a user.

**Parameters:**
- `assignment` - Role assignment to remove

**Returns:** `true` if role was removed, `false` if it didn't exist

---

#### `updateRole(userId, oldRole, newRole, resourceType, resourceId): Promise<void>`

Update a user's role for a resource (atomic operation).

**Parameters:**
- `userId` - User ID
- `oldRole` - Current role to remove
- `newRole` - New role to assign
- `resourceType` - Resource type
- `resourceId` - Resource ID

---

### Role Query Functions

#### `getUserRoles(userId: string): Promise<UserRole[]>`

Get all roles for a user across all resources.

---

#### `getUserTeamRoles(userId: string, teamId: string): Promise<UserRole[]>`

Get all team roles for a user in a specific team.

---

#### `getUserProjectRoles(userId: string, projectId: string): Promise<UserRole[]>`

Get all project roles for a user in a specific project.

---

#### `getHighestTeamRole(userId: string, teamId: string): Promise<TeamRole | null>`

Get the highest team role for a user in a team (based on hierarchy).

---

#### `getHighestProjectRole(userId: string, projectId: string): Promise<ProjectRole | null>`

Get the highest project role for a user in a project (based on hierarchy).

---

#### `hasRole(userId, role, resourceType, resourceId): Promise<boolean>`

Check if a user has a specific role.

---

### Permission Check Functions

#### `hasPermission(check: PermissionCheck): Promise<boolean>`

Check if a user has a specific permission for a resource.

**Parameters:**
- `check.userId` - User ID
- `check.permission` - Permission to check (from `PERMISSIONS`)
- `check.resourceId` - Resource ID
- `check.resourceType` - Resource type (optional)

**Returns:** `true` if user has the permission

**Implementation Details:**
- For team resources, this function checks **both** the `user_roles` table and the `team_members` table
- This ensures team roles stored in `team_members` (e.g., from team creation) are correctly recognized
- The function checks both management roles (`TEAM_OWNER`, `TEAM_ADMIN`) and operational roles (`TEAM_EDITOR`, `TEAM_MEMBER`, `TEAM_VIEWER`)


---

#### `hasAnyPermission(userId, permissions, resourceId, resourceType?): Promise<boolean>`

Check if a user has any of the specified permissions.

---

#### `hasAllPermissions(userId, permissions, resourceId, resourceType?): Promise<boolean>`

Check if a user has all of the specified permissions.

---

#### `getUserPermissions(userId, resourceId, resourceType?): Promise<Permission[]>`

Get all permissions for a user in a resource (deduplicated).

---

### Authorization Guard Functions

#### `requirePermission(check: PermissionCheck): Promise<void>`

Require a user to have a specific permission, or throw an error.

**Throws:** Error if user doesn't have the permission

---

#### `requireRole(userId, role, resourceType, resourceId): Promise<void>`

Require a user to have a specific role, or throw an error.

**Throws:** Error if user doesn't have the role

---

### Billable Seat Functions

#### `calculateBillableSeats(teamId: string): Promise<number>`

Calculate the number of billable seats for a team.

---

#### `updateBillableSeats(teamId: string): Promise<number>`

Update the billable seats count for a team (called automatically when roles change).

---

#### `canAddBillableSeat(teamId: string, planId: 'free' | 'pro'): Promise<boolean>`

Check if a team can add more billable seats based on their plan.

---

### Project Ownership Functions

#### `getOwnedProjects(userId: string): Promise<string[]>`

Get all projects where a user is PROJECT_OWNER.

**Returns:** Array of project IDs

**Use case:** Check before demoting a user from TEAM_EDITOR

---

#### `demoteWithOwnershipTransfer(userId, teamId, newOperationalRole, projectOwnershipTransfers): Promise<void>`

Safely demote a user from TEAM_EDITOR while transferring their project ownerships.

**Parameters:**
- `userId` - User ID to demote
- `teamId` - Team ID
- `newOperationalRole` - New role (`'TEAM_VIEWER'` or `'TEAM_MEMBER'`)
- `projectOwnershipTransfers` - Map of `projectId -> newOwnerId`

**Throws:** Error if any owned project is missing a transfer target

**Example:**
```typescript
await demoteWithOwnershipTransfer(
  'user_123',
  'team_456',
  'TEAM_VIEWER',
  {
    'project_1': 'user_789',
    'project_2': 'user_789',
  }
);
```

---

## Best Practices

### 1. Always Use Server-Side Checks

**❌ Don't rely on client-side role checks for security:**

```typescript
// BAD: Client-side only
'use client';
export function DeleteButton() {
  const { user } = useSession();
  if (user.role !== 'TEAM_OWNER') return null;
  return <button onClick={deleteTeam}>Delete</button>;
}
```

**✅ Always enforce permissions on the server:**

```typescript
// GOOD: Server-side enforcement
export async function DELETE(request: Request) {
  const session = await getSession();
  
  await requirePermission({
    userId: session.userId,
    permission: PERMISSIONS.TEAM_DELETE,
    resourceId: teamId,
    resourceType: 'team',
  });
  
  // Proceed with deletion
}
```

### 2. Use Permission Checks, Not Role Checks

**❌ Don't check roles directly in business logic:**

```typescript
// BAD: Tightly coupled to roles
if (userRole === 'TEAM_OWNER' || userRole === 'TEAM_ADMIN') {
  // Allow action
}
```

**✅ Check permissions instead:**

```typescript
// GOOD: Flexible and maintainable
const canManage = await hasPermission({
  userId,
  permission: PERMISSIONS.TEAM_MANAGE_MEMBERS,
  resourceId: teamId,
  resourceType: 'team',
});

if (canManage) {
  // Allow action
}
```

### 3. Use Guards for API Routes

**✅ Use `requirePermission` for cleaner API routes:**

```typescript
export async function POST(request: Request) {
  const session = await getSession();
  const { projectId, title, description } = await request.json();
  
  // Guard: throws error if permission denied
  await requirePermission({
    userId: session.userId,
    permission: PERMISSIONS.ISSUE_CREATE,
    resourceId: projectId,
    resourceType: 'project',
  });
  
  // Continue with issue creation
  const issue = await createIssue({ projectId, title, description });
  return Response.json(issue);
}
```

### 4. Batch Role Assignments

**✅ Use `assignRoles` for multiple assignments:**

```typescript
// GOOD: Single transaction
await assignRoles([
  { userId, role: TEAM_ROLES.TEAM_OWNER, resourceType: 'team', resourceId: teamId },
  { userId, role: PROJECT_ROLES.PROJECT_OWNER, resourceType: 'project', resourceId: projectId },
]);

// BAD: Multiple transactions
await assignRole({ userId, role: TEAM_ROLES.TEAM_OWNER, resourceType: 'team', resourceId: teamId });
await assignRole({ userId, role: PROJECT_ROLES.PROJECT_OWNER, resourceType: 'project', resourceId: projectId });
```

### 5. Check Billable Seats Before Assignment

**✅ Validate seat limits before assigning billable roles:**

```typescript
import { canAddBillableSeat, isBillableRole } from '@/server/auth/rbac';

// Check if team can add more seats
if (isBillableRole(newRole)) {
  const canAdd = await canAddBillableSeat(teamId, team.planId);
  if (!canAdd) {
    throw new Error('Team has reached the maximum number of billable seats');
  }
}

// Proceed with role assignment
await assignRole({ userId, role: newRole, resourceType, resourceId });
```

### 6. Log Permission Denials

**✅ The RBAC utilities automatically log permission denials:**

```typescript
// Logs are automatically created when permissions are denied
await requirePermission({
  userId: session.userId,
  permission: PERMISSIONS.TEAM_DELETE,
  resourceId: teamId,
  resourceType: 'team',
});
// If denied, logs: rbac.permission_denied with context
```

### 7. Handle PROJECT_OWNER Demotion Edge Case

**✅ Always check for project ownership before demoting:**

```typescript
// BAD: Direct demotion without checking
await updateRole(userId, 'TEAM_EDITOR', 'TEAM_VIEWER', 'team', teamId);
// May fail if user is PROJECT_OWNER

// GOOD: Check first, then handle appropriately
const ownedProjects = await getOwnedProjects(userId);

if (ownedProjects.length > 0) {
  // Show UI to transfer ownership
  return {
    error: 'OWNERSHIP_TRANSFER_REQUIRED',
    projects: ownedProjects,
    message: `User owns ${ownedProjects.length} project(s). Transfer ownership first.`,
  };
}

// Safe to demote
await updateRole(userId, 'TEAM_EDITOR', 'TEAM_VIEWER', 'team', teamId);

// Or use the safe helper
await demoteWithOwnershipTransfer(userId, teamId, 'TEAM_VIEWER', {
  'project_1': newOwnerId,
  'project_2': newOwnerId,
});
```

---

## Security Considerations

### 1. Never Trust Client Input

Always validate user permissions on the server, even if the client UI hides certain actions.

### 2. Use Transactions for Role Changes

When changing roles that affect billing, use transactions to ensure consistency:

```typescript
await db.transaction(async (tx) => {
  await removeRole({ userId, role: oldRole, resourceType, resourceId });
  await assignRole({ userId, role: newRole, resourceType, resourceId });
  await updateBillableSeats(teamId);
});
```

### 3. Audit Role Changes

All role assignments and removals are automatically logged with structured logging:

```typescript
// Logs include:
// - eventType: 'rbac.assign_role.success' | 'rbac.remove_role.success'
// - userId, role, resourceType, resourceId
// - timestamp, requestId
```

### 4. Validate Resource Ownership

Before checking permissions, verify that the resource exists and belongs to the team:

```typescript
// Verify project belongs to team
const project = await getProject(projectId);
if (project.teamId !== teamId) {
  throw new Error('Project not found');
}

// Then check permissions
await requirePermission({
  userId: session.userId,
  permission: PERMISSIONS.PROJECT_UPDATE,
  resourceId: projectId,
  resourceType: 'project',
});
```

### 5. Rate Limit Role Changes

Implement rate limiting for role assignment endpoints to prevent abuse:

```typescript
// Limit role changes to 10 per minute per team
await checkRateLimit(`role-changes:${teamId}`, 10, 60000);
```

---

## Integration with Authentication

The RBAC system integrates seamlessly with the authentication system:

### 1. Default Roles on Verification

When a user verifies their email, default roles are assigned:

```typescript
// In email verification handler
await verifyEmail(token);

// Assign default roles (currently none, user must create/join team)
// This will be updated when team creation is implemented
```

### 2. Session Data Includes Roles

The session object includes user roles for quick access:

```typescript
const session = await getSession();
// session.user.roles = [
//   { role: 'TEAM_OWNER', resourceType: 'team', resourceId: 'team_123' },
//   { role: 'PROJECT_EDITOR', resourceType: 'project', resourceId: 'project_456' },
// ]
```

### 3. Client-Side Role Checks

Use the `useSession` hook to access roles in client components:

```typescript
'use client';
import { useSession } from '@/features/auth/hooks/use-session';

export function TeamSettings() {
  const { data: session } = useSession();
  
  const isTeamOwner = session?.user.roles.some(
    r => r.role === 'TEAM_OWNER' && r.resourceId === teamId
  );
  
  return (
    <div>
      {isTeamOwner && <DangerZone />}
    </div>
  );
}
```

---

## Testing RBAC

### Unit Tests

Test individual RBAC functions with mock data:

```typescript
import { assignRole, hasPermission, TEAM_ROLES, PERMISSIONS } from '@/server/auth/rbac';

test('team owner has all permissions', async () => {
  await assignRole({
    userId: 'user_123',
    role: TEAM_ROLES.TEAM_OWNER,
    resourceType: 'team',
    resourceId: 'team_456',
  });
  
  const canDelete = await hasPermission({
    userId: 'user_123',
    permission: PERMISSIONS.TEAM_DELETE,
    resourceId: 'team_456',
    resourceType: 'team',
  });
  
  expect(canDelete).toBe(true);
});
```

### Integration Tests

Test RBAC with real database and API routes:

```typescript
test('POST /api/issues requires issue:create permission', async () => {
  // Create user with viewer role (no create permission)
  await assignRole({
    userId: 'user_123',
    role: PROJECT_ROLES.PROJECT_VIEWER,
    resourceType: 'project',
    resourceId: 'project_456',
  });
  
  // Attempt to create issue
  const response = await fetch('/api/issues', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'project_456', title: 'Test' }),
  });
  
  expect(response.status).toBe(403);
});
```

### Property-Based Tests

Test RBAC properties with random inputs:

```typescript
import fc from 'fast-check';

test('Property: Billable roles always count towards seat limit', () => {
  fc.assert(
    fc.asyncProperty(
      fc.constantFrom(...BILLABLE_ROLES),
      fc.uuid(),
      fc.uuid(),
      async (role, userId, teamId) => {
        const beforeCount = await calculateBillableSeats(teamId);
        
        await assignRole({
          userId,
          role,
          resourceType: 'team',
          resourceId: teamId,
        });
        
        const afterCount = await calculateBillableSeats(teamId);
        expect(afterCount).toBeGreaterThan(beforeCount);
      }
    )
  );
});
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors

**Problem:** User gets permission denied even though they should have access.

**Solution:**
- Check if user has the correct role assigned
- Verify the resource ID matches
- Check if the role has the required permission in `ROLE_PERMISSIONS`
- Review logs for `rbac.permission_denied` events

```typescript
// Debug: Check user's roles and permissions
const roles = await getUserRoles(userId);
console.log('User roles:', roles);

const permissions = await getUserPermissions(userId, resourceId, 'project');
console.log('User permissions:', permissions);
```

#### 2. Billable Seat Limit Exceeded

**Problem:** Cannot assign role because team has reached seat limit.

**Solution:**
- Check current seat count: `await calculateBillableSeats(teamId)`
- Verify team's plan limits in `PLANS` config
- Upgrade team to Pro plan for unlimited seats
- Remove unused billable roles

#### 3. Role Assignment Fails

**Problem:** `assignRole` throws an error.

**Solution:**
- Verify role exists in `ALL_ROLES`
- Check resource type matches role type (team role for team resource, project role for project resource)
- Ensure resource exists in database
- Check database constraints (foreign keys, unique constraints)

---

## Migration Guide

### From Mock Roles to Real RBAC

If you're migrating from mock role checks to the real RBAC system:

1. **Replace hardcoded role checks:**

```typescript
// Before
if (user.role === 'admin') { ... }

// After
const canManage = await hasPermission({
  userId: user.id,
  permission: PERMISSIONS.TEAM_MANAGE_MEMBERS,
  resourceId: teamId,
  resourceType: 'team',
});
```

2. **Update session data structure:**

```typescript
// Before
session.user.role = 'admin';

// After
session.user.roles = [
  { role: 'TEAM_ADMIN', resourceType: 'team', resourceId: 'team_123' }
];
```

3. **Add permission checks to API routes:**

```typescript
// Add to all protected API routes
await requirePermission({
  userId: session.userId,
  permission: PERMISSIONS.ISSUE_CREATE,
  resourceId: projectId,
  resourceType: 'project',
});
```

---

## Two-Tier Role System Examples

### Creating Team Owners

```typescript
// Owner who creates content (billable)
await assignRoles([
  { userId, role: 'TEAM_OWNER', resourceType: 'team', resourceId: teamId },
  { userId, role: 'TEAM_EDITOR', resourceType: 'team', resourceId: teamId },
]);
// Billable seats: 1

// Owner who only manages (free)
await assignRoles([
  { userId, role: 'TEAM_OWNER', resourceType: 'team', resourceId: teamId },
  { userId, role: 'TEAM_VIEWER', resourceType: 'team', resourceId: teamId },
]);
// Billable seats: 0
```

### Creating Team Admins

```typescript
// Admin who creates content (billable)
await assignRoles([
  { userId, role: 'TEAM_ADMIN', resourceType: 'team', resourceId: teamId },
  { userId, role: 'TEAM_EDITOR', resourceType: 'team', resourceId: teamId },
]);

// Admin who only manages (free)
await assignRoles([
  { userId, role: 'TEAM_ADMIN', resourceType: 'team', resourceId: teamId },
  { userId, role: 'TEAM_MEMBER', resourceType: 'team', resourceId: teamId },
]);
```

### Creating Regular Team Members

```typescript
// Designer/QA (billable)
await assignRole({
  userId,
  role: 'TEAM_EDITOR',
  resourceType: 'team',
  resourceId: teamId,
});

// Developer (free)
await assignRole({
  userId,
  role: 'TEAM_MEMBER',
  resourceType: 'team',
  resourceId: teamId,
});

// Stakeholder (free)
await assignRole({
  userId,
  role: 'TEAM_VIEWER',
  resourceType: 'team',
  resourceId: teamId,
});
```

### Querying Two-Tier Roles

```typescript
// Get management role
const managementRole = await getManagementRole(userId, teamId);
// Returns: 'TEAM_OWNER' | 'TEAM_ADMIN' | null

// Get operational role
const operationalRole = await getOperationalRole(userId, teamId);
// Returns: 'TEAM_EDITOR' | 'TEAM_MEMBER' | 'TEAM_VIEWER' | null

// Check if user is owner
const isOwner = managementRole === 'TEAM_OWNER';

// Check if user is billable
const isBillable = operationalRole === 'TEAM_EDITOR';
```

### Auto-Promotion to TEAM_EDITOR

```typescript
// When assigning PROJECT_OWNER or PROJECT_EDITOR
await assignRole({
  userId,
  role: 'PROJECT_OWNER',
  resourceType: 'project',
  resourceId: projectId,
});

// Auto-promote to TEAM_EDITOR (billable)
await autoPromoteToEditor(userId, teamId);

// Or use ensureOperationalRole for more control
await ensureOperationalRole(userId, teamId, 'TEAM_EDITOR');
// Only upgrades if current role is lower, never downgrades
```

---

## FAQ

### Q: Can a user have only a management role without an operational role?
**A:** Technically yes (database allows it), but the UI should always assign both. A user with only TEAM_OWNER would have no content access permissions.

### Q: Can a user have multiple operational roles?
**A:** No. Users should have exactly one operational role (EDITOR, MEMBER, or VIEWER) per team.

### Q: What happens if I assign PROJECT_OWNER to a user with TEAM_VIEWER?
**A:** The `autoPromoteToEditor()` function will upgrade them to TEAM_EDITOR (billable).

### Q: Can I downgrade a TEAM_EDITOR to TEAM_MEMBER?
**A:** Yes, but you must do it explicitly using `updateRole()`. Auto-promotion only upgrades, never downgrades. **Important:** If the user is a PROJECT_OWNER on any projects, the demotion will be blocked. You must transfer project ownership first using `demoteWithOwnershipTransfer()`.

### Q: How do I make a team owner free?
**A:** Assign them TEAM_OWNER (management) + TEAM_VIEWER or TEAM_MEMBER (operational, both free).

### Q: Why separate management and operational roles?
**A:** This allows flexible team management where owners/admins can manage settings without paying for a seat if they don't create content.

### Q: What happens if I try to demote a PROJECT_OWNER from TEAM_EDITOR?
**A:** The system will block the demotion and throw an error listing all projects where the user is owner. You must use `demoteWithOwnershipTransfer()` to transfer ownership to other users first. This prevents orphaned projects without owners.

### Q: How do I check if a user can be safely demoted?
**A:** Use `getOwnedProjects(userId)` to check if they own any projects. If the array is empty, demotion is safe. If not, you need to transfer ownership first.

---

## Related Documentation

- [Authentication System](./SECURITY.md) - User authentication and session management
- [Team Plan Architecture](./TEAM_PLAN_ARCHITECTURE.md) - Team and billing structure
- [Product Overview](./.kiro/steering/product.md) - Product features and user roles
- [API Documentation](./API.md) - API endpoints and authentication

---

## Support

For questions or issues with RBAC:

1. Check this documentation first
2. Review the [Product Overview](./.kiro/steering/product.md) for role definitions
3. Check logs for `rbac.*` events
4. Review the source code in `src/config/roles.ts` and `src/server/auth/rbac.ts`

---

**Last Updated:** November 19, 2025  
**Version:** 2.0.0 (Two-Tier Role System)
