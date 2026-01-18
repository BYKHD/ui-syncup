# Design Document: Refactor Codebase to Fully Open Source

## 1. Overview
The goal of this design is to strip all monetization and billing logic from the UI SyncUp codebase, fully transitioning it to an open-source model where resource limits are controlled solely by environment variables (Instance Configuration).

## 2. Architecture

### Current State
Currently, the system uses a hybrid model:
- **RBAC**: tracks "billable roles" (TEAM_EDITOR).
- **Database**: `teams` table stores `plan_id` and `billable_seats`.
- **UI**: Prompts users to "Upgrade to Plan" when limits are reached.
- **Config**: Relies on `src/config/tiers.ts` for plan definitions.

### Future State
The new architecture will be purely configuration-driven:
- **RBAC**: Pure access control. No concepts of "billable" vs "free" roles.
- **Database**: `teams` table is simplified (no `plan_id`, no `billable_seats`).
- **UI**: "Resource Limit" dialogs inform users of instance limits (set by admin/env vars) without upsell.
- **Config**: `src/config/quotas.ts` is the single source of truth for limits.

## 3. Components and Interfaces

### A. Role Configuration (`src/config/roles.ts`)
- **Remove**: `BILLABLE_ROLES` constant.
- **Remove**: `isBillableRole` function.
- **Refactor**: `ROLE_DESCRIPTIONS` to remove pricing text (e.g., "$8/month").

### B. RBAC Utilities (`src/server/auth/rbac.ts`)
- **Refactor**: `assignRole`, `assignRoles`, `removeRole`, `updateRole`.
- **Remove**: Calls to `updateBillableSeats`.
- **Remove**: Imports from `tiers.ts`.

### C. Team Service
- **Delete**: `src/server/teams/billable-seats.ts`.
- **Refactor**: Any service that calls `calculateBillableSeats` should stop doing so.

### D. UI Components
- **Refactor**: `src/features/teams/components/plan-limit-dialog.tsx`.
  - Rename to `ResourceLimitDialog`.
  - Remove "Upgrade to Pro" buttons.
  - Remove comparison with `PLANS`.
  - Display simple message: "This instance has a limit of X. Please contact your administrator."
- **Refactor**: `src/features/auth/utils/constants.ts`.
  - Remove `planOptions` array used for sign-up/pricing pages.

## 4. Data Models

### Database Schema (`src/server/db/schema/teams.ts`)
We will simplify the `teams` table.

```typescript
// Proposed Schema Change
export const teams = pgTable("teams", {
  // ... existing fields
  // DELETE: planId
  // DELETE: billableSeats
});
```

*Note: Migration required to drop these columns.*

## 5. Correctness Properties

### Property 1: Role Assignments are Side-Effect Free
*For any* role assignment (create, update, delete), the operation should only modify the `user_roles` table and NOT trigger any billable seat calculations or modification of the `teams` table.
**Validates: Requirement 2**

### Property 2: Resource Limits Respect Configuration
*For any* resource creation attempt (project, member, issue), the system should check against `src/config/quotas.ts` values, ignoring any legacy plan definitions.
**Validates: Requirement 3**

## 6. Error Handling
- If a user reaches a limit defined in `QUOTAS`, the system should throw a standard `LIMIT_REACHED` error.
- The UI should catch this and display the `ResourceLimitDialog`.

## 7. Testing Strategy
- **Unit Tests**: Update `rbac.test.ts` to assert that no side effects occur.
- **Type Check**: Ensure no TypeScript errors remain after removing `tiers.ts`.
- **Manual Verification**:
  1. Create a team.
  2. Add members until `MAX_MEMBERS_PER_TEAM` (set in .env) is reached.
  3. Verify the "Resource Limit" dialog appears and DOES NOT mention "Pro Plan".
  4. Verify no errors related to `billableSeats` in logs.
