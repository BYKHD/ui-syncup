# Implementation Plan: Refactor Onboarding for Open-Source Self-Hosted Platform

## Overview

This implementation plan refactors the onboarding flow to support a "Pattern A+" approach for open-source self-hosted deployments. The work is organized into phases that build incrementally, ensuring the codebase remains functional at each checkpoint.

---

## Phase 1: Database Schema & Server Foundation

### Task 1.1: Create instance_settings database migration
- [x] 1.1.1 Create migration file: `drizzle/0026_add_instance_settings.sql`
  - Create `instance_settings` table with columns: id, instance_name, public_url, default_workspace_id, default_member_role, setup_completed_at, admin_user_id, created_at, updated_at
  - Add singleton constraint via unique index
  - Add backwards compatibility: INSERT existing setup for instances with users
  - _Requirements: 1.1, 1.2, 4.3, 12.6, 12.7_
  - _Location: `drizzle/0026_add_instance_settings.sql`_

- [x] 1.1.2 Create Drizzle schema definition
  - Define `instanceSettings` table in Drizzle schema
  - Add proper relations to users and workspaces tables
  - Export from schema barrel
  - _Requirements: 4.3_
  - _Location: `src/server/db/schema/instance-settings.ts`_

- [x] 1.1.3 Run migration and verify
  - Run `bun run db:generate` and `bun run db:migrate`
  - Verify table created correctly
  - _Requirements: 4.3_

### Task 1.2: Create workspace mode configuration
- [x] 1.2.1 Create workspace config module
  - Implement `WORKSPACE_CONFIG` constant reading from env
  - Implement `isMultiWorkspaceMode()` utility function
  - Implement `isSingleWorkspaceMode()` utility function
  - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - _Location: `src/config/workspace.ts`_

- [ ]* 1.2.2 Write property tests for workspace mode config
  - **Property 11: Workspace Mode is Consistent**
  - **Validates: Requirements 11.1, 11.2, 11.3, 11.5**
  - _Location: `src/config/__tests__/workspace.property.test.ts`_

### Task 1.3: Create setup server service
- [x] 1.3.1 Create setup service with core operations
  - Implement `getInstanceStatus()`: Check if setup is complete, include defaultWorkspaceId
  - Implement `createAdmin()`: Create first admin user with WORKSPACE_OWNER role
  - Implement `saveInstanceConfig()`: Save instance name and public URL
  - Implement `markSetupComplete()`: Set setup_completed_at timestamp and default workspace
  - _Requirements: 1.1, 1.2, 3.2, 4.3, 12.6_
  - _Location: `src/server/setup/setup-service.ts`_

- [ ]* 1.3.2 Write property tests for setup service
  - **Property 1: Instance State Detection is Idempotent**
  - **Property 2: Admin Account Creation Produces Valid Sessions**
  - **Property 10: Setup Completion Prevents Re-Setup**
  - **Validates: Requirements 1.1, 1.2, 3.2, 3.8, 6.5**
  - _Location: `src/server/setup/__tests__/setup.property.test.ts`_

### Task 1.4: Create health check service
- [x] 1.4.1 Implement service health checks
  - Implement `checkDatabaseHealth()`: Test database connectivity
  - Implement `checkEmailHealth()`: Test Resend API key validity
  - Implement `checkStorageHealth()`: Test R2/S3 credentials
  - Implement `checkRedisHealth()`: Test Redis connectivity
  - Return status with degraded behavior messages for each service
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Location: `src/server/setup/health-check-service.ts`_

- [ ]* 1.4.2 Write property tests for health check service
  - **Property 7: Service Health Check Returns Accurate Status**
  - **Validates: Requirements 2.2, 2.4, 9.1, 9.2, 9.3**
  - _Location: `src/server/setup/__tests__/health-check.property.test.ts`_

### Task 1.5: Create sample data service
- [x] 1.5.1 Implement sample data generation
  - Implement `createSampleProject()`: Create demo project with mock data
  - Include sample issues with various statuses
  - Include sample annotations on mock images
  - Make creation idempotent (check for existing demo project)
  - _Requirements: 6.2, 6.3_
  - _Location: `src/server/setup/sample-data-service.ts`_

- [ ]* 1.5.2 Write property tests for sample data service
  - **Property 8: Sample Data Creation is Idempotent**
  - **Validates: Requirements 6.2, 6.3**
  - _Location: `src/server/setup/__tests__/sample-data.property.test.ts`_

### Task 1.6: Create role terminology migration
- [x] 1.6.1 Create migration file: `drizzle/0027_rename_team_roles_to_workspace.sql`
  - Update `team_members.management_role`: TEAM_OWNER → WORKSPACE_OWNER, TEAM_ADMIN → WORKSPACE_ADMIN
  - Update `team_members.operational_role`: TEAM_EDITOR → WORKSPACE_EDITOR, TEAM_MEMBER → WORKSPACE_MEMBER, TEAM_VIEWER → WORKSPACE_VIEWER
  - Update `team_invitations.role` with same mappings
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.8_
  - _Location: `drizzle/0027_rename_team_roles_to_workspace.sql`_

- [x] 1.6.2 Update roles configuration file
  - Rename `TEAM_ROLES` to `WORKSPACE_ROLES` in `src/config/roles.ts`
  - Update all role constant names: `TEAM_OWNER` → `WORKSPACE_OWNER`, etc.
  - Export backwards-compatible aliases for transition period
  - _Requirements: 14.6, 14.9_
  - _Location: `src/config/roles.ts`_

- [x] 1.6.3 Update RBAC utilities for workspace roles
  - Update permission mappings in `src/server/auth/rbac.ts`
  - Add backwards compatibility layer accepting both TEAM_* and WORKSPACE_* roles
  - _Requirements: 14.7, 14.9_
  - _Location: `src/server/auth/rbac.ts`_

- [x] 1.6.4 Update all files referencing TEAM_* roles
  - `src/features/auth/components/role-gate.tsx`
  - `src/features/team-settings/components/team-members-list.tsx`
  - `src/features/annotations/hooks/use-annotation-permissions.ts`
  - `src/features/teams/hooks/use-team-permissions.ts`
  - `src/features/teams/hooks/use-can-manage-team.ts`
  - `src/features/teams/hooks/use-can-manage-members.ts`
  - `src/server/teams/team-service.ts`
  - `src/server/teams/validation.ts`
  - `src/server/projects/project-service.ts`
  - `src/app/api/teams/route.ts` and sub-routes
  - `src/app/(protected)/(team)/team/settings/page.tsx`
  - _Requirements: 14.1-14.7_
  - _Location: Various (41+ files identified)_

### Task 1.7: Create CLI admin password reset script
- [x] 1.7.1 Create password reset CLI script
  - Create `scripts/admin-reset-password.ts`
  - Implement email lookup and password generation
  - Add to package.json scripts: `"admin:reset-password": "bun scripts/admin-reset-password.ts"`
  - _Requirements: 3.9_
  - _Location: `scripts/admin-reset-password.ts`_

### Task 1.8: Create email verification configuration
- [x] 1.8.1 Add email verification skip config
  - Add `SKIP_EMAIL_VERIFICATION` to environment config
  - Implement `isEmailVerificationRequired()` utility
  - _Requirements: 15.1, 15.5_
  - _Location: `src/config/auth.ts`_

- [x] 1.8.2 Update auth flow for email verification toggle
  - Modify email verification logic to check `SKIP_EMAIL_VERIFICATION`
  - Add startup warning log when verification is disabled
  - _Requirements: 15.2, 15.6_
  - _Location: `src/config/auth.ts` (integrated with auth config module)_

---

## Phase 2: API Routes

### Task 2.1: Create setup API routes
- [x] 2.1.1 Create GET /api/setup/status endpoint
  - Return instance setup status (isSetupComplete, instanceName, defaultWorkspaceId, isMultiWorkspaceMode)
  - Used by proxy to determine routing
  - _Requirements: 1.1, 1.2, 11.4_
  - _Location: `src/app/api/setup/status/route.ts`_

- [x] 2.1.2 Create GET /api/setup/health endpoint
  - Return service health status for all services
  - Include degraded behavior messages
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Location: `src/app/api/setup/health/route.ts`_

- [x] 2.1.3 Create POST /api/setup/admin endpoint
  - Create admin user with validation
  - Return session/auth token
  - Implement rate limiting (5 requests per minute per IP)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10_
  - _Location: `src/app/api/setup/admin/route.ts`_

- [x] 2.1.4 Create POST /api/setup/config endpoint
  - Save instance configuration
  - Validate inputs
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Location: `src/app/api/setup/config/route.ts`_

- [x] 2.1.5 Create POST /api/setup/complete endpoint
  - Mark setup as complete
  - Store default workspace ID for single-workspace mode
  - Optionally create sample data
  - _Requirements: 6.4, 6.5, 12.6_
  - _Location: `src/app/api/setup/complete/route.ts`_

---

## Phase 3: Checkpoint - Core Backend Complete

- [x] 3.1 Verify all server-side tests pass
  - Run `bun run test` for setup service tests
  - Ensure all property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3.2 Verify TypeScript types
  - Run `bun run typecheck`
  - Ensure no type errors in new code

---

## Phase 4: Setup Feature Module (Frontend)

### Task 4.1: Create setup feature scaffolding
- [x] 4.1.1 Create feature directory structure
  - Create `src/features/setup/` with api/, hooks/, components/, screens/, types/, utils/
  - Create barrel exports in index.ts
  - _Location: `src/features/setup/`_

### Task 4.2: Create API layer
- [x] 4.2.1 Create fetchers and DTO schemas
  - Implement `getInstanceStatus()` fetcher (include workspace mode)
  - Implement `getServiceHealth()` fetcher
  - Implement `createAdmin()` fetcher
  - Implement `saveInstanceConfig()` fetcher
  - Implement `completeSetup()` fetcher
  - Define Zod schemas for all DTOs
  - _Location: `src/features/setup/api/`_

### Task 4.3: Create hooks
- [x] 4.3.1 Create React Query hooks
  - Implement `useInstanceStatus()` query hook
  - Implement `useServiceHealth()` query hook
  - Implement `useCreateAdmin()` mutation hook
  - Implement `useSaveInstanceConfig()` mutation hook
  - Implement `useCompleteSetup()` mutation hook
  - _Location: `src/features/setup/hooks/`_

- [x] 4.3.2 Create wizard state hook
  - Implement `useSetupWizard()` for step navigation
  - Track current step, completed steps, form data
  - Handle step validation and progression
  - _Requirements: All setup wizard requirements_
  - _Location: `src/features/setup/hooks/use-setup-wizard.ts`_

- [x] 4.3.3 Create workspace mode hook
  - Implement `useWorkspaceMode()` for client-side mode detection
  - Return isMultiWorkspaceMode and isSingleWorkspaceMode
  - _Requirements: 11.4, 12.1, 13.1_
  - _Location: `src/features/setup/hooks/use-workspace-mode.ts`_

### Task 4.4: Create components
- [x] 4.4.1 Create service health step component
  - Display database, email, storage, Redis status
  - Show degraded behavior messages
  - Display workspace mode indicator
  - Include "Configure Services" expandable section
  - Include "Continue" button when healthy
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Location: `src/features/setup/components/service-health-step.tsx`_

- [x] 4.4.2 Create admin account step component
  - Form fields: Email, Password, Confirm Password, Display Name
  - Client-side validation with error messages
  - Password strength indicator
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_
  - _Location: `src/features/setup/components/admin-account-step.tsx`_

- [x] 4.4.3 Create instance config step component
  - Form fields: Instance Name, Public URL (optional)
  - Display resource limits from QUOTAS config
  - _Requirements: 4.1, 4.2, 4.4_
  - _Location: `src/features/setup/components/instance-config-step.tsx`_

- [x] 4.4.4 Create first workspace step component
  - Form field: Workspace Name
  - Auto-generate and display slug preview
  - Info text: "This will be your default workspace"
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_
  - _Location: `src/features/setup/components/first-workspace-step.tsx`_

- [x] 4.4.5 Create sample data step component
  - Toggle option for creating demo project
  - Description of what sample data includes
  - _Requirements: 6.1, 6.2, 6.3_
  - _Location: `src/features/setup/components/sample-data-step.tsx`_

- [x] 4.4.6 Create setup wizard container component
  - Manage step progression
  - Display progress indicator
  - Handle form submission across steps
  - _Location: `src/features/setup/components/setup-wizard.tsx`_

### Task 4.5: Create screen and route
- [x] 4.5.1 Create setup screen
  - Compose wizard with all steps
  - Handle loading and error states
  - _Location: `src/features/setup/screens/setup-screen.tsx`_

- [x] 4.5.2 Create setup page route
  - Create `/setup` page under `(public)` routes
  - Create layout without sidebar/header
  - _Location: `src/app/(public)/setup/page.tsx`_

---

## Phase 5: Proxy & Routing Logic

### Task 5.1: Update proxy for instance detection
- [ ] 5.1.1 Add setup redirect logic to proxy
  - Check instance status on protected routes
  - Redirect to `/setup` if setup not complete
  - Allow `/setup` routes to proceed regardless
  - Allow API routes to proceed for health checks
  - _Requirements: 1.1, 1.2, 1.3_
  - _Location: `src/proxy.ts`_

---

## Phase 6: Checkpoint - Setup Wizard Complete

- [ ] 6.1 Test complete setup wizard flow
  - Start with empty database
  - Navigate to app → verify redirect to `/setup`
  - Complete all steps → verify redirect to dashboard
  - Navigate to `/setup` again → verify redirect to dashboard
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Refactor Auth Onboarding

### Task 7.1: Refactor onboarding for self-registration
- [ ] 7.1.1 Create self-registration choice component
  - In multi-workspace mode: Display "Create a new workspace" and "I have an invite code" options
  - In single-workspace mode: Auto-join default workspace
  - Use `isMultiWorkspaceMode()` for conditional rendering
  - _Requirements: 8.1, 8.2, 8.3, 12.3, 13.5_
  - _Location: `src/features/auth/components/self-registration-choice.tsx`_

- [ ] 7.1.2 Create invite code input component
  - Input field for manual invite code entry
  - Validate code and proceed to accept flow
  - _Requirements: 8.4, 8.5_
  - _Location: `src/features/auth/components/invite-code-input.tsx`_

- [ ] 7.1.3 Refactor onboarding form
  - Remove plan selector (already done in open-source refactor)
  - Simplify to workspace name input only
  - _Requirements: 5.1, 5.2, 5.3_
  - _Location: `src/features/auth/components/onboarding-form.tsx`_

- [ ] 7.1.4 Create self-registration hook
  - Manage flow state for self-registered users
  - Handle workspace creation with WORKSPACE_OWNER role assignment
  - In single-workspace mode: auto-assign to default workspace as MEMBER
  - _Requirements: 8.3, 8.6, 12.3_
  - _Location: `src/features/auth/hooks/use-self-registration.ts`_

- [ ]* 7.1.5 Write property tests for self-registration
  - **Property 9: Self-Registration Path Assigns WORKSPACE_OWNER Role**
  - **Property 13: Single-Workspace Mode Auto-Joins New Users**
  - **Validates: Requirements 8.6, 12.3**
  - _Location: `src/features/auth/hooks/__tests__/self-registration.property.test.ts`_

### Task 7.2: Refactor invitation acceptance
- [ ] 7.2.1 Create invited user form component
  - Display invitation details (workspace, inviter, role)
  - Show inline account creation if user doesn't exist
  - Show sign-in prompt if user exists
  - _Requirements: 7.2, 7.4, 7.5_
  - _Location: `src/features/auth/components/invited-user-form.tsx`_

- [ ] 7.2.2 Update invitation acceptance hook
  - Handle inline account creation
  - Handle workspace joining for existing users
  - Redirect to workspace dashboard on success
  - _Requirements: 7.6, 7.7_
  - _Location: `src/features/auth/hooks/use-accept-invitation.ts`_

- [ ]* 7.2.3 Write property test for invitation validation
  - **Property 6: Invitation Token Validation Rejects Invalid Tokens**
  - **Validates: Requirements 7.1, 7.3**
  - _Location: `src/features/auth/hooks/__tests__/invitation.property.test.ts`_

- [ ] 7.2.4 Create invitation acceptance route
  - Create `/invite/[token]` page under `(public)` routes
  - Handle token validation and error display
  - _Requirements: 7.1, 7.3_
  - _Location: `src/app/(public)/invite/[token]/page.tsx`_

### Task 7.3: Update onboarding screen
- [ ] 7.3.1 Refactor onboarding screen for role-based flow
  - Detect if user is invited vs self-registered
  - Route to appropriate flow component
  - Handle single vs multi workspace mode
  - _Requirements: 7.1, 8.1, 12.3, 13.5_
  - _Location: `src/features/auth/screens/onboarding-screen.tsx`_

### Task 7.4: Remove deprecated types
- [ ] 7.4.1 Remove PlanTier from auth types
  - Remove `PlanTier` type (already in open-source refactor)
  - Remove `selectedPlan` from OnboardingSchema if present
  - Update validators
  - _Location: `src/features/auth/types/index.ts`_

---

## Phase 8: Workspace Mode UI Conditionals

### Task 8.1: Update sidebar for workspace mode
- [ ] 8.1.1 Conditionally render workspace switcher
  - Hide workspace switcher in single-workspace mode
  - Show workspace switcher in multi-workspace mode
  - Use `isMultiWorkspaceMode()` from config
  - _Requirements: 12.1, 13.1_
  - _Location: `src/components/shared/sidebar/workspace-switcher.tsx`_

- [ ] 8.1.2 Update settings navigation text
  - In single mode: Use "Settings" label
  - In multi mode: Use "Workspace Settings" label
  - _Requirements: 12.4_
  - _Location: `src/components/shared/sidebar/app-sidebar.tsx`_

- [ ]* 8.1.3 Write property tests for workspace mode UI
  - **Property 12: Single-Workspace Mode Hides Multi-Workspace UI**
  - **Property 14: Multi-Workspace Mode Shows Full UI**
  - **Validates: Requirements 12.1, 12.2, 13.1**
  - _Location: `src/components/shared/sidebar/__tests__/workspace-mode.property.test.tsx`_

### Task 8.2: Update workspace creation buttons
- [ ] 8.2.1 Conditionally hide "Create workspace" buttons
  - Hide in single-workspace mode throughout UI
  - Show in multi-workspace mode
  - _Requirements: 12.2, 13.2_
  - _Files to update:_
    - `src/components/shared/sidebar/sidebar-team-switcher.tsx` ("New Workspace" option)
    - `src/features/teams/components/team-list.tsx` (if exists, "Create Team" button)
    - `src/features/auth/screens/onboarding-screen.tsx` ("Create workspace" choice)
    - Any dropdown menu items for workspace creation

---

## Phase 9: Graceful Degradation

### Task 9.1: Update invitation UI for email fallback
- [ ] 9.1.1 Add "Copy Link" button to invitation modal
  - Check if email service is configured
  - Show "Copy Invitation Link" button if not
  - Show "Send Email" button if configured
  - _Requirements: 9.1_
  - _Location: `src/features/team-settings/components/invite-member-dialog.tsx`_

### Task 9.2: Add admin settings banner
- [ ] 9.2.1 Create service status banner component
  - Display when optional services not configured
  - Show degraded functionality for each service
  - Link to documentation for configuration
  - _Requirements: 9.4_
  - _Location: `src/components/shared/service-status-banner.tsx`_

- [ ] 9.2.2 Add banner to admin layouts
  - Include in workspace settings and admin pages
  - _Requirements: 9.4_
  - _Location: `src/app/(protected)/(workspace)/workspace/settings/layout.tsx`_

---

## Phase 10: Post-Setup Admin Settings

### Task 10.1: Create instance settings UI
- [ ] 10.1.1 Add instance settings page to admin section
  - Display current instance configuration
  - Allow editing instance name, public URL, and default member role
  - Display service status (read-only)
  - Display workspace mode (read-only)
  - Display email verification status with warning if disabled
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.8, 15.3_
  - _Location: `src/app/(protected)/(workspace)/workspace/settings/(section)/instance/page.tsx`_

- [ ] 10.1.2 Add instance settings navigation item
  - Add to workspace settings navigation (admin only)
  - _Location: `src/config/workspace-settings-nav.ts`_

### Task 10.2: Create audit logging for admin actions
- [ ] 10.2.1 Create audit log utility
  - Implement `logAdminAction()` function with timestamp, userId, action, changes
  - Support structured logging format
  - _Requirements: 10.6_
  - _Location: `src/server/audit/audit-service.ts`_

- [ ] 10.2.2 Add audit logging to admin operations
  - Log instance settings changes
  - Log role changes
  - Log member additions/removals
  - _Requirements: 10.6_
  - _Location: Integration in relevant API routes_

### Task 10.3: Create instance backup/restore functionality
- [ ] 10.3.1 Create export settings API
  - Export instance configuration as JSON
  - Exclude sensitive data (passwords, tokens)
  - _Requirements: 10.7_
  - _Location: `src/app/api/setup/export/route.ts`_

- [ ] 10.3.2 Create import settings API
  - Import instance configuration from JSON backup
  - Validate imported data structure
  - _Requirements: 10.8_
  - _Location: `src/app/api/setup/import/route.ts`_

- [ ] 10.3.3 Add FORCE_SETUP support to proxy
  - Check for FORCE_SETUP env var
  - Allow re-running setup wizard when set
  - Preserve existing data during re-setup
  - _Requirements: 10.9_
  - _Location: `src/proxy.ts`_

---

## Phase 11: Final Verification & Cleanup

### Task 11.1: Run full test suite
- [ ] Run `bun run test` to execute all unit tests
- [ ] Verify all tests pass
- [ ] Fix any remaining test failures

### Task 11.2: Run type checking
- [ ] Run `bun run typecheck` to verify no TypeScript errors
- [ ] Fix any remaining type errors

### Task 11.3: Run linting
- [ ] Run `bun run lint` to check for code quality issues
- [ ] Fix any linting errors

### Task 11.4: Test application build
- [ ] Run `bun run build` to verify production build succeeds
- [ ] Verify no build errors or warnings

### Task 11.5: Manual testing
- [ ] Test fresh instance setup wizard flow
- [ ] Test invited user flow (with and without existing account)
- [ ] Test self-registration flow (create workspace vs join workspace)
- [ ] Test single-workspace mode UI (hidden switcher, auto-join)
- [ ] Test multi-workspace mode UI (visible switcher, create option)
- [ ] Test service degradation (remove email config, test copy link)
- [ ] Test post-setup admin settings modification
- [ ] Verify no console errors

---

## Notes

- Property tests are marked as optional (`*`) but highly recommended for correctness guarantees
- Each phase should pass TypeScript checks before proceeding to the next
- The migration (Task 1.1.1) handles backwards compatibility for existing instances
- Service degradation logic should be tested with various env var configurations
- Workspace mode is read-only at runtime (requires restart to change)
- Role terminology migration (Task 1.6) affects 41+ files - consider using find-and-replace with review
- CLI password reset (Task 1.7) is critical for self-hosted instances without email configuration
- Email verification toggle (Task 1.8) should be tested in both enabled and disabled states
- Audit logging (Task 10.2) should use structured logging for compliance purposes
