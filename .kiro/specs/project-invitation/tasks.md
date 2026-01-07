# Implementation Plan

## Status Legend
- [x] Completed (already implemented)
- [/] In Progress
- [ ] Not Started

---

## Phase 1: Core Infrastructure (Completed)

- [x] 1. Database schema for project invitations
  - Create `project_invitations` table with columns: id, projectId, email, tokenHash, role, invitedBy, expiresAt, usedAt, cancelledAt, createdAt
  - Add email delivery tracking: emailDeliveryFailed, emailFailureReason, emailLastAttemptAt
  - Add indexes for tokenHash (unique), projectId+email, expiresAt, email failures
  - Configure cascade delete on project deletion
  - Configure invitedBy with onDelete: "set null" for preservation
  - _Requirements: 1.4, 1.5, 7.1, 13.2_
  - _Location: `src/server/db/schema/project-invitations.ts`_

- [x] 2. Type definitions for invitation service
  - Define InvitationStatus type: "pending" | "accepted" | "declined" | "expired"
  - Define ProjectInvitation interface with all fields
  - Define ProjectInvitationWithUsers for enriched data
  - Define CreateProjectInvitationData for creation input
  - _Requirements: 1.3, 3.4, 3.5_
  - _Location: `src/server/projects/types.ts`_

---

## Phase 2: Invitation Service (Completed)

- [x] 3. Implement invitation service functions
  - Implement `getInvitationStatus()` for deriving status from timestamps
  - Implement `listProjectInvitations()` with user enrichment
  - Implement `createProjectInvitation()` with token generation
  - Implement `revokeProjectInvitation()` with permission check
  - Implement `resendProjectInvitation()` with new token
  - Implement `acceptProjectInvitation()` with member creation
  - _Requirements: 1.1-1.5, 3.1-3.5, 4.1-4.5_
  - _Location: `src/server/projects/invitation-service.ts`_

- [x] 3.3 Write integration tests for invitation CRUD
  - Test create creates record with correct expiration
  - Test revoke sets cancelledAt timestamp
  - Test resend generates new token and extends expiration
  - _Requirements: 1.5, 4.2, 4.3_
  - _Location: `src/server/projects/__tests__/invitation-service.integration.test.ts`_

---

## Phase 2.5: Feature API Layer

- [x] 3.4 Create invitation API fetchers
  - Create `createInvitation()`, `listInvitations()`, `revokeInvitation()`, `resendInvitation()`
  - Use `lib/api-client.ts` for fetch wrapper
  - _Location: `src/features/projects/api/invitations.ts`_

- [x] 3.5 Create invitation DTO schemas
  - Define Zod schemas for request/response types
  - _Location: `src/features/projects/api/types.ts`_

- [x] 3.6 Update barrel exports
  - Export API functions and types from `src/features/projects/api/index.ts`

---

## Phase 3: API Endpoints (Partially Complete)

- [x] 4. Create API route for listing invitations
  - GET /api/projects/[projectId]/invitations
  - Require PROJECT_OWNER or PROJECT_EDITOR role
  - Return invitations with user enrichment
  - _Requirements: 4.1_

- [x] 5. Create API route for creating invitations
  - POST /api/projects/[projectId]/invitations
  - Validate email format with Zod
  - Validate role is not PROJECT_OWNER
  - Check for duplicate pending invitations
  - Check if email matches existing project member
  - Queue email notification
  - _Requirements: 1.1-1.5, 2.1-2.4, 4.5, 4.6, 4.7, 5.3_

- [x] 6. Create API route for revoking invitations
  - DELETE /api/projects/[projectId]/invitations/[invitationId]
  - Require PROJECT_OWNER or PROJECT_EDITOR role
  - Only allow revoking pending invitations
  - _Requirements: 4.2_

- [x] 7. Create API route for resending invitations
  - POST /api/projects/[projectId]/invitations/[invitationId]/resend
  - Generate new token and extend expiration
  - Queue new email notification
  - _Requirements: 4.3, 4.4_

- [x] 8. Create API route for accepting invitations
  - POST /api/invite/project/[token]
  - Validate token exists and is valid
  - Check invitation is not expired/revoked/used
  - Add user as project member
  - Add user to team if not already member
  - Handle role promotion (PROJECT_EDITOR → TEAM_EDITOR)
  - Redirect to project dashboard
  - _Requirements: 3.1-3.5, 6.1-6.4_

- [x] 8.1 Write integration tests for accept endpoint
  - Test successful acceptance creates member
  - Test expired invitation returns error
  - Test revoked invitation returns error
  - Test invalid token returns generic error
  - _Requirements: 3.1-3.5, 7.5_

---

## Phase 4: Email Notifications (Complete)

- [x] 9. Create project invitation email template
  - Include project name, inviter name, role, expiration
  - Include acceptance link with token
  - Style consistently with other emails
  - _Requirements: 2.1-2.3_
  - _Location: `src/server/email/templates/project-invitation-email.tsx`_

- [x] 10. Integrate email sending in invitation creation
  - Queue email after successful invitation creation
  - Include proper error handling for email failures
  - _Requirements: 2.1_
  - _Location: `src/server/projects/invitation-service.ts`_

- [x] 10.1 Implement email retry logic
  - Configure retry policy: 4 retries with exponential backoff (1min, 5min, 15min)
  - _Note: emailDeliveryFailed flag update deferred (requires schema migration)_
  - _Requirements: 13.1, 13.2_
  - _Location: `src/server/email/queue.ts`_

- [ ] 10.2 Write integration tests for email trigger
  - Test email is queued on invitation creation
  - Test email is queued on resend
  - Test email contains correct data
  - Test retry logic executes with backoff
  - Test emailDeliveryFailed flag set after 4 attempts
  - Test resend clears emailDeliveryFailed flag

---

## Phase 4.5: React Query Hooks (Complete)

- [x] 10.2 Create useProjectInvitations hook
  - Use TanStack Query for caching and refetching
  - _Location: `src/features/projects/hooks/use-project-invitations.ts`_

- [x] 10.3 Create invitation mutation hooks
  - `use-create-invitation.ts` - optimistic updates
  - `use-revoke-invitation.ts` - invalidate on success
  - `use-resend-invitation.ts` - invalidate on success
  - _Location: `src/features/projects/hooks/`_

- [x] 10.4 Update hooks barrel export
  - _Location: `src/features/projects/hooks/index.ts`_

---

## Phase 5: UI Components (Completed)

- [x] 11. Implement team member suggestions hook
  - Create `useTeamMemberSuggestions` hook
  - Search team members by name or email
  - Exclude existing project members from suggestions
  - Debounce search queries
  - _Requirements: 1.2, 4.8_
  - _Location: `src/features/projects/hooks/use-team-member-suggestions.ts`_

- [ ] 11.5 Add validation for existing members in invitation service
  - Implement `checkExistingProjectMember(projectId, email)` helper
  - Return MEMBER_EXISTS_USE_ROLE_CHANGE error in `createProjectInvitation()`
  - _Requirements: 4.6, 4.7_
  - _Location: `src/server/projects/invitation-service.ts`_

- [x] 12. Implement project invitation dialog
  - Email input with auto-complete suggestions
  - Role selection dropdown with descriptions
  - Validation and error display
  - Loading and success states
  - _Requirements: 1.1, 1.2, 5.1, 5.2_
  - _Location: `src/features/projects/components/project-invitation-dialog.tsx`_

- [x] 13. Implement project member manager dialog
  - Display current members with roles
  - Display pending invitations with status
  - Revoke and resend actions
  - Member role change and removal
  - _Requirements: 4.1-4.4_
  - _Location: `src/features/projects/components/project-member-manager-dialog.tsx`_

- [x] 14. Implement invitation status component
  - Visual status badges (pending, expired, accepted)
  - Expiration countdown/date display
  - Action buttons based on status
  - _Requirements: 4.1_
  - _Location: `src/features/projects/components/project-invitation-status.tsx`_

- [ ] 14.5 Add email delivery failure indicator to invitation list
  - Display "Email Failed" badge when emailDeliveryFailed is true
  - Show tooltip with emailFailureReason on hover
  - Enable "Resend" button for failed invitations
  - Clear emailDeliveryFailed flag on successful resend
  - _Requirements: 13.3, 13.4, 13.5_
  - _Location: `src/features/projects/components/project-member-manager-dialog.tsx`_

- [ ] 14.1 Write component tests for invitation dialog
  - Test email validation feedback
  - Test role selection updates description
  - Test form submission triggers API call
  - Test loading state during submission
  - _Location: `src/features/projects/components/__tests__/project-invitation-dialog.test.tsx`_

- [ ] 14.2 Write component tests for member manager
  - Test pending invitations display correctly
  - Test revoke action calls API
  - Test resend action calls API
  - _Location: `src/features/projects/components/__tests__/project-member-manager-dialog.test.tsx`_

---

## Phase 6: Invitation Acceptance Flow

- [ ] 15. Create invitation acceptance page
  - Route: /invite/project/[token]
  - Display invitation details for confirmation
  - Check authentication status on page load
  - For unauthenticated: redirect to /auth/signin?callbackUrl=/invite/project/[token]
  - For authenticated: display Accept/Decline UI
  - Process acceptance and redirect to project
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 15.1 Write E2E tests for acceptance flow
  - Test authenticated user acceptance
  - Test unauthenticated user redirected to sign in with callback URL
  - Test callback URL redirects back to invitation page after auth
  - Test new user sign-up flow preserves invitation
  - Test expired invitation shows error
  - Test successful acceptance redirects to project

- [ ] 15.2 Implement decline invitation endpoint
  - POST /api/invite/project/[token]/decline
  - Mark invitation as declined with timestamp
  - Log activity with type "invitation_declined"
  - _Requirements: 10.1-10.3_
  - _Location: `src/app/api/invite/project/[token]/decline/route.ts`_

- [ ] 15.3 Add decline button to acceptance page
  - Display "Decline" option alongside "Accept"
  - Redirect to appropriate page after decline
  - _Requirements: 10.1, 10.4_

---

## Phase 7: Activity Logging

- [ ] 16. Add invitation activity types
  - Define activity types: invitation_sent, invitation_accepted, invitation_revoked, member_role_changed, invitation_email_failed
  - Create activity records on invitation events
  - Create activity records on role change events
  - Create activity record on email permanent failure
  - _Requirements: 8.1-8.4, 11.4, 13.8_

- [ ] 16.1 Write integration tests for activity logging
  - Test invitation_sent activity created on invite
  - Test invitation_accepted activity created on accept
  - Test invitation_revoked activity created on revoke

---

## Phase 8: Role Billing Integration

- [ ] 17. Implement team role promotion on accept
  - Detect when PROJECT_EDITOR role is granted
  - Upgrade team operational role to TEAM_EDITOR
  - Ensure billing implications are handled
  - _Requirements: 6.4_

- [ ] 17.1 Write integration tests for role promotion
  - Test PROJECT_DEVELOPER keeps TEAM_MEMBER
  - Test PROJECT_EDITOR promotes to TEAM_EDITOR
  - Test PROJECT_VIEWER keeps TEAM_VIEWER

---

## Phase 9: Security & Validation

- [ ] 18. Implement rate limiting for invitations
  - Extend existing `src/server/auth/rate-limiter.ts` pattern
  - Create invitation-specific limiter: `invitationRateLimiter`
  - Per-user limit: 10 invitations per 10 minutes
  - Per-project limit: 50 pending invitations per project
  - Return appropriate errors: USER_RATE_LIMIT_EXCEEDED, PROJECT_INVITATION_LIMIT_REACHED
  - _Requirements: 7.4, 7.5_

- [ ] 18.5 Verify RBAC integration
  - Confirm PROJECT_OWNER and PROJECT_EDITOR can invite
  - Verify `src/server/auth/rbac.ts` handles invitation permissions
  - Update `config/roles.ts` if new permissions needed

- [ ] 19. Add audit logging for invitation actions
  - Use `import { logger } from '@/lib/logger'`
  - Log: actor, action, timestamp, projectId, invitationId, result
  - _Requirements: 7.4_

- [ ] 19.1 Write security tests
  - Test rate limiting triggers on excess requests
  - Test audit logs are created for all actions
  - Test invalid tokens return generic errors

---

## Phase 10: Mobile & Responsive

- [ ] 20. Optimize invitation dialog for mobile
  - Ensure dialog is scrollable on small screens
  - Touch-friendly form controls
  - Appropriate button sizes
  - _Requirements: 9.1, 9.4_

- [ ] 21. Optimize acceptance page for mobile
  - Responsive layout
  - Large touch targets
  - Clear CTAs
  - _Requirements: 9.2_

---

## Phase 10.5: Performance Optimizations

- [ ] 21.5 Add database index for duplicate check optimization
  - Create partial index on (project_id, email) where pending
  - Verify with EXPLAIN ANALYZE on duplicate check query
  - _Location: `drizzle/migrations/`_

- [ ] 21.6 Optimize listProjectInvitations query
  - Use Drizzle `leftJoin` to fetch invitedBy and invitee users in single query
  - Avoid N+1 query pattern
  - _Location: `src/server/projects/invitation-service.ts`_

- [ ] 21.7 Verify team member suggestions performance
  - Confirm debounce is 300ms minimum
  - Limit suggestions to 10 results
  - Enable SWR staleWhileRevalidate caching
  - _Location: `src/features/projects/hooks/use-team-member-suggestions.ts`_

- [ ] 21.8 Verify email queue is asynchronous
  - Confirm invitation creation doesn't wait for email to send
  - Verify background worker processes emails
  - _Location: `src/server/email/worker.ts`, `src/server/email/queue.ts`_

---

## Phase 11: Final Integration & Testing

- [ ] 22. Run full test suite
  - Unit tests passing
  - Integration tests passing
  - E2E tests passing

- [ ] 23. Manual testing checklist
  - [ ] Create invitation via dialog
  - [ ] Verify email received with correct content
  - [ ] Accept invitation as authenticated user
  - [ ] Accept invitation as new user (sign up flow)
  - [ ] Revoke pending invitation
  - [ ] Resend invitation and verify new email
  - [ ] Verify expired invitation shows error
  - [ ] Test on mobile devices
  - [ ] Decline invitation

- [ ] 24. Performance verification
  - [ ] Verify listProjectInvitations uses single query (no N+1)
  - [ ] Verify team member suggestions responds < 200ms
  - [ ] Verify invitation creation responds < 500ms
  - [ ] Verify email is queued, not sent synchronously

---

## Notes

### Implementation Status Summary

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema | ✅ Complete | `src/server/db/schema/project-invitations.ts` |
| Service Types | ✅ Complete | `src/server/projects/types.ts` |
| Invitation Service | ✅ Complete | `src/server/projects/invitation-service.ts` |
| API - List | ✅ Complete | `src/app/api/projects/[projectId]/invitations/route.ts` |
| API - Create | ✅ Complete | `src/app/api/projects/[projectId]/invitations/route.ts` |
| API - Revoke | ✅ Complete | `src/app/api/projects/[projectId]/invitations/[invitationId]/route.ts` |
| API - Resend | ✅ Complete | `src/app/api/projects/[projectId]/invitations/[invitationId]/resend/route.ts` |
| API - Accept | ⏳ Not Started | `src/app/api/invite/project/[token]/route.ts` |
| API - Decline | ⏳ Not Started | `src/app/api/invite/project/[token]/decline/route.ts` |
| Feature API Layer | ⏳ Not Started | `src/features/projects/api/invitations.ts` |
| React Query Hooks | ⏳ Not Started | `src/features/projects/hooks/use-*.ts` |
| Email Template | ⏳ Partial | `src/server/email/templates/` |
| Invitation Dialog | ✅ Complete | `src/features/projects/components/project-invitation-dialog.tsx` |
| Member Manager | ✅ Complete | `src/features/projects/components/project-member-manager-dialog.tsx` |
| Acceptance Page | ⏳ Not Started | `src/app/(auth)/invite/project/[token]/page.tsx` |
| Activity Logging | ⏳ Not Started | - |
| Rate Limiting | ⏳ Not Started | `src/server/auth/rate-limiter.ts` (extend) |
| RBAC Verification | ⏳ Not Started | `src/server/auth/rbac.ts`, `config/roles.ts` |

### Priority for Completion

1. **High Priority**: Accept/Decline invitation API endpoints and acceptance page (enables full flow)
2. **Medium Priority**: Feature API Layer, React Query Hooks, Email integration, Activity logging
3. **Lower Priority**: Rate limiting, RBAC verification, Mobile optimization, Comprehensive tests
