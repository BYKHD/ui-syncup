# Requirements Document

## Introduction

This document specifies the requirements for the project invitation feature in UI SyncUp. The feature enables project owners and editors to invite developers and other team members to join specific projects with assigned roles. Invitations support the standard lifecycle of pending, accepted, declined, revoked, and expired states.

The feature integrates with UI SyncUp's two-tier role system, where project roles (PROJECT_OWNER, PROJECT_EDITOR, PROJECT_DEVELOPER, PROJECT_VIEWER) automatically correspond to team operational roles with appropriate billing implications.

## Glossary

- **Invitation_System**: The subsystem that handles creating, managing, and processing project invitations
- **Project_Invitation**: A record representing an invitation for a user to join a project with a specific role
- **Invitation_Token**: A secure, unique token used to validate invitation acceptance (stored as SHA-256 hash)
- **Inviter**: The user (PROJECT_OWNER or PROJECT_EDITOR) who creates the invitation
- **Invitee**: The user being invited to join the project
- **Invitation_Status**: The current state of an invitation (pending, accepted, declined, revoked, expired)
- **Team_Member**: An existing member of the team who can be suggested during invitation
- **Email_Notification**: The notification sent to invitees with invitation details and acceptance link

## Requirements

### Requirement 1

**User Story:** As a project owner, I want to invite team members or external users to my project by email, so that I can collaborate with developers on UI feedback.

#### Acceptance Criteria

1. WHEN a project owner clicks the "Invite" button THEN the Invitation_System SHALL display an invitation dialog with email input and role selection
2. WHEN typing an email address THEN the Invitation_System SHALL suggest matching Team_Members with auto-complete
3. WHEN a user submits an invitation THEN the Invitation_System SHALL validate the email format and selected role
4. WHEN an invitation is created THEN the Invitation_System SHALL generate a unique Invitation_Token and store it securely as a hash
5. WHEN an invitation is created THEN the Invitation_System SHALL set the expiration to 7 days from creation

### Requirement 2

**User Story:** As an invitee, I want to receive a clear email notification with project details, so that I can understand what I'm being invited to and make an informed decision.

#### Acceptance Criteria

1. WHEN an invitation is created THEN the Invitation_System SHALL send an Email_Notification to the invitee
2. THE Email_Notification SHALL contain the project name, inviter name, assigned role, and expiration date
3. THE Email_Notification SHALL include a secure acceptance link with the Invitation_Token
4. WHEN the invitation link expires THEN the Invitation_System SHALL display an appropriate error when the link is accessed

### Requirement 3

**User Story:** As an invitee, I want to accept or decline project invitations, so that I can join projects I'm interested in.

#### Acceptance Criteria

1. WHEN an invitee clicks the invitation acceptance link THEN the Invitation_System SHALL validate the Invitation_Token
2. WHEN a valid token is provided THEN the Invitation_System SHALL check that the invitation is not expired, revoked, or already used
3. WHEN an invitee accepts an invitation THEN the Invitation_System SHALL add them as a project member with the assigned role
4. WHEN an invitee accepts an invitation THEN the Invitation_System SHALL mark the invitation as "accepted" with a timestamp
5. WHEN an invitee declines an invitation THEN the Invitation_System SHALL mark the invitation as "declined" with a timestamp

### Requirement 4

**User Story:** As a project owner, I want to manage pending invitations, so that I can revoke or resend invitations as needed.

#### Acceptance Criteria

1. WHEN viewing project members THEN the Invitation_System SHALL display a list of pending invitations with status and expiration
2. WHEN a project owner revokes an invitation THEN the Invitation_System SHALL mark it as "cancelled" with a timestamp
3. WHEN a project owner resends an invitation THEN the Invitation_System SHALL generate a new Invitation_Token and extend the expiration
4. WHEN resending an invitation THEN the Invitation_System SHALL send a new Email_Notification with the updated link
5. WHILE an invitation is pending THEN the Invitation_System SHALL prevent sending duplicate invitations to the same email
6. WHEN creating an invitation THEN the Invitation_System SHALL check if the email matches an existing project member
7. WHEN the email matches an existing project member THEN the Invitation_System SHALL reject the invitation with error code MEMBER_EXISTS_USE_ROLE_CHANGE
8. THE invitation autocomplete suggestions SHALL exclude users who are already project members

### Requirement 5

**User Story:** As a user, I want to see proper role descriptions when inviting, so that I understand the permissions I'm granting.

#### Acceptance Criteria

1. WHEN selecting a role in the invitation dialog THEN the Invitation_System SHALL display a description of each role's permissions
2. THE role selection SHALL include options for PROJECT_EDITOR, PROJECT_DEVELOPER, and PROJECT_VIEWER
3. THE role selection SHALL NOT include PROJECT_OWNER (ownership must be transferred, not invited)
4. WHEN a role implies billing (PROJECT_EDITOR → TEAM_EDITOR) THEN the Invitation_System SHALL display a billing indicator

### Requirement 6

**User Story:** As a developer (invitee), I want a smooth onboarding experience when accepting an invitation, so that I can start working immediately.

#### Acceptance Criteria

1. WHEN an authenticated user accepts an invitation THEN the Invitation_System SHALL redirect them to the project dashboard
2. WHEN an unauthenticated user accepts an invitation THEN the Invitation_System SHALL redirect them to sign in/sign up with a callback URL preserving the invitation link
3. WHEN an unauthenticated user completes authentication THEN the Invitation_System SHALL automatically redirect them back to the invitation acceptance page using the preserved callback URL
4. THE callback URL SHALL include the full invitation token path (e.g., /invite/project/[token])
5. WHEN the invitee is not yet a team member THEN the Invitation_System SHALL add them to the team with TEAM_MEMBER role
6. WHEN the invitation grants PROJECT_EDITOR role THEN the Invitation_System SHALL upgrade the team role to TEAM_EDITOR (billable)
7. WHEN a user already has TEAM_EDITOR role THEN the Invitation_System SHALL NOT downgrade their team operational role, regardless of the invitation's project role
8. THE team operational role promotion SHALL follow the principle: "keep the higher of current and invitation-implied operational role"

### Requirement 7

**User Story:** As a system administrator, I want invitation data to be secure and validated, so that the system remains protected against abuse.

#### Acceptance Criteria

1. THE Invitation_System SHALL store Invitation_Tokens as SHA-256 hashes, never in plaintext
2. THE Invitation_System SHALL generate invitation tokens using cryptographically secure random data (32 bytes minimum, URL-safe base64 encoded)
3. THE Invitation_System SHALL validate all input data using Zod schemas
4. THE Invitation_System SHALL rate-limit invitation creation: maximum 10 invitations per user per 10 minutes
5. THE Invitation_System SHALL enforce per-project limit: maximum 50 pending invitations per project
6. THE Invitation_System SHALL log all invitation actions for audit purposes
7. WHEN an invitation is accessed with an invalid token THEN the Invitation_System SHALL return a generic error without revealing details

### Requirement 8

**User Story:** As a project manager, I want invitation activity tracked in the project timeline, so that I can audit member additions.

#### Acceptance Criteria

1. WHEN an invitation is created THEN the Invitation_System SHALL log an activity with type "invitation_sent"
2. WHEN an invitation is accepted THEN the Invitation_System SHALL log an activity with type "invitation_accepted"
3. WHEN an invitation is revoked THEN the Invitation_System SHALL log an activity with type "invitation_revoked"
4. WHEN querying project activities THEN the Invitation_System SHALL include invitation-related events in the timeline

### Requirement 9

**User Story:** As a user on mobile, I want the invitation flow to work on all devices, so that I can invite and accept invitations from anywhere.

#### Acceptance Criteria

1. THE invitation dialog SHALL be responsive and functional on mobile devices
2. THE invitation acceptance page SHALL be optimized for mobile viewing
3. THE Email_Notification links SHALL work correctly when opened on mobile devices
4. WHEN on touch devices THEN the Invitation_System SHALL provide appropriate touch targets for all interactive elements

### Requirement 10

**User Story:** As an invitee, I want to decline an invitation explicitly, so that the inviter knows I'm not interested.

#### Acceptance Criteria

1. WHEN viewing an invitation acceptance page THEN the Invitation_System SHALL display a "Decline" button alongside "Accept"
2. WHEN an invitee clicks the decline button THEN the Invitation_System SHALL mark the invitation as "declined" with a timestamp
3. WHEN an invitation is declined THEN the Invitation_System SHALL log an activity with type "invitation_declined"
4. AFTER declining an invitation THEN the Invitation_System SHALL redirect the user to an appropriate confirmation page

### Requirement 11

**User Story:** As a project owner, I want to change existing member roles through a dedicated mechanism, so that role modifications are clear and intentional.

#### Acceptance Criteria

1. WHEN modifying an existing member's role THEN the Invitation_System SHALL use the role change mechanism in the Member Manager
2. THE role change mechanism SHALL allow immediate role updates without requiring acceptance
3. THE role change mechanism SHALL support both upgrades and downgrades
4. WHEN a role is changed THEN the Invitation_System SHALL log an activity with type "member_role_changed"
5. THE invitation flow SHALL NOT be used for existing project members

### Requirement 12 (Non-Functional)

**User Story:** As a user, I want invitation operations to be fast and responsive, so that my workflow isn't interrupted.

#### Acceptance Criteria

1. THE invitation creation API SHALL respond within 500ms (excluding email delivery)
2. THE team member suggestions autocomplete SHALL respond within 200ms
3. THE invitation list query SHALL use optimized database queries (no N+1 patterns)
4. THE email notification SHALL be queued asynchronously, not blocking the API response
5. THE duplicate invitation check SHALL use database indexes for O(1) lookup performance

### Requirement 13

**User Story:** As a project owner, I want reliable email delivery with visibility into failures, so that I know if my invitations are reaching invitees.

#### Acceptance Criteria

1. WHEN an invitation email fails to send THEN the Invitation_System SHALL retry up to 3 times with exponential backoff (1min, 5min, 15min)
2. WHEN all retry attempts fail THEN the Invitation_System SHALL mark the invitation with an email delivery failure flag
3. WHEN viewing the invitation list THEN the Invitation_System SHALL display an "Email Failed" indicator for invitations with delivery failures
4. WHEN an invitation has a delivery failure THEN the Invitation_System SHALL allow the project owner to manually resend the invitation
5. WHEN manually resending a failed invitation THEN the Invitation_System SHALL reset the delivery failure flag
6. THE invitation status SHALL remain "pending" even if email delivery fails (invitation is still valid)
7. THE email worker SHALL log all delivery failures with error details for debugging
8. WHEN email delivery fails permanently THEN the Invitation_System SHALL log an activity with type "invitation_email_failed"
