# Design Document: Refactor Onboarding for Open-Source Self-Hosted Platform

## Overview

This design implements a "Pattern A+" onboarding system for UI SyncUp's open-source self-hosted deployment model. The system detects instance state, guides first-time administrators through setup, and provides streamlined flows for invited and self-registered users.

### Key Design Decisions

1. **Infrastructure as Pre-requisites**: Database, storage, email, and Redis are configured via environment variables before app startup, not within the app
2. **Graceful Degradation**: Optional services (email, storage, Redis) work in degraded modes when not configured
3. **Instance Settings Table**: Instance-level configuration stored in DB rather than only in env vars, allowing admin updates
4. **Role-Based Flow Detection**: System detects user context (admin setup, invited, self-registered) and routes appropriately
5. **Configurable Workspace Mode**: Single-workspace (default) or multi-workspace mode via `MULTI_WORKSPACE_MODE` env var

---

## Architecture

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Request   │
                              └──────┬──────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────────┐
                   │         Proxy (src/proxy.ts)        │
                   │  Check instance setup state         │
                   └─────────────────┬───────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
              Setup Required                   Setup Complete
                     │                               │
                     ▼                               ▼
        ┌────────────────────────┐    ┌────────────────────────────┐
        │  /setup/*              │    │  Normal App Routes         │
        │  Setup Wizard Routes   │    │  /sign-in, /dashboard, etc │
        └────────────────────────┘    └────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────────────────────────┐
        │                   SETUP WIZARD FLOW                    │
        │                                                        │
        │  ┌──────────┐   ┌──────────┐   ┌──────────┐           │
        │  │ Health   │──▶│ Admin    │──▶│ Instance │           │
        │  │ Check    │   │ Account  │   │ Config   │           │
        │  └──────────┘   └──────────┘   └──────────┘           │
        │        │              │              │                 │
        │        ▼              ▼              ▼                 │
        │  ┌──────────┐   ┌──────────┐   ┌──────────┐           │
        │  │ First    │──▶│ Sample   │──▶│ Complete │           │
        │  │Workspace │   │ Data     │   │ Redirect │           │
        │  └──────────┘   └──────────┘   └──────────┘           │
        │                                                        │
        └────────────────────────────────────────────────────────┘
```

### Workspace Mode Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKSPACE MODE DETECTION                            │
└─────────────────────────────────────────────────────────────────────────────┘

                     ┌──────────────────────────────┐
                     │       Application Start      │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │  Read MULTI_WORKSPACE_MODE   │
                     │  from environment            │
                     └──────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
              false (default)                     true
                    │                               │
                    ▼                               ▼
         ┌──────────────────────┐     ┌──────────────────────┐
         │  SINGLE WORKSPACE    │     │  MULTI WORKSPACE     │
         │  MODE                │     │  MODE                │
         │                      │     │                      │
         │  • Hide switcher     │     │  • Show switcher     │
         │  • Auto-join default │     │  • Allow creation    │
         │  • Simplified UI     │     │  • Full management   │
         └──────────────────────┘     └──────────────────────┘
```

### Onboarding Route Architecture

```
src/app/
├── (public)/
│   ├── setup/                          # NEW: Instance setup routes
│   │   ├── page.tsx                    # Setup wizard entry point
│   │   ├── layout.tsx                  # Setup layout (no sidebar)
│   │   └── complete/
│   │       └── page.tsx                # Setup complete confirmation
│   │
│   ├── sign-in/page.tsx                # Existing: Sign in
│   ├── sign-up/page.tsx                # Existing: Sign up
│   └── invite/                         # NEW: Invitation handling
│       └── [token]/
│           └── page.tsx                # Accept invitation route
│
└── (protected)/
    └── onboarding/                     # REFACTOR: Post-auth onboarding
        └── page.tsx                    # Workspace creation for self-registered
```

---

## Components and Interfaces

### New Config Module: `config/workspace`

```typescript
// src/config/workspace.ts
export const WORKSPACE_CONFIG = {
  multiWorkspaceMode: process.env.MULTI_WORKSPACE_MODE === 'true',
} as const;

export function isMultiWorkspaceMode(): boolean {
  return WORKSPACE_CONFIG.multiWorkspaceMode;
}

export function isSingleWorkspaceMode(): boolean {
  return !WORKSPACE_CONFIG.multiWorkspaceMode;
}
```

### New Feature Module: `features/setup`

```
src/features/setup/
├── api/
│   ├── get-instance-status.ts          # Check if setup is complete
│   ├── get-service-health.ts           # Check service connectivity
│   ├── create-admin.ts                 # Create first admin user
│   ├── save-instance-config.ts         # Save instance settings
│   └── types.ts                        # DTO schemas
├── hooks/
│   ├── use-instance-status.ts          # Query: instance setup state
│   ├── use-service-health.ts           # Query: service connectivity
│   ├── use-create-admin.ts             # Mutation: create admin
│   ├── use-save-instance-config.ts     # Mutation: save config
│   ├── use-setup-wizard.ts             # Wizard state management
│   └── use-workspace-mode.ts           # NEW: Workspace mode detection
├── components/
│   ├── setup-wizard.tsx                # Main wizard container
│   ├── service-health-step.tsx         # Step 1: Health check
│   ├── admin-account-step.tsx          # Step 2: Admin creation
│   ├── instance-config-step.tsx        # Step 3: Configuration
│   ├── first-workspace-step.tsx        # Step 4: Workspace creation
│   ├── sample-data-step.tsx            # Step 5: Optional sample data
│   ├── service-status-badge.tsx        # Individual service status
│   └── setup-progress.tsx              # Progress indicator
├── screens/
│   └── setup-screen.tsx                # Main setup screen
├── types/
│   └── index.ts                        # Domain types
├── utils/
│   ├── service-checks.ts               # Service connectivity utils
│   └── validators.ts                   # Zod schemas
└── index.ts                            # Barrel export
```

### Refactored Module: `features/auth`

```
src/features/auth/
├── components/
│   ├── onboarding-form.tsx             # REFACTOR: Workspace creation
│   ├── invited-user-form.tsx           # NEW: Invitation acceptance
│   ├── self-registration-choice.tsx    # NEW: Create workspace vs join
│   └── invite-code-input.tsx           # NEW: Manual invite code entry
├── hooks/
│   ├── use-onboarding.ts               # REFACTOR: Workspace creation
│   ├── use-accept-invitation.ts        # REFACTOR: Inline account creation
│   └── use-self-registration.ts        # NEW: Self-registration flow
├── screens/
│   ├── onboarding-screen.tsx           # REFACTOR: Workspace creation only
│   └── invite-accept-screen.tsx        # NEW: Invitation acceptance
└── types/
    └── index.ts                        # REFACTOR: Remove PlanTier
```

### Conditional UI Components

```typescript
// src/components/shared/sidebar/workspace-switcher.tsx
import { isMultiWorkspaceMode } from '@/config/workspace';

export function WorkspaceSwitcher() {
  // Hide entirely in single-workspace mode
  if (!isMultiWorkspaceMode()) {
    return null;
  }
  
  return (
    // Full workspace switcher UI
  );
}

// src/features/auth/components/self-registration-choice.tsx
import { isMultiWorkspaceMode, isSingleWorkspaceMode } from '@/config/workspace';

export function SelfRegistrationChoice() {
  // In single-workspace mode, auto-join default workspace
  if (isSingleWorkspaceMode()) {
    return <AutoJoinDefaultWorkspace />;
  }
  
  // In multi-workspace mode, show choice
  return (
    <div>
      <CreateWorkspaceOption />
      <JoinWithInviteOption />
    </div>
  );
}
```

### Server-Side Services

```
src/server/
├── setup/                               # NEW: Instance setup service
│   ├── setup-service.ts                 # Core setup operations
│   ├── health-check-service.ts          # Service connectivity checks
│   ├── sample-data-service.ts           # Demo data generation
│   └── types.ts                         # Internal types
├── db/schema/
│   └── instance-settings.ts             # NEW: Instance settings table
└── workspaces/                          # RENAMED from teams/
    └── workspace-service.ts             # REFACTOR: Workspace operations
```

---

## Data Models

### New Table: `instance_settings`

```sql
CREATE TABLE instance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name VARCHAR(100) NOT NULL DEFAULT 'UI SyncUp',
    public_url VARCHAR(255),
    default_workspace_id UUID REFERENCES workspaces(id),  -- For single-workspace mode
    default_member_role VARCHAR(50) DEFAULT 'WORKSPACE_MEMBER',  -- NEW: Configurable default role
    setup_completed_at TIMESTAMP WITH TIME ZONE,
    admin_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Only one row should exist (singleton)
CREATE UNIQUE INDEX instance_settings_singleton ON instance_settings ((TRUE));
```

### Drizzle Schema Definition

```typescript
// src/server/db/schema/instance-settings.ts
import { pgTable, uuid, varchar, timestamp, uniqueIndex, sql } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const instanceSettings = pgTable('instance_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  instanceName: varchar('instance_name', { length: 100 }).notNull().default('UI SyncUp'),
  publicUrl: varchar('public_url', { length: 255 }),
  defaultWorkspaceId: uuid('default_workspace_id').references(() => workspaces.id),
  defaultMemberRole: varchar('default_member_role', { length: 50 }).default('WORKSPACE_MEMBER'),  // NEW
  setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),
  adminUserId: uuid('admin_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  singletonIdx: uniqueIndex('instance_settings_singleton').on(sql`TRUE`),
}));
```

### TypeScript Types

```typescript
// src/features/setup/types/index.ts

export type InstanceStatus = {
  isSetupComplete: boolean;
  instanceName: string | null;
  publicUrl: string | null;
  adminEmail: string | null;
  defaultWorkspaceId: string | null;
  defaultMemberRole: 'WORKSPACE_VIEWER' | 'WORKSPACE_MEMBER' | 'WORKSPACE_EDITOR';  // NEW
  isMultiWorkspaceMode: boolean;
  skipEmailVerification: boolean;  // NEW
};

export type ServiceStatus = 'connected' | 'not_configured' | 'error';

export type ServiceHealth = {
  database: { status: ServiceStatus; message: string };
  email: { status: ServiceStatus; message: string; degradedBehavior: string };
  storage: { status: ServiceStatus; message: string; degradedBehavior: string };
  redis: { status: ServiceStatus; message: string; degradedBehavior: string };
};

export type SetupWizardStep = 
  | 'health-check'
  | 'admin-account'
  | 'instance-config'
  | 'first-workspace'
  | 'sample-data'
  | 'complete';

export interface SetupWizardState {
  currentStep: SetupWizardStep;
  completedSteps: SetupWizardStep[];
  adminData: { email: string; name: string } | null;
  instanceData: { name: string; publicUrl: string } | null;
  workspaceData: { name: string; slug: string } | null;
  includeSampleData: boolean;
}

// src/config/workspace.ts
export type WorkspaceMode = 'single' | 'multi';

export interface WorkspaceConfig {
  mode: WorkspaceMode;
  multiWorkspaceMode: boolean;
}
```

---

## Correctness Properties

> A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Instance State Detection is Idempotent
*For any* sequence of requests to the application, the instance state check SHALL return the same result until setup is explicitly completed.
**Validates: Requirements 1.1, 1.2**

### Property 2: Admin Account Creation Produces Valid Sessions
*For any* valid admin account creation request (valid email, valid password), the system SHALL create exactly one admin user with WORKSPACE_OWNER role and a valid session.
**Validates: Requirements 3.2, 3.8**

### Property 3: Password Validation Rejects Weak Passwords
*For any* password with fewer than 8 characters OR missing a letter OR missing a number, the system SHALL reject the password with a specific error message.
**Validates: Requirements 3.4, 3.6**

### Property 4: Instance Configuration Persistence Round-Trip
*For any* valid instance configuration (name, public URL), saving and then reading the configuration SHALL produce an equivalent configuration object.
**Validates: Requirements 4.3**

### Property 5: Workspace Name Slug Generation is Deterministic
*For any* workspace name, generating a slug SHALL always produce the same URL-safe slug, and the slug SHALL be between 2 and 50 characters.
**Validates: Requirements 5.3, 5.4**

### Property 6: Invitation Token Validation Rejects Invalid Tokens
*For any* invitation token that does not exist in the database OR is expired, the system SHALL display an error and SHALL NOT add the user to any workspace.
**Validates: Requirements 7.1, 7.3**

### Property 7: Service Health Check Returns Accurate Status
*For any* optional service (email, storage, Redis), when environment variables are missing, the service status SHALL return "not_configured" with the correct degraded behavior message.
**Validates: Requirements 2.2, 2.4, 9.1, 9.2, 9.3**

### Property 8: Sample Data Creation is Idempotent
*For any* workspace, requesting sample data creation multiple times SHALL result in exactly one sample project being created (no duplicates).
**Validates: Requirements 6.2, 6.3**

### Property 9: Self-Registration Path Assigns WORKSPACE_OWNER Role
*For any* self-registered user who creates a new workspace, the system SHALL assign them the WORKSPACE_OWNER role for that workspace.
**Validates: Requirements 8.6**

### Property 10: Setup Completion Prevents Re-Setup
*For any* instance where `setupCompletedAt` is not null, navigating to `/setup` SHALL redirect to the dashboard, not allow re-running setup.
**Validates: Requirements 1.2, 6.5**

### Property 11: Workspace Mode is Consistent
*For any* application session, the workspace mode (single or multi) SHALL remain constant and match the `MULTI_WORKSPACE_MODE` environment variable value.
**Validates: Requirements 11.1, 11.2, 11.3, 11.5**

### Property 12: Single-Workspace Mode Hides Multi-Workspace UI
*For any* page render in single-workspace mode, the workspace switcher and "Create new workspace" buttons SHALL NOT be visible in the DOM.
**Validates: Requirements 12.1, 12.2**

### Property 13: Single-Workspace Mode Auto-Joins New Users
*For any* new user registration in single-workspace mode, the user SHALL automatically be added to the default workspace with WORKSPACE_MEMBER role.
**Validates: Requirements 12.3**

### Property 14: Multi-Workspace Mode Shows Full UI
*For any* page render in multi-workspace mode, the workspace switcher SHALL be visible and functional.
**Validates: Requirements 13.1, 13.2**

---

## Error Handling

### Service Health Errors

| Service | Error Condition | User-Facing Message | System Action |
|---------|----------------|---------------------|---------------|
| Database | Connection refused | "Cannot connect to database. Please check your DATABASE_URL configuration." | Block setup, display troubleshooting guide |
| Database | Migration needed | "Database schema is out of date. Please run migrations." | Block setup, show `bun run db:migrate` |
| Email | API key invalid | "Email service not configured." | Continue with "Copy Link" fallback |
| Storage | Credentials invalid | "Cloud storage not configured." | Continue with local storage fallback |
| Redis | Connection refused | "Redis not configured." | Continue with in-memory rate limiting |

### Form Validation Errors

| Field | Validation Rule | Error Message |
|-------|-----------------|---------------|
| Email | Must be valid email format | "Please enter a valid email address" |
| Password | Min 8 chars, 1 letter, 1 number | "Password must be at least 8 characters with at least one letter and one number" |
| Password Confirm | Must match password | "Passwords do not match" |
| Display Name | 2-100 characters | "Display name must be between 2 and 100 characters" |
| Workspace Name | 2-50 characters | "Workspace name must be between 2 and 50 characters" |
| Instance Name | 2-100 characters | "Instance name must be between 2 and 100 characters" |
| Public URL | Valid URL or empty | "Please enter a valid URL (e.g., https://app.example.com)" |

### Invitation Errors

| Error Condition | Error Message | Recovery Action |
|-----------------|---------------|-----------------|
| Token not found | "This invitation link is invalid." | "Request a new invitation from your workspace admin" |
| Token expired | "This invitation has expired." | "Request a new invitation from your workspace admin" |
| Token already used | "This invitation has already been used." | "Sign in to access your workspace" |
| Workspace not found | "The workspace no longer exists." | "Contact support" |

---

## Testing Strategy

### Unit Tests

Co-located with source files in `__tests__/` folders:

```
src/features/setup/hooks/__tests__/
├── use-setup-wizard.test.ts            # Wizard state management
├── use-service-health.test.ts          # Service health queries
├── use-workspace-mode.test.ts          # NEW: Workspace mode detection

src/server/setup/__tests__/
├── setup-service.test.ts               # Admin creation, instance config
├── health-check-service.test.ts        # Service connectivity
├── sample-data-service.test.ts         # Demo data generation

src/config/__tests__/
├── workspace.test.ts                   # NEW: Workspace config utility
```

### Property-Based Tests

```
src/server/setup/__tests__/
├── setup.property.test.ts              # Properties 1, 2, 3, 4, 10
├── service-health.property.test.ts     # Property 7

src/features/auth/hooks/__tests__/
├── invitation.property.test.ts         # Property 6, 9

src/server/workspaces/__tests__/
├── workspace-slug.property.test.ts     # Property 5
├── sample-data.property.test.ts        # Property 8

src/config/__tests__/
├── workspace-mode.property.test.ts     # NEW: Properties 11, 12, 13, 14
```

### E2E Tests (Playwright)

```
tests/e2e/
├── setup-wizard.spec.ts                # Full setup wizard flow
├── invited-user.spec.ts                # Invitation acceptance flow
├── self-registration.spec.ts           # Self-registration flow
├── workspace-mode-single.spec.ts       # NEW: Single-workspace mode UI
├── workspace-mode-multi.spec.ts        # NEW: Multi-workspace mode UI
```

### Manual Verification

1. **Fresh Instance Setup**:
   - Start with empty database
   - Navigate to app → verify redirect to `/setup`
   - Complete wizard → verify redirect to dashboard
   - Navigate to `/setup` again → verify redirect to dashboard

2. **Service Degradation**:
   - Remove `RESEND_API_KEY` from env
   - Create invitation → verify "Copy Link" button appears
   - Remove R2 credentials → verify local storage works

3. **Invitation Flow**:
   - Create invitation → copy link
   - Open in incognito → verify account creation + workspace join

4. **Single-Workspace Mode** (NEW):
   - Set `MULTI_WORKSPACE_MODE=false` (or unset)
   - Verify workspace switcher is hidden
   - Verify new users auto-join default workspace
   - Verify "Create workspace" buttons are hidden

5. **Multi-Workspace Mode** (NEW):
   - Set `MULTI_WORKSPACE_MODE=true`
   - Verify workspace switcher is visible
   - Verify users can create new workspaces
   - Verify "Create workspace" buttons are visible

---

## Migration Plan

### Database Migration: `0026_add_instance_settings.sql`

```sql
-- Create instance_settings table
CREATE TABLE instance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name VARCHAR(100) NOT NULL DEFAULT 'UI SyncUp',
    public_url VARCHAR(255),
    default_workspace_id UUID REFERENCES workspaces(id),
    default_member_role VARCHAR(50) DEFAULT 'WORKSPACE_MEMBER',
    setup_completed_at TIMESTAMP WITH TIME ZONE,
    admin_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Singleton constraint
CREATE UNIQUE INDEX instance_settings_singleton ON instance_settings ((TRUE));

-- For existing instances: Mark setup as complete if users exist
INSERT INTO instance_settings (instance_name, setup_completed_at, admin_user_id, default_workspace_id)
SELECT 
    'UI SyncUp',
    NOW(),
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    (SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users);
```

### Database Migration: `0027_rename_team_roles_to_workspace.sql`

```sql
-- Migrate role names from TEAM_* to WORKSPACE_*
-- This migration updates existing role values in team_members table

-- Update management roles
UPDATE team_members SET management_role = 'WORKSPACE_OWNER' WHERE management_role = 'TEAM_OWNER';
UPDATE team_members SET management_role = 'WORKSPACE_ADMIN' WHERE management_role = 'TEAM_ADMIN';

-- Update operational roles
UPDATE team_members SET operational_role = 'WORKSPACE_EDITOR' WHERE operational_role = 'TEAM_EDITOR';
UPDATE team_members SET operational_role = 'WORKSPACE_MEMBER' WHERE operational_role = 'TEAM_MEMBER';
UPDATE team_members SET operational_role = 'WORKSPACE_VIEWER' WHERE operational_role = 'TEAM_VIEWER';

-- Update team_invitations table if applicable
UPDATE team_invitations SET role = 'WORKSPACE_OWNER' WHERE role = 'TEAM_OWNER';
UPDATE team_invitations SET role = 'WORKSPACE_ADMIN' WHERE role = 'TEAM_ADMIN';
UPDATE team_invitations SET role = 'WORKSPACE_EDITOR' WHERE role = 'TEAM_EDITOR';
UPDATE team_invitations SET role = 'WORKSPACE_MEMBER' WHERE role = 'TEAM_MEMBER';
UPDATE team_invitations SET role = 'WORKSPACE_VIEWER' WHERE role = 'TEAM_VIEWER';
```

---

## CLI Scripts

### Admin Password Reset Script

```typescript
// scripts/admin-reset-password.ts
// Usage: bun run admin:reset-password <email>

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/server/auth/password';
import { randomBytes } from 'crypto';

async function resetAdminPassword(email: string) {
  // Validate email exists and is admin
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.error(`User with email ${email} not found`);
    process.exit(1);
  }

  // Generate temporary password
  const tempPassword = randomBytes(12).toString('base64url');
  const hashedPassword = await hashPassword(tempPassword);

  // Update password
  await db.update(users)
    .set({ 
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log('');
  console.log('✅ Password reset successfully');
  console.log('');
  console.log(`   Temporary password: ${tempPassword}`);
  console.log('');
  console.log('   Please change this password after signing in.');
  console.log('');
}

// Execute
const email = process.argv[2];
if (!email) {
  console.error('Usage: bun run admin:reset-password <email>');
  process.exit(1);
}

resetAdminPassword(email);
```

---

## Backwards Compatibility

- Existing instances with users will have `setup_completed_at` pre-populated
- New instances will go through setup wizard
- No breaking changes to existing API endpoints
- **Role Migration**: Legacy `TEAM_*` roles are migrated to `WORKSPACE_*` roles automatically
- **Transition Period**: RBAC utilities will accept both `TEAM_*` and `WORKSPACE_*` roles during a transition period
- `teams` table will be renamed to `workspaces` in a future migration (semantic change)

---

## Environment Variables Summary

| Variable | Default | Description |
|----------|---------|-------------|
| `MULTI_WORKSPACE_MODE` | `false` | Enable multi-workspace features |
| `SKIP_EMAIL_VERIFICATION` | `false` | Bypass email verification for new accounts |
| `FORCE_SETUP` | `false` | Re-run setup wizard while preserving existing data |

