# Role-Based Access Control (RBAC) Documentation

## Overview

UI SyncUp uses a comprehensive Role-Based Access Control (RBAC) system to manage user permissions across teams and projects. This document explains the role hierarchy, permissions model, and how to use the RBAC utilities in your code.

## Table of Contents

- [Role Hierarchy](#role-hierarchy)
- [Architecture](#architecture)
- [Permissions Model](#permissions-model)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

---

## Architecture

### Role Storage (Single Source of Truth)

UI SyncUp uses a **consolidated role storage** pattern where each resource type has a single source of truth:

| Resource Type | Table | Columns |
|---------------|-------|---------|
| **Team** | `team_members` | `managementRole`, `operationalRole` |
| **Project** | `project_members` | `role` |

This ensures:
- ✅ No data inconsistency between tables
- ✅ Single write location for role changes
- ✅ Simpler permission queries
- ✅ Clear ownership of role data

### Permission Resolution

```
hasPermission(userId, permission, resourceType, resourceId)
  │
  ├── resourceType = "project"
  │   └── Query project_members → Check role permissions
  │
  └── resourceType = "team"
      └── Query team_members → Check management + operational role permissions
```


## Role Hierarchy

### Team Roles (Two-Tier Hierarchy)

Team roles are split into **management roles** (control team settings) and **operational roles** (determine content access).

#### Management Roles

| Role | Description |
|------|-------------|
| **TEAM_OWNER** | Full control over team, billing, and members. Can transfer ownership and delete team. Must also have an operational role. |
| **TEAM_ADMIN** | Manage team members, projects, and integrations. Cannot delete team or transfer ownership. Must also have an operational role. |

#### Operational Roles (Determine Access)

| Role | Level | Description |
|------|-------|-------------|
| **TEAM_EDITOR** | 3 | Create and manage issues and annotations. Automatically assigned when user becomes PROJECT_OWNER or PROJECT_EDITOR. |
| **TEAM_MEMBER** | 2 | View projects and comment on issues. Can be assigned to projects. |
| **TEAM_VIEWER** | 1 | View-only access to projects and issues. No modifications. |

#### Role Combinations

Users have **one management role** (optional) + **one operational role** (required):

- `TEAM_OWNER` + `TEAM_EDITOR` → Uses 1 editor quota (owner who creates issues)
- `TEAM_OWNER` + `TEAM_MEMBER` → Uses 0 quota (owner who only manages)
- `TEAM_ADMIN` + `TEAM_VIEWER` → Uses 0 quota (admin with read-only)
- `TEAM_EDITOR` (no management) → Uses 1 editor quota (designer/QA)
- `TEAM_MEMBER` (no management) → Uses 0 quota (developer)

### Project Roles

Use project roles to define permissions for specific projects.

| Role | Level | Description |
|------|-------|-------------|
| **PROJECT_OWNER** | 4 | Full control over project and its issues. Can manage project members. |
| **PROJECT_EDITOR** | 3 | Create and manage issues and annotations. Cannot manage project settings. |
| **PROJECT_DEVELOPER** | 2 | Update issue status and comment. Typical developer workflow. |
| **PROJECT_VIEWER** | 1 | View-only access to project and issues. No modifications. |

### Role Hierarchy Rules

1. **Management roles are separate from operational roles** - TEAM_OWNER/ADMIN control settings, operational roles control content access
2. **Users must have both a management role AND an operational role** if they need both capabilities
3. **Quotas are determined by operational role** - TEAM_EDITOR uses a resource seat
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

When changing roles that affect quotas, use transactions to ensure consistency:

```typescript
await db.transaction(async (tx) => {
  await removeRole({ userId, role: oldRole, resourceType, resourceId });
  await assignRole({ userId, role: newRole, resourceType, resourceId });
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

test('Property: Resource usage is tracked correctly', () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      fc.uuid(),
      async (userId, teamId) => {
        const usageBefore = await getTeamUsage(teamId);
        
        // Check quotas
        const result = await checkResourceLimit(teamId, 'members');
        
        expect(result).toBeDefined();
        expect(result.allowed).toBeDefined();
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

#### 2. Resource Quota Exceeded

**Problem:** Cannot assign role because team has reached resource quotas.

**Solution:**
- Check current usage: `await getTeamUsage(teamId)`
- Verify team's quotas in environment variables
- Increase instance limits if valid
- Remove unused members or resources

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
// Owner who creates content
await assignRoles([
  { userId, role: 'TEAM_OWNER', resourceType: 'team', resourceId: teamId },
  { userId, role: 'TEAM_EDITOR', resourceType: 'team', resourceId: teamId },
]);

// Owner who only manages
await assignRoles([
  { userId, role: 'TEAM_OWNER', resourceType: 'team', resourceId: teamId },
  { userId, role: 'TEAM_VIEWER', resourceType: 'team', resourceId: teamId },
]);
```

### Creating Team Admins

```typescript
// Admin who creates content
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
// Designer/QA
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

// Auto-promote to TEAM_EDITOR
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
**A:** The `autoPromoteToEditor()` function will upgrade them to TEAM_EDITOR.

### Q: Can I downgrade a TEAM_EDITOR to TEAM_MEMBER?
**A:** Yes, but you must do it explicitly using `updateRole()`. Auto-promotion only upgrades, never downgrades. **Important:** If the user is a PROJECT_OWNER on any projects, the demotion will be blocked. You must transfer project ownership first using `demoteWithOwnershipTransfer()`.


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
- [Resource Limits & Quotas](./RESOURCE_LIMITS.md) - Resource usage and limits
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
