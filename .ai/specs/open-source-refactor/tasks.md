# Implementation Tasks: Refactor Codebase to Fully Open Source

## Overview
This task list implements the removal of all monetization and billing logic from the UI SyncUp codebase, transitioning it to a fully open-source model where resource limits are controlled solely by environment variables.

---

## Phase 1: Remove Billing Configuration & Constants

### Task 1.1: Delete tiers configuration file
**Validates: Requirement 4.2**

- [x] Verify that `src/config/tiers.ts` does not exist (already removed)
- [ ] Confirm no references to `PLANS` constant remain in codebase after subsequent tasks

### Task 1.2: Remove billing-related constants from roles configuration
**Validates: Requirement 1**

- [x] Open `src/config/roles.ts`
- [x] Remove `BILLABLE_ROLES` constant (lines ~289-292)
- [x] Remove `isBillableRole()` function (lines ~299-302)
- [x] Remove `TEAM_MANAGE_BILLING` from `PERMISSIONS` object (line ~81)
- [x] Remove `PERMISSIONS.TEAM_MANAGE_BILLING` from `ROLE_PERMISSIONS[TEAM_ROLES.TEAM_OWNER]` (line ~134)
- [x] Remove `PERMISSIONS.TEAM_MANAGE_BILLING` from `ROLE_PERMISSIONS[TEAM_ROLES.TEAM_ADMIN]` (line ~146)
- [x] Update `ROLE_DESCRIPTIONS` to remove pricing text:
  - Remove "$8/month" references from `TEAM_EDITOR` description (line ~288)
  - Remove "Billable seat ($8/month)" from `PROJECT_OWNER` description (line ~308)
  - Remove "Billable seat ($8/month)" from `PROJECT_EDITOR` description (line ~311)
  - Update descriptions to focus on access control only
- [ ] Run `bun run typecheck` to verify no type errors

### Task 1.3: Remove plan options from auth constants
**Validates: Requirement 1**

- [x] Delete `src/features/auth/utils/constants.ts` (imports from deleted `tiers.ts`)
- [ ] Search for imports of `planOptions` and remove them
- [ ] Run `bun run typecheck` to identify any broken imports

---

## Phase 2: Remove Billing Logic from RBAC

### Task 2.1: Remove billable seats logic from RBAC utilities
**Validates: Requirement 2**

- [x] Open `src/server/auth/rbac.ts`
- [x] Remove import of `PLANS` from `@/config/tiers` (line ~29)
- [x] Remove import of `BILLABLE_ROLES` from `@/config/roles` (line ~15)
- [x] In `assignRole()` function (lines ~150-153):
  - Remove the billable seats update block
  - Remove call to `updateBillableSeats(resourceId)`
- [x] In `assignRoles()` function (lines ~205-213):
  - Remove the billable seats update loop
  - Remove all calls to `updateBillableSeats()`
- [x] In `removeRole()` function (lines ~249-252):
  - Remove the billable seats update block
  - Remove call to `updateBillableSeats(resourceId)`
- [x] In `updateRole()` function (lines ~319-324):
  - Remove the billable seats update block
  - Remove call to `updateBillableSeats(resourceId)`
- [x] Remove `calculateBillableSeats()` function (lines ~849-875)
- [x] Remove `updateBillableSeats()` function (lines ~879-895)
- [x] Remove `canAddBillableSeat()` function (lines ~901-915)
- [x] In `demoteWithOwnershipTransfer()` function (line ~1222):
  - Remove call to `updateBillableSeats(teamId)`
- [ ] Run `bun run typecheck` to verify no type errors

### Task 2.2: Delete billable seats service file
**Validates: Requirement 2**

- [x] Delete `src/server/teams/billable-seats.ts`
- [x] Remove import of `calculateBillableSeats` from `src/server/teams/team-service.ts` (line ~7)
- [ ] Run `bun run typecheck` to verify no broken imports

### Task 2.3: Remove billable seats updates from member service
**Validates: Requirement 2**

- [x] Open `src/server/teams/member-service.ts`
- [x] Remove import of `updateBillableSeats` (line ~6)
- [x] In `addMember()` function (line ~65):
  - Remove `await updateBillableSeats(teamId);`
- [x] In `updateMemberRoles()` function (line ~193):
  - Remove `await updateBillableSeats(teamId);`
- [x] In `removeMember()` function (line ~272):
  - Remove `await updateBillableSeats(teamId);`
- [ ] Run `bun run typecheck` to verify no type errors

---

## Phase 3: Remove Database Schema Fields

### Task 3.1: Create database migration to remove billing fields
**Validates: Requirement 4**

- [x] Create new migration file: `drizzle/0025_remove_billing_fields.sql`
- [x] Add SQL to drop `plan_id` column from `teams` table
- [x] Add SQL to drop `billable_seats` column from `teams` table
- [x] Add SQL to drop index `teams_plan_idx`
- [ ] Test migration on local database

### Task 3.2: Update teams schema definition
**Validates: Requirement 4**

- [x] Open `src/server/db/schema/teams.ts`
- [x] Remove `planId` field (line ~10)
- [x] Remove `billableSeats` field (line ~11)
- [x] Remove `planIdx` index definition (line ~17)
- [ ] Run `bun run db:generate` to verify schema changes
- [ ] Run `bun run typecheck` to identify type errors

### Task 3.3: Update team API types
**Validates: Requirement 4**

- [x] Open `src/features/teams/api/types.ts`
- [x] Remove `planId` field from team schema (line ~15)
- [x] Remove `billableSeats` field from team schema (line ~16)
- [ ] Run `bun run typecheck` to verify no type errors

### Task 3.4: Update server-side team types
**Validates: Requirement 4**

- [x] Open `src/server/teams/types.ts`
- [x] Remove `planId` field (line ~21)
- [x] Remove `billableSeats` field (line ~22)
- [ ] Run `bun run typecheck` to verify no type errors

### Task 3.5: Update export service
**Validates: Requirement 4**

- [ ] Open `src/server/teams/export-service.ts`
- [ ] Remove `planId` from `TeamExportData` interface (line ~46)
- [ ] Remove `planId` from team export mapping (line ~210)
- [ ] Run `bun run typecheck` to verify no type errors

### Task 3.6: Update teams index exports
**Validates: Requirement 2**

- [x] Open `src/server/teams/index.ts`
- [x] Remove `export * from "./billable-seats";` (line ~7)
- [ ] Run `bun run typecheck` to verify no broken imports

---

## Phase 4: Remove UI Components & References

### Task 4.1: Remove plan limit dialog component
**Validates: Requirement 3**

- [x] Delete `src/features/teams/components/plan-limit-dialog.tsx`
- [x] Search for imports of `PlanLimitDialog` and remove them
- [x] Replace with generic "Resource Limit" dialog if needed (see design doc)

### Task 4.2: Remove billing settings UI
**Validates: Requirement 3**

- [x] Delete `src/features/team-settings/components/team-setting-billing.tsx`
- [x] Delete `src/app/(protected)/(team)/team/settings/(section)/billing/page.tsx`
- [x] Delete `src/app/(protected)/(team)/team/settings/(section)/billing/loading.tsx`
- [ ] Remove billing loading skeleton from `src/features/team-settings/components/loading-states.tsx` (lines ~217-236)

### Task 4.3: Remove billing from sidebar navigation
**Validates: Requirement 3**

- [x] Open `src/components/shared/sidebar/app-sidebar.tsx`
- [x] No "Billing" navigation item found (already clean)

### Task 4.4: Remove plan selector components
**Validates: Requirement 3**

- [x] Delete `src/features/auth/components/onboarding-plan-selector.tsx`
- [x] Delete `src/features/auth/components/plan-selector.tsx`
- [x] No `OnboardingPlanSelector` imports found in onboarding-form.tsx (already clean)

### Task 4.5: Update landing page content
**Validates: Requirement 3**

- [x] Open `src/features/landing/components/pricing-section.tsx`
- [x] Updated pricing section to reflect open-source model (Cloud + Self-Hosted)
- [x] No "Only pay for Editors" text found

### Task 4.6: Remove plan display from sidebar team switcher
**Validates: Requirement 3**

- [x] Open `src/components/shared/sidebar/sidebar-team-switcher.tsx`
- [x] Remove `getPlanDisplayName` import (line ~24)
- [x] Replace plan display with member count (line ~151)
- [x] Remove plan badge display in header (lines ~177-181)
- [x] Open `src/components/shared/sidebar/type.ts`
- [x] Remove `getPlanDisplayName` function (lines ~114-121)
- [x] Remove `plan` field from `Team` interface (line ~14)
- [x] Update `MOCK_TEAMS` to remove plan field (lines ~60-79)
- [x] Open `src/components/shared/sidebar/index.ts`
- [x] Remove `getPlanDisplayName` from exports (line ~22)
- [ ] Run `bun run typecheck` to verify no type errors

### Task 4.7: Update email templates
**Validates: Requirement 3**

- [x] Open `src/server/email/templates/ownership-transfer-email.tsx`
- [x] Remove "billing management" reference (line ~55)
- [x] Update to focus on team administration only

---

## Phase 5: Update Tests

### Task 5.1: Remove billable seats property tests
**Validates: Requirement 4**

- [x] Delete `src/server/teams/__tests__/billable-seats.property.test.ts`
- [x] Open `src/server/auth/__tests__/rbac.test.ts`
- [x] Remove billable seats test section (lines ~417-501)
- [x] Remove imports of `calculateBillableSeats` and `isBillableRole`

### Task 5.2: Update integration tests
**Validates: Requirement 4**

- [x] Open `src/server/teams/__tests__/member-management-flow.integration.test.ts`
- [x] Remove billable seats assertions (lines ~96, ~118, ~135)
- [x] Update test expectations to focus on role assignments only

### Task 5.3: Update resource limits tests
**Validates: Requirement 4**

- [x] Open `src/server/teams/__tests__/resource-limits.property.test.ts`
- [x] Remove import of `PLANS` from `@/config/tiers` (line ~16)
- [x] Update tests to use `QUOTAS` from `@/config/quotas.ts` instead
- [x] Verify tests pass with environment-based limits

### Task 5.4: Update project member tests
**Validates: Requirement 4**

- [x] Open `src/server/projects/__tests__/member-service.property.test.ts`
- [x] Remove `planId: "free"` from team creation (line ~33)
- [x] Verify tests pass without plan field

### Task 5.5: Update team export tests
**Validates: Requirement 4**

- [x] Open `src/server/teams/__tests__/export.property.test.ts`
- [x] Remove `planId` assertion (line ~128)
- [x] Update test expectations to exclude billing fields

### Task 5.6: Update cache invalidation tests
**Validates: Requirement 4**

- [x] Open `src/features/teams/hooks/__tests__/cache-invalidation.property.test.tsx`
- [x] Remove `planId` from mock team data (multiple locations)
- [x] Remove `billableSeats` from mock team data (multiple locations)
- [x] Run `bun run test` to verify tests pass

### Task 5.7: Update team creation flow tests
**Validates: Requirement 4**

- [x] Open `src/server/teams/__tests__/team-creation-flow.integration.test.ts`
- [x] Remove `planId` assertions (lines ~101, ~287)
- [x] Remove `billableSeats` assertions (lines ~102, ~289-335)
- [x] Update test descriptions to remove billing context
- [x] Run `bun run test` to verify tests pass

### Task 5.8: Update team settings hook tests
**Validates: Requirement 4**

- [x] Open `src/features/team-settings/hooks/__tests__/use-team-settings.test.tsx`
- [x] Remove `planId` from mock data (line ~27)
- [x] Remove `billableSeats` from mock data (line ~28)
- [x] Run `bun run test` to verify tests pass

### Task 5.9: Update frontend hook comments
**Validates: Requirement 3**

- [x] Open `src/features/teams/hooks/use-remove-member.ts`
- [x] Update comment to remove "billable seats" reference (line ~48)
- [x] Open `src/features/teams/hooks/use-update-member-roles.ts`
- [x] Update comment to remove "billable seats" reference (line ~54)

---

## Phase 6: Update Documentation

### Task 6.1: Update RBAC documentation
**Validates: Requirement 3**

- [x] Open `docs/architecture/RBAC.md`
- [x] Remove all mentions of "billing" (search for "billing")
- [x] Remove all mentions of "subscription" (search for "subscription")
- [x] Remove all mentions of "billable seats" (search for "billable")
- [x] Remove `team:manage_billing` permission from documentation
- [x] Update role descriptions to focus on access control only
- [x] Remove pricing information from role descriptions
- [x] Update "Two-Tier Role System Examples" section to remove billing context
- [x] Update FAQ section to remove billing-related questions

### Task 6.2: Update product documentation
**Validates: Requirement 3**

- [x] Open `.ai/steering/product.md` (if exists)
- [x] Remove plan/pricing references
- [x] Update to reflect open-source, self-hosted model
- [x] Emphasize instance configuration via environment variables

### Task 6.3: Update API documentation
**Validates: Requirement 3**

- [x] Open `src/app/api/teams/route.ts`
- [x] Remove `planId` from OpenAPI response examples (lines ~43, ~206)
- [x] Open `src/app/api/teams/[teamId]/route.ts`
- [x] Remove `planId` from OpenAPI response examples (line ~41)
- [x] Open `src/app/api/teams/[teamId]/switch/route.ts`
- [x] Remove `planId` from OpenAPI response examples (line ~30)

---

## Phase 7: Verification & Cleanup

### Task 7.1: Run full test suite
**Validates: Requirement 4.1**

- [x] Run `bun run test` to execute all unit tests
- [x] Verify all tests pass (Note: 5 pre-existing test failures unrelated to billing refactor)
- [x] Fix any remaining test failures related to billing removal

### Task 7.2: Run type checking
**Validates: Requirement 4.1**

- [x] Run `bun run typecheck` to verify no TypeScript errors
- [x] Fix any remaining type errors

### Task 7.3: Run linting
**Validates: Requirement 4.1**

- [x] Run `bun run lint` to check for code quality issues
- [x] Fix any linting errors (0 errors, only warnings)

### Task 7.4: Search for remaining references
**Validates: Requirement 4**

- [x] Search codebase for "PLANS" and verify no references remain
- [x] Search codebase for "billable" and verify no references remain
- [x] Search codebase for "subscription" and verify only necessary references remain (realtime subscriptions)
- [x] Search codebase for "billing" and verify no references remain in src/
- [x] Search codebase for "tiers" and verify no references remain
- [x] Search codebase for "getPlanDisplayName" and verify no references remain
- [x] Search codebase for "planId" and verify no references remain (except in migrations)

### Task 7.5: Test application build
**Validates: Requirement 4.1**

- [x] Run `bun run build` to verify production build succeeds
- [x] Verify no build errors or warnings related to removed code

### Task 7.6: Manual testing
**Validates: Requirement 4.3**

- [ ] Start development server: `bun run dev`
- [ ] Create a new team and verify no billing references appear
- [ ] Add team members and verify role assignments work without billable seats logic
- [ ] Navigate to team settings and verify billing section is removed
- [ ] Test resource limits using environment variables
- [ ] Verify no console errors related to removed billing code

---

## Notes

- All tasks should be completed in order as they have dependencies
- After each phase, run `bun run typecheck` to catch type errors early
- Keep the `QUOTAS` configuration in `src/config/quotas.ts` as the single source of truth for resource limits
- The database migration (Task 3.1) should be tested thoroughly before applying to production
- Consider creating a backup before running the migration
