# Requirements Document: Refactor Codebase to Fully Open Source

## Introduction
The UI SyncUp platform is transitioning from a monetization-based model to a fully open-source, self-hosted platform. The current codebase contains legacy references to billing, plans, and monetization permissions that are no longer relevant and potentially confusing for open-source users. This refactor aims to remove all such references and align the codebase with the open-source product direction.

## Glossary
- **System**: The UI SyncUp application
- **RBAC**: Role-Based Access Control system
- **Monetization Logic**: Code related to billing, subscription tiers, payment seats, and "billable" status.
- **Roles Config**: The configuration file defining user roles and permissions (`src/config/roles.ts`).
- **Billing Permissions**: Permissions granting access to billing management (e.g., `team:manage_billing`).

## Requirements

### Requirement 1: Remove Monetization from Role Configuration
**User Story:** As a developer, I want the role configuration to be free of billing concepts so that the open-source code is clean and understandable.

#### Acceptance Criteria
1. THE System SHALL NOT define `BILLABLE_ROLES` in role configuration.
2. THE System SHALL NOT define `isBillableRole` helper function.
3. THE System SHALL NOT include billing-related text (e.g., "$8/month") in `ROLE_DESCRIPTIONS`.
4. THE System SHALL NOT include `TEAM_MANAGE_BILLING` in `PERMISSIONS` or `ROLE_PERMISSIONS`.

### Requirement 2: Remove Billing Logic from RBAC Utilities
**User Story:** As a developer, I want RBAC utilities to focus solely on access control without side effects related to billing.

#### Acceptance Criteria
1. THE RBAC System SHALL NOT import `PLANS` or `tiers` configuration.
2. WHEN assigning roles, THE RBAC System SHALL NOT trigger `updateBillableSeats`.
3. WHEN removing roles, THE RBAC System SHALL NOT trigger `updateBillableSeats`.
4. THE RBAC System SHALL NOT contain the `updateBillableSeats` function or logic.

### Requirement 3: Cleanup Documentation
**User Story:** As a user, I want documentation to reflect the open-source nature of the project without confusing references to paid plans.

#### Acceptance Criteria
1. THE `RBAC.md` documentation SHALL NOT mention "billing", "subscription", or "billable seats".
2. THE `RBAC.md` documentation SHALL NOT list `team:manage_billing` permission.
3. THE `RBAC.md` documentation SHALL describe roles purely in terms of access control capabilities.

### Requirement 4: Verify Codebase Integrity
**User Story:** As a developer, I want to ensure that removing billing logic does not break the application build or runtime.

#### Acceptance Criteria
1. THE System SHALL compile without errors after removing billing logic.
2. IF `src/config/tiers.ts` exists, THE System SHALL delete it if it is no longer used.
3. FOR ALL role assignments, the application SHALL function correctly without calculating billable seats.
