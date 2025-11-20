# Requirements Document

## Introduction

This document specifies the requirements for the Team Management system in UI SyncUp. The system enables users to create teams, manage team members, assign roles, and control team settings. It integrates with the existing authentication system, RBAC framework, and plan-based billing model. The team system implements a two-tier role hierarchy (management + operational roles) and enforces plan limits for team size, projects, and issues.

## Glossary

- **Team**: An organizational unit that contains projects, members, and billing configuration
- **Team Member**: A user who belongs to a team with assigned roles
- **Management Role**: Team role that controls settings access (TEAM_OWNER, TEAM_ADMIN) - not billable by itself
- **Operational Role**: Team role that determines content access and billing (TEAM_EDITOR, TEAM_MEMBER, TEAM_VIEWER)
- **Team Creator**: The user who creates a team, automatically assigned TEAM_OWNER + TEAM_EDITOR roles
- **Team Invitation**: A time-limited token allowing a user to join a team with pre-assigned roles
- **Team Slug**: URL-friendly unique identifier for a team (e.g., "acme-design")
- **Billable Seat**: A team member with TEAM_EDITOR operational role ($8/month on Pro plan)
- **Plan Limit**: Maximum number of members, projects, or issues allowed based on team's plan
- **Team Settings**: Configuration options including name, description, plan, and member management
- **Role Combination**: A user's management role (optional) + operational role (required) within a team

## Requirements

### Requirement 1

**User Story:** As a new user, I want to create a team, so that I can organize projects and collaborate with others.

#### Acceptance Criteria

1. WHEN a verified user creates a team with valid data (name, description) THEN the System SHALL create a team record with a unique slug and assign the creator as TEAM_OWNER + TEAM_EDITOR
2. WHEN a user creates a team THEN the System SHALL generate a URL-friendly slug from the team name and ensure uniqueness
3. WHEN a team is created THEN the System SHALL assign the default plan (free) with appropriate limits
4. WHEN a user attempts to create a team with a name that generates a duplicate slug THEN the System SHALL append a numeric suffix to ensure uniqueness
5. WHEN team creation completes THEN the System SHALL log the event with team ID, creator ID, and timestamp

### Requirement 2

**User Story:** As a team owner or team admin, I want to invite users to my team, so that I can build my team and assign appropriate roles.

#### Acceptance Criteria

1. WHEN a user with TEAM_OWNER or TEAM_ADMIN role sends an invitation with email and roles THEN the System SHALL create an invitation token valid for 7 days
2. WHEN an invitation is created THEN the System SHALL send an email with a unique invitation link
3. WHEN a user clicks a valid invitation link THEN the System SHALL add them to the team with the pre-assigned roles
4. WHEN a user accepts an invitation THEN the System SHALL mark the invitation as used, log the acceptance event, and notify the inviter
5. WHEN an invitation expires or is already used THEN the System SHALL reject the invitation and display an appropriate error message

### Requirement 2A

**User Story:** As a team owner or team admin, I want to manage pending invitations, so that I can track, resend, or cancel invitations as needed.

#### Acceptance Criteria

1. WHEN a team owner or admin views pending invitations THEN the System SHALL display all active invitations with email, roles, expiration date, and inviter name
2. WHEN a team owner or admin resends an invitation THEN the System SHALL invalidate the old token, create a new token with extended expiration, and send a new email
3. WHEN a team owner or admin cancels an invitation THEN the System SHALL mark the invitation as cancelled and prevent its use
4. WHEN an invitation expires THEN the System SHALL notify the inviter via email with option to resend
5. WHEN a team owner or admin sends invitations THEN the System SHALL enforce rate limiting of 10 invitations per hour per team to prevent spam

### Requirement 3

**User Story:** As a team owner, I want to manage team member roles, so that I can control access levels and billing costs.

#### Acceptance Criteria

1. WHEN a team owner assigns a management role (TEAM_OWNER, TEAM_ADMIN) THEN the System SHALL require an operational role to be assigned simultaneously
2. WHEN a team owner changes a member's operational role to TEAM_EDITOR THEN the System SHALL increment billable seat count and validate against plan limits
3. WHEN a team owner demotes a member from TEAM_EDITOR THEN the System SHALL check if the member owns any projects and block demotion if ownership exists
4. WHEN a team owner removes a member THEN the System SHALL delete all team-level role assignments and log the removal event
5. WHEN role changes occur THEN the System SHALL recalculate billable seats and update the team's billing record

### Requirement 4

**User Story:** As a team owner, I want to update team settings, so that I can maintain accurate team information and configuration.

#### Acceptance Criteria

1. WHEN a team owner updates team name THEN the System SHALL regenerate the slug if the name changes significantly
2. WHEN a team owner updates team description THEN the System SHALL save the new description and log the change
3. WHEN a team owner uploads a team image THEN the System SHALL validate file type and size, store the image, and update the team record
4. WHEN team settings are updated THEN the System SHALL validate all changes and return field-specific errors for invalid data
5. WHEN a team owner updates settings THEN the System SHALL log the change with old and new values

### Requirement 5

**User Story:** As a team owner, I want to delete my team, so that I can remove all team data when the team is no longer needed.

#### Acceptance Criteria

1. WHEN a team owner initiates team deletion THEN the System SHALL require re-authentication before proceeding
2. WHEN a team is deleted THEN the System SHALL perform a soft delete by marking the team as deleted with a 30-day retention period
3. WHEN a team is soft-deleted THEN the System SHALL immediately hide it from all user interfaces and prevent access to team resources
4. WHEN the 30-day retention period expires THEN the System SHALL permanently delete the team and cascade delete all projects, issues, annotations, and member assignments
5. WHEN a team has active projects THEN the System SHALL display a warning listing all projects that will be deleted and require explicit confirmation

### Requirement 5A

**User Story:** As a team owner, I want to export team data before deletion, so that I can preserve important information.

#### Acceptance Criteria

1. WHEN a team owner initiates team deletion THEN the System SHALL offer an option to export team data before proceeding
2. WHEN a team owner requests data export THEN the System SHALL generate a JSON file containing all team data, projects, issues, and annotations
3. WHEN data export is requested THEN the System SHALL queue the export job and send an email with download link when complete
4. WHEN a team is soft-deleted THEN the System SHALL retain audit logs for 7 years for compliance purposes
5. WHEN a team owner requests data export THEN the System SHALL enforce rate limiting of 1 export per team per day

### Requirement 6

**User Story:** As a team owner, I want to transfer team ownership, so that I can hand over control to another team member.

#### Acceptance Criteria

1. WHEN a team owner initiates ownership transfer THEN the System SHALL require re-authentication before proceeding
2. WHEN ownership is transferred THEN the System SHALL assign TEAM_OWNER role to the new owner and demote the previous owner to TEAM_ADMIN
3. WHEN ownership transfer completes THEN the System SHALL send notification emails to both the old and new owners
4. WHEN a team owner attempts to transfer ownership to a non-member THEN the System SHALL reject the transfer and return an error
5. WHEN ownership transfer occurs THEN the System SHALL log the event with old owner ID, new owner ID, and timestamp

### Requirement 7

**User Story:** As a team admin, I want to manage team members, so that I can add and remove users without full owner privileges.

#### Acceptance Criteria

1. WHEN a team admin invites a user THEN the System SHALL allow invitation creation with any operational role
2. WHEN a team admin attempts to assign TEAM_OWNER role THEN the System SHALL reject the operation and return a permission error
3. WHEN a team admin removes a member THEN the System SHALL allow removal unless the member is the team owner
4. WHEN a team admin updates member roles THEN the System SHALL allow changes to operational roles but not management roles
5. WHEN a team admin performs member management actions THEN the System SHALL log all actions with admin ID and affected member ID

### Requirement 8

**User Story:** As a team member, I want to view team information and members, so that I can understand the team structure and contact other members.

#### Acceptance Criteria

1. WHEN a team member views the team page THEN the System SHALL display team name, description, image, and member count
2. WHEN a team member views the members list THEN the System SHALL display all members with their roles and join dates
3. WHEN a team member views member details THEN the System SHALL show management role, operational role, and project assignments
4. WHEN a team member lacks permission to view settings THEN the System SHALL hide settings navigation and redirect attempts to access settings
5. WHEN a team member views the team THEN the System SHALL display their own role and permissions clearly

### Requirement 9

**User Story:** As a user, I want to switch between teams, so that I can work on projects across multiple teams.

#### Acceptance Criteria

1. WHEN a user belongs to multiple teams THEN the System SHALL display a team switcher in the navigation showing team name and plan
2. WHEN a user selects a different team THEN the System SHALL update the active team context, store the selection in the database, and reload the current page
3. WHEN a user switches teams THEN the System SHALL persist the selected team ID in both the database (user.lastActiveTeamId) and a cookie for redundancy
4. WHEN a user accesses the application THEN the System SHALL load the last active team from the database, falling back to the cookie if database value is unavailable
5. WHEN a user has no teams THEN the System SHALL redirect them to the onboarding flow

### Requirement 9A

**User Story:** As a user, I want the system to handle team context edge cases gracefully, so that I don't encounter errors when team access changes.

#### Acceptance Criteria

1. WHEN a user's last active team is deleted THEN the System SHALL automatically switch to their first available team or redirect to onboarding if no teams remain
2. WHEN a user loses access to their last active team THEN the System SHALL detect the invalid context and switch to their first available team
3. WHEN the cookie and database disagree on last active team THEN the System SHALL prioritize the database value and update the cookie
4. WHEN a user accesses a team they no longer have access to THEN the System SHALL display a clear error message and redirect to team switcher
5. WHEN team context changes on one device THEN the System SHALL invalidate cached team data on all devices within 5 minutes

### Requirement 10

**User Story:** As a system, I want to enforce plan limits, so that teams stay within their subscription tier constraints.

#### Acceptance Criteria

1. WHEN a team on the free plan attempts to add an 11th member THEN the System SHALL reject the operation and display an upgrade prompt
2. WHEN a team on the free plan attempts to create a 2nd project THEN the System SHALL reject the operation and display an upgrade prompt
3. WHEN a team on the free plan attempts to create the 51st issue THEN the System SHALL reject the operation and display an upgrade prompt
4. WHEN a team on the pro plan adds members THEN the System SHALL allow unlimited members and update billable seat count
5. WHEN plan limits are exceeded THEN the System SHALL return a specific error code indicating which limit was reached

### Requirement 11

**User Story:** As a team owner, I want to view plan upgrade options, so that I can understand what features are available in the future.

#### Acceptance Criteria

1. WHEN a team owner views billing settings THEN the System SHALL display current plan (Free) with usage statistics
2. WHEN a team owner views plan upgrade options THEN the System SHALL display Pro plan features with "Coming Soon" badge
3. WHEN a team owner attempts to upgrade to Pro THEN the System SHALL display a "Coming Soon" message and prevent the upgrade
4. WHEN a team approaches plan limits THEN the System SHALL display a notification about the Pro plan coming soon
5. WHEN a team owner views billing THEN the System SHALL display current plan, member count, and current usage against limits

### Requirement 12

**User Story:** As a developer, I want team data accessible via typed APIs and hooks, so that UI components can display team information consistently.

#### Acceptance Criteria

1. WHEN a client component needs team data THEN the System SHALL provide a React Query hook that fetches current team information with loading and error states
2. WHEN team data changes (name, members, settings) THEN the System SHALL invalidate cached team data and trigger re-fetch across all components
3. WHEN feature modules need team data THEN the System SHALL expose typed API functions that return validated team objects matching Zod schemas
4. WHEN UI components check team permissions THEN the System SHALL provide hooks that return boolean permission checks based on user roles with cached results
5. WHEN team APIs are called THEN the System SHALL return responses that match Zod schema definitions for type safety

### Requirement 12A

**User Story:** As a developer, I want clear API contracts for team operations, so that I can build reliable features with predictable behavior.

#### Acceptance Criteria

1. WHEN team list APIs are called THEN the System SHALL support pagination with cursor-based navigation and return consistent page sizes
2. WHEN team member APIs are called THEN the System SHALL support optimistic updates with automatic rollback on failure
3. WHEN team APIs are called from server components THEN the System SHALL support SSR-compatible data fetching without client-side hydration mismatches
4. WHEN team API errors occur THEN the System SHALL return standardized error shapes with error code, message, and field-specific validation errors
5. WHEN permission hooks are used THEN the System SHALL integrate with cached session data and avoid redundant permission checks

### Requirement 13

**User Story:** As a system, I want to validate team operations, so that data integrity and business rules are enforced.

#### Acceptance Criteria

1. WHEN a team name is provided THEN the System SHALL validate it is between 2 and 50 characters and contains only allowed characters
2. WHEN a team slug is generated THEN the System SHALL ensure it contains only lowercase letters, numbers, and hyphens
3. WHEN a user is assigned roles THEN the System SHALL validate that management roles are paired with operational roles
4. WHEN billable seats are calculated THEN the System SHALL count only unique users with TEAM_EDITOR operational role
5. WHEN team operations are performed THEN the System SHALL validate all input data using Zod schemas and return field-specific errors

### Requirement 14

**User Story:** As a system operator, I want team operations logged, so that I can audit team changes and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a team is created THEN the System SHALL log the event with team ID, creator ID, plan ID, and timestamp
2. WHEN team members are added or removed THEN the System SHALL log the event with member ID, roles, and actor ID
3. WHEN team settings are updated THEN the System SHALL log the event with changed fields, old values, and new values
4. WHEN team ownership is transferred THEN the System SHALL log the event with old owner ID, new owner ID, and timestamp
5. WHEN team operations fail THEN the System SHALL log the error with context including user ID, team ID, and error details

### Requirement 15

**User Story:** As a team member, I want to leave a team, so that I can remove myself from teams I no longer participate in.

#### Acceptance Criteria

1. WHEN a team member initiates leaving a team THEN the System SHALL display a confirmation dialog with consequences
2. WHEN a team member confirms leaving THEN the System SHALL remove all their team-level role assignments
3. WHEN a team member who owns projects attempts to leave THEN the System SHALL block the operation and display owned projects
4. WHEN the team owner attempts to leave THEN the System SHALL require ownership transfer before allowing departure
5. WHEN a member leaves a team THEN the System SHALL log the event and send a notification to team admins

### Requirement 16

**User Story:** As a new user without a team invitation, I want to go through an onboarding flow, so that I can create or join a team and start using the platform.

#### Acceptance Criteria

1. WHEN a user completes email verification without an active invitation THEN the System SHALL redirect them to the onboarding page
2. WHEN a user views the onboarding page THEN the System SHALL display plan options with Free plan enabled and Pro plan marked as "Coming Soon"
3. WHEN a user selects the Free plan and creates a team THEN the System SHALL create the team with free plan limits and redirect to the projects page
4. WHEN a user attempts to select the Pro plan THEN the System SHALL display a "Coming Soon" message and prevent selection
5. WHEN a user completes onboarding THEN the System SHALL set the newly created team as their active team

