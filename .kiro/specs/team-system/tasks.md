# Implementation Plan

- [x] 1. Set up database schema and migrations
  - Create teams table with partial unique index on slug (WHERE deleted_at IS NULL)
  - Create team_members table with proper indexes
  - Create team_invitations table with tokenHash column (not raw token)
  - Add lastActiveTeamId column to users table
  - Set up foreign key constraints and cascade rules
  - _Requirements: 1.1, 1.2, 2.1, 3.1_
  - _Critical: Partial unique index prevents slug conflicts with soft deletes_
  - _Critical: Token hash storage prevents database compromise attacks_

- [x] 2. Implement core team service layer
- [x] 2.1 Create team CRUD operations
  - Implement createTeam with slug generation and uniqueness checking
  - Implement getTeam, getTeams with member info
  - Implement updateTeam with validation
  - Implement softDeleteTeam with 30-day retention
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 5.2_

- [x] 2.2 Write property test for slug generation
  - **Property 2: Slug generation produces URL-friendly unique slugs**
  - **Validates: Requirements 1.2, 13.2**

- [x] 2.3 Write property test for team creation roles
  - **Property 1: Team creation assigns correct roles**
  - **Validates: Requirements 1.1**

- [x] 2.4 Implement billable seat calculation
  - Create calculateBillableSeats function
  - Integrate with role assignment logic
  - _Requirements: 3.2, 3.5, 13.4_

- [x] 2.5 Write property test for billable seats
  - **Property 48: Billable seats count only TEAM_EDITOR**
  - **Validates: Requirements 13.4**

- [x] 3. Implement team member management
- [x] 3.1 Create member service operations
  - Implement addMember with role validation
  - Implement updateMemberRoles with project ownership checks (blocks demotion if owns projects)
  - Implement removeMember with project ownership checks (blocks removal if owns projects)
  - Implement getMembersByTeam with pagination
  - _Requirements: 3.1, 3.3, 3.4, 8.2_
  - _Critical: Both demotion AND removal must check project ownership_

- [x] 3.2 Write property test for role assignment
  - **Property 13: Management roles require operational roles**
  - **Validates: Requirements 3.1, 13.3**

- [x] 3.3 Write property test for demotion blocking
  - **Property 15: Demotion blocked when projects owned**
  - **Validates: Requirements 3.3, 15.3**

- [x] 3.4 Write property test for role changes
  - **Property 17: Role changes recalculate billable seats**
  - **Validates: Requirements 3.5**

- [x] 4. Implement invitation system
- [x] 4.1 Create invitation service operations
  - Implement createInvitation with secure token generation and SHA-256 hashing (7-day expiry)
  - Implement acceptInvitation with hash-based token verification
  - Implement resendInvitation with new token generation and hashing
  - Implement cancelInvitation
  - _Requirements: 2.1, 2.3, 2.4, 2A.2, 2A.3_
  - _Critical: Store only SHA-256 hash of token, send raw token in email_

- [x] 4.2 Write property test for invitation expiration
  - **Property 6: Invitations have 7-day expiration**
  - **Validates: Requirements 2.1**

- [x] 4.3 Write property test for invitation acceptance
  - **Property 7: Invitation acceptance adds user with correct roles**
  - **Validates: Requirements 2.3**

- [x] 4.4 Write property test for invalid invitations
  - **Property 9: Invalid invitations are rejected**
  - **Validates: Requirements 2.5**

- [x] 4.5 Implement invitation rate limiting
  - Add rate limiter for invitation creation (10/hour per team)
  - _Requirements: 2A.5_
  - _Note: Data export rate limiting (5A.5) deferred to Task 5_

- [x] 4.6 Write property test for rate limiting
  - **Property 12: Invitation rate limiting enforced**
  - **Validates: Requirements 2A.5**

- [x] 5. Implement API routes
- [x] 5.1 Create team CRUD endpoints
  - POST /api/teams (create team)
  - GET /api/teams (list teams)
  - GET /api/teams/:teamId (get team details)
  - PATCH /api/teams/:teamId (update team)
  - DELETE /api/teams/:teamId (soft delete)
  - _Requirements: 1.1, 4.1, 5.1_

- [x] 5.2 Create member management endpoints
  - GET /api/teams/:teamId/members (list members)
  - PATCH /api/teams/:teamId/members/:userId (update roles)
  - DELETE /api/teams/:teamId/members/:userId (remove member)
  - _Requirements: 3.2, 3.4, 8.2_

- [x] 5.3 Create invitation endpoints
  - POST /api/teams/:teamId/invitations (create invitation)
  - GET /api/teams/:teamId/invitations (list invitations)
  - POST /api/teams/:teamId/invitations/:id/resend (resend)
  - DELETE /api/teams/:teamId/invitations/:id (cancel)
  - GET /api/teams/invitations/:token/accept (accept invitation)
  - _Requirements: 2.1, 2.2, 2A.1, 2A.2, 2A.3_

- [x] 5.4 Create team context endpoints
  - POST /api/teams/:teamId/switch (switch active team)
  - POST /api/teams/:teamId/export (request data export)
  - POST /api/teams/:teamId/transfer-ownership (transfer ownership)
  - _Requirements: 6.1, 9.2, 5A.1_

- [ ] 6. Implement client-side hooks
- [x] 6.1 Create team query hooks
  - useTeams (list teams with React Query)
  - useTeam (get team details)
  - useTeamMembers (list members with pagination)
  - _Requirements: 12.1, 12.2_

- [x] 6.2 Create team mutation hooks
  - useCreateTeam (create team)
  - useUpdateTeam (update settings)
  - useDeleteTeam (soft delete)
  - useSwitchTeam (switch active team)
  - _Requirements: 1.1, 4.1, 5.1, 9.2_

- [x] 6.3 Create member mutation hooks
  - useUpdateMemberRoles (update roles)
  - useRemoveMember (remove member)
  - useLeaveTeam (leave team)
  - _Requirements: 3.2, 3.4, 15.1_

- [x] 6.4 Create invitation mutation hooks
  - useCreateInvitation (send invitation)
  - useResendInvitation (resend)
  - useCancelInvitation (cancel)
  - _Requirements: 2.1, 2A.2, 2A.3_

- [x] 6.5 Create permission hooks
  - useTeamPermissions (check permissions)
  - useCanManageTeam (check owner/admin)
  - useCanManageMembers (check admin permissions)
  - _Requirements: 12.4_

- [x] 6.6 Write property test for cache invalidation
  - **Property 42: Cache invalidation on team changes**
  - **Validates: Requirements 12.2**

- [x] 7. Update onboarding page for team creation
- [x] 7.1 Modify onboarding page to handle team creation
  - Update /app/(protected)/onboarding/page.tsx to check for existing teams
  - Reuse OnboardingForm component from features/auth/components
  - Reuse PlanSelector component from features/auth/components
  - Integrate useCreateTeam hook for form submission
  - _Requirements: 16.1, 16.2, 17.1, 17.2_

- [x] 7.2 Write property test for onboarding redirect
  - **Property 55: Onboarding page redirects verified users**
  - **Validates: Requirements 16.1**

- [x] 7.3 Write property test for team switching on creation
  - **Property 57: Team creation switches active team**
  - **Validates: Requirements 17.3**

- [x] 7.3 Add team creation success handling
  - Implement automatic team switching after creation
  - Implement redirect to projects page
  - Show success toast notification
  - _Requirements: 16.5, 17.3, 17.4_

- [/] 8. Implement team settings UI <!-- id: 8 -->
- [x] 8.1 Create team settings page <!-- id: 8.1 -->
  - [x] Create /app/(protected)/(team)/team/settings/page.tsx (Updated to use real data)
  - [x] Implement general settings tab (name, description, image)
  - [x] Add permission checks for owner/admin access
  - _Requirements: 4.1, 4.2, 8.4_

- [x] 8.2 Create members management UI <!-- id: 8.2 -->
  - [x] Create team members list component
  - [x] Implement role update dialog
  - [x] Implement member removal confirmation
  - [x] Add project ownership warnings
  - _Requirements: 3.2, 3.3, 3.4, 8.2_

- [x] 8.3 Create invitations management UI <!-- id: 8.3 -->
  - [x] Create pending invitations list
  - [x] Implement invitation creation form
  - [x] Add resend and cancel actions
  - [x] Show invitation status and expiration
  - _Requirements: 2.1, 2A.1, 2A.2, 2A.3_

- [x] 9. Implement team switcher
- [x] 9.1 Create team switcher component
  - Create TeamSwitcher component in components/shared
  - Display team list with plan badges
  - Implement team switching with useSwitchTeam hook
  - Add "Create Team" option that redirects to /onboarding
  - _Requirements: 9.1, 9.2, 17.1_

- [x] 9.2 Write property test for team switching
  - **Property 35: Team switching updates database and cookie**
  - **Validates: Requirements 9.2, 9.3**

- [x] 9.3 Integrate team switcher into navigation
  - Add TeamSwitcher to AppHeader
  - Update sidebar to show current team context
  - Handle team context changes across app
  - _Requirements: 9.1, 9.4_

- [x] 10. Implement plan limit enforcement
- [x] 10.1 Create plan limit checking utilities
  - Implement checkMemberLimit function
  - Implement checkProjectLimit function
  - Implement checkIssueLimit function
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 10.2 Write property test for member limit
  - **Property 41: Free plan member limit enforced**
  - **Validates: Requirements 10.1, 10.5**

- [x] 10.3 Integrate limit checks into API routes
  - Add limit checks to team member addition
  - Add limit checks to project creation
  - Add limit checks to issue creation
  - Return specific error codes for limit violations
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 10.4 Create upgrade prompts UI
  - Create PlanLimitDialog component
  - Show "Coming Soon" badge for Pro plan
  - Display current usage vs limits
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 11. Implement team context management
- [x] 11.1 Create team context utilities
  - Implement getActiveTeam (database + cookie fallback)
  - Implement setActiveTeam (database + cookie)
  - Implement validateTeamAccess
  - _Requirements: 9.3, 9.4, 9A.3_

- [x] 11.2 Write property test for context persistence
  - **Property 36: Last active team loads from database first**
  - **Validates: Requirements 9.4**

- [x] 11.3 Handle team context edge cases
  - Implement auto-switch on deleted team
  - Implement auto-switch on lost access
  - Implement database-cookie conflict resolution
  - Show error and redirect on invalid team access
  - _Requirements: 9A.1, 9A.2, 9A.3, 9A.4_

- [x] 11.4 Write property test for deleted team handling
  - **Property 37: Deleted active team triggers auto-switch**
  - **Validates: Requirements 9A.1**

- [x] 12. Implement logging and observability
- [x] 12.1 Add structured logging for team events
  - Log team creation, updates, deletion
  - Log member additions, removals, role changes
  - Log invitation creation, acceptance, cancellation
  - Log ownership transfers
  - _Requirements: 1.5, 3.4, 4.5, 6.5, 14.1, 14.2, 14.3, 14.4_

- [x] 12.2 Write property test for logging
  - **Property 5: Team creation is logged**
  - **Validates: Requirements 1.5, 14.1**

- [x] 12.3 Set up monitoring and alerts
  - Configure alerts for high team creation rate
  - Configure alerts for invitation spam
  - Configure alerts for plan limit hits
  - Configure alerts for invalid context errors
  - _Requirements: 14.5_

- [x] 13. Implement validation and error handling
- [x] 13.1 Create Zod schemas for team operations
  - Create team creation schema
  - Create team update schema
  - Create invitation schema
  - Create role assignment schema
  - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 13.2 Write property test for validation
  - **Property 47: Team name validation enforced**
  - **Validates: Requirements 13.1**

- [x] 13.3 Write property test for Zod errors
  - **Property 49: Zod validation returns field-specific errors**
  - **Validates: Requirements 13.5**

- [x] 13.4 Implement standardized error responses
  - Create error response formatter
  - Define error codes for all scenarios
  - Implement field-specific validation errors
  - _Requirements: 12A.4_

- [x] 13.5 Write property test for API errors
  - **Property 46: API errors have standardized shape**
  - **Validates: Requirements 12A.4**

- [x] 14. Implement ownership transfer
- [x] 14.1 Create ownership transfer service
  - Implement transferOwnership with re-auth check
  - Update roles for old and new owners
  - Send notification emails
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 14.2 Write property test for ownership transfer
  - **Property 24: Ownership transfer updates roles correctly**
  - **Validates: Requirements 6.2**

- [x] 14.2 Create ownership transfer UI
  - Create transfer ownership dialog
  - Add member selector
  - Implement re-authentication flow
  - Show confirmation with consequences
  - _Requirements: 6.1, 6.4_

- [x] 15. Implement data export
- [x] 15.1 Create data export service
  - Implement exportTeamData function
  - Generate JSON with all team data
  - Queue export job
  - Send email with download link
  - _Requirements: 5A.1, 5A.2, 5A.3_

- [x] 15.2 Write property test for data export
  - **Property 22: Data export generates complete JSON**
  - **Validates: Requirements 5A.2**

- [x] 15.2 Integrate export into deletion flow
  - Add export option to delete confirmation
  - Show export progress
  - Proceed with deletion after export completes
  - _Requirements: 5A.1_

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Integration testing
- [ ] 17.1 Test complete team creation flow
  - Test onboarding page team creation
  - Test role assignment
  - Test team switching
  - Test plan limit enforcement
  - _Requirements: 1.1, 3.1, 9.2, 10.1_

- [ ] 17.2 Test invitation flow
  - Test invitation creation and email sending
  - Test invitation acceptance
  - Test invitation expiration
  - Test rate limiting
  - _Requirements: 2.1, 2.3, 2.5, 2A.5_

- [ ] 17.3 Test member management flow
  - Test role updates
  - Test member removal
  - Test project ownership blocking
  - Test billable seat calculation
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ] 17.4 Test team context management
  - Test team switching
  - Test context persistence
  - Test edge case handling
  - _Requirements: 9.2, 9.3, 9A.1, 9A.2_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
