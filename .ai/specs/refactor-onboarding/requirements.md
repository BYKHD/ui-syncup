# Requirements Document: Refactor Onboarding for Open-Source Self-Hosted Platform

## Introduction

UI SyncUp is transitioning to a fully open-source, self-hosted platform. The current onboarding flow was designed for a SaaS model and needs refactoring to support self-hosting administrators and invited users. This specification defines a "Pattern A+" onboarding approach where infrastructure is pre-configured via environment variables, and the in-app wizard guides instance setup, admin account creation, and workspace provisioning.

### Business Value

- **Reduced Friction**: Clear separation between infrastructure setup (pre-boot) and application setup (in-app wizard)
- **Self-Hosting Friendly**: Administrators can clone, configure, and deploy without complex in-app infrastructure configuration
- **Graceful Degradation**: Optional services (email, storage) degrade gracefully when not configured
- **Industry-Standard UX**: Follows patterns from GitLab, Metabase, and Discourse for self-hosted tools
- **Flexible Workspace Model**: Supports both single-workspace (simple) and multi-workspace (enterprise) deployments

---

## Glossary

- **System**: The UI SyncUp application
- **Instance**: A deployed installation of UI SyncUp (self-hosted or cloud)
- **Admin**: The first user who sets up the instance and has full administrative privileges
- **User**: An authenticated person using the system
- **Invited_User**: A user who arrives via an invitation link
- **Self_Registered_User**: A user who signs up without an invitation
- **Instance_Settings**: Configuration stored in the database that defines instance-level settings
- **Service_Status**: The operational state of optional services (email, storage, Redis)
- **Onboarding_Flow**: The sequential steps a user goes through when first using the system
- **Setup_Wizard**: The multi-step interface for initial instance configuration
- **Workspace**: The organizational unit containing members and projects (formerly "Team")
- **Workspace_Mode**: Either single-workspace (default) or multi-workspace mode
- **Default_Workspace**: The auto-created workspace in single-workspace mode
- **WORKSPACE_OWNER**: The highest management role (replaces legacy TEAM_OWNER)
- **WORKSPACE_ADMIN**: Administrative role for workspace management (replaces legacy TEAM_ADMIN)
- **WORKSPACE_EDITOR**: Operational role for content creation (replaces legacy TEAM_EDITOR)
- **WORKSPACE_MEMBER**: Operational role for basic access (replaces legacy TEAM_MEMBER)
- **WORKSPACE_VIEWER**: Operational role for view-only access (replaces legacy TEAM_VIEWER)
- **Default_Member_Role**: The configurable default operational role assigned to new users in single-workspace mode
- **Audit_Log**: Structured records of security-relevant actions for compliance and debugging

---

## Requirements

### Requirement 1: Instance State Detection

**User Story:** As a self-hosting administrator, I want the system to detect whether initial setup is required, so that I am directed to the appropriate onboarding flow.

#### Acceptance Criteria

1. WHEN the System starts and no admin user exists in the database THEN the System SHALL redirect all requests to the `/setup` route
2. WHEN an admin user exists THEN the System SHALL allow normal routing to proceed
3. THE System SHALL check instance state on each request until setup is complete
4. IF the database is unreachable THEN the System SHALL display a clear "Database Connection Error" message with troubleshooting guidance

---

### Requirement 2: Service Health Check Display

**User Story:** As a self-hosting administrator, I want to see the status of all required and optional services during setup, so that I understand what features are available.

#### Acceptance Criteria

1. WHEN the setup wizard loads THEN the System SHALL display the connection status of the database
2. WHEN the setup wizard loads THEN the System SHALL display the configuration status of optional services: Email (Resend), Storage (R2/S3), and Redis
3. THE System SHALL indicate each service as one of: "Connected", "Not Configured", or "Error"
4. WHERE a service is not configured THEN the System SHALL display the degraded functionality (e.g., "Email: Not configured - invitations will show copy-able links")
5. THE System SHALL provide a "Configure Services" option that links to documentation or shows inline configuration hints
6. WHEN all required services are healthy THEN the System SHALL display a "Continue" button to proceed

---

### Requirement 3: Admin Account Creation

**User Story:** As the first user on a new instance, I want to create an administrator account, so that I can manage the instance and its users.

#### Acceptance Criteria

1. WHEN the admin creation step loads THEN the System SHALL display a form with fields: Email, Password, Confirm Password, and Display Name
2. WHEN the user submits valid credentials THEN the System SHALL create the admin user with WORKSPACE_OWNER role
3. THE System SHALL validate email format using standard email validation
4. THE System SHALL validate password meets minimum requirements: at least 8 characters, contains at least one letter and one number
5. THE System SHALL validate that Password and Confirm Password match exactly
6. IF validation fails THEN the System SHALL display specific error messages for each failed field
7. WHEN the admin account is created successfully THEN the System SHALL proceed to the instance configuration step
8. THE System SHALL hash passwords using Argon2 before storing
9. WHEN email is not configured AND admin needs to reset password THEN the System SHALL provide a CLI command `bun run admin:reset-password <email>` to generate a temporary password
10. THE System SHALL rate limit admin creation attempts to 5 per minute per IP address to prevent brute force attacks

---

### Requirement 4: Instance Configuration

**User Story:** As an administrator, I want to configure instance-level settings, so that the instance is branded and limits are set appropriately.

#### Acceptance Criteria

1. WHEN the instance configuration step loads THEN the System SHALL display fields: Instance Name, Public URL (optional), and a summary of resource limits
2. THE System SHALL load default resource limits from environment variables (QUOTAS configuration)
3. THE System SHALL save instance configuration to the `instance_settings` table
4. WHEN the Public URL is provided THEN the System SHALL validate it is a valid URL format
5. IF the Public URL is empty THEN the System SHALL default to the request origin
6. WHEN configuration is saved successfully THEN the System SHALL proceed to the workspace creation step

---

### Requirement 5: First Workspace Creation

**User Story:** As an administrator, I want to create the first workspace during setup, so that I have a workspace ready to use immediately.

#### Acceptance Criteria

1. WHEN the workspace creation step loads THEN the System SHALL display a form with field: Workspace Name
2. WHEN the user submits a valid workspace name THEN the System SHALL create the workspace with the admin as WORKSPACE_OWNER
3. THE System SHALL validate workspace name is between 2 and 50 characters
4. THE System SHALL auto-generate a URL-safe slug from the workspace name
5. IF workspace creation fails THEN the System SHALL display an error message and allow retry
6. WHEN the workspace is created successfully THEN the System SHALL proceed to the optional sample data step
7. IN single-workspace mode THEN this workspace becomes the default workspace for the instance

---

### Requirement 6: Sample Data Provisioning (Optional)

**User Story:** As a new user, I want to optionally load sample data, so that I can explore the platform features without creating real content.

#### Acceptance Criteria

1. WHEN the sample data step loads THEN the System SHALL display an option: "Create demo project with sample annotations?"
2. WHEN the user selects "Yes" THEN the System SHALL create a sample project with mock issues, annotations, and comments
3. WHEN the user selects "No, skip" THEN the System SHALL skip sample data creation
4. THE System SHALL complete the setup wizard and redirect to the workspace dashboard after this step
5. THE System SHALL mark the instance as "setup complete" in the `instance_settings` table

---

### Requirement 7: Role-Based Onboarding for Invited Users

**User Story:** As an invited user, I want a streamlined onboarding experience, so that I can quickly join my workspace and start working.

#### Acceptance Criteria

1. WHEN a user clicks an invitation link THEN the System SHALL validate the invitation token
2. IF the invitation token is valid THEN the System SHALL display the invitation details: Workspace Name, Inviter Name, and assigned Role
3. IF the invitation token is expired or invalid THEN the System SHALL display an error message with options to request a new invitation
4. WHEN the invited user does not have an account THEN the System SHALL display account creation fields inline
5. WHEN the invited user already has an account THEN the System SHALL display a "Sign in to accept" prompt
6. WHEN the user accepts the invitation THEN the System SHALL add them to the workspace with the specified role
7. WHEN invitation acceptance is successful THEN the System SHALL redirect to the workspace dashboard

---

### Requirement 8: Self-Registration Onboarding Path

**User Story:** As a self-registered user, I want to choose between creating a new workspace or joining an existing one, so that I can access the platform appropriately.

#### Acceptance Criteria

1. WHEN a new user completes account creation without an invitation THEN the System SHALL check the workspace mode
2. IN multi-workspace mode THEN the System SHALL present options: "Create a new workspace" and "I have an invite code"
3. IN single-workspace mode THEN the System SHALL automatically add the user to the default workspace as WORKSPACE_MEMBER
4. WHEN the user selects "Create a new workspace" (multi-workspace mode) THEN the System SHALL proceed to workspace creation (similar to Requirement 5)
5. WHEN the user selects "I have an invite code" THEN the System SHALL display an invite code input field
6. WHEN a valid invite code is entered THEN the System SHALL proceed to the invitation acceptance flow (Requirement 7)
7. WHEN the user creates a workspace THEN the System SHALL assign them the WORKSPACE_OWNER role

---

### Requirement 9: Graceful Service Degradation

**User Story:** As an administrator, I want the system to work with minimal configuration, so that I can get started quickly and add optional services later.

#### Acceptance Criteria

1. WHERE email service (Resend) is not configured THEN the System SHALL display "Copy Invitation Link" instead of sending emails
2. WHERE storage service (R2/S3) is not configured THEN the System SHALL use local filesystem storage with a 10MB limit per file
3. WHERE Redis is not configured THEN the System SHALL use in-memory rate limiting (resets on restart)
4. WHERE any optional service is not configured THEN the System SHALL display a banner in the admin settings indicating the degraded state
5. THE System SHALL log service status on startup for debugging purposes

---

### Requirement 10: Post-Setup Admin Settings

**User Story:** As an administrator, I want to modify instance settings after initial setup, so that I can adjust configuration as needs change.

#### Acceptance Criteria

1. WHEN an admin navigates to Instance Settings THEN the System SHALL display current instance configuration
2. THE System SHALL allow editing: Instance Name, Public URL, Default Member Role
3. THE System SHALL display current service status (read-only, configured via environment variables)
4. WHEN settings are updated THEN the System SHALL save changes to `instance_settings` table
5. THE System SHALL validate all inputs using the same rules as initial setup
6. THE System SHALL log all admin configuration changes with timestamp, user ID, and changed fields for audit purposes
7. THE System SHALL provide an "Export Settings" button to download instance configuration as JSON
8. THE System SHALL provide an "Import Settings" option to restore configuration from a JSON backup (excluding sensitive data like passwords)
9. THE System SHALL allow re-running the setup wizard with a `FORCE_SETUP=true` environment variable while preserving existing data

---

### Requirement 11: Workspace Mode Detection

**User Story:** As the system, I want to detect the configured workspace mode, so that I can adjust the UI and behavior accordingly.

#### Acceptance Criteria

1. THE System SHALL read the `MULTI_WORKSPACE_MODE` environment variable on startup
2. IF `MULTI_WORKSPACE_MODE` is not set or is `false` THEN the System SHALL operate in single-workspace mode
3. IF `MULTI_WORKSPACE_MODE` is `true` THEN the System SHALL operate in multi-workspace mode
4. THE System SHALL expose workspace mode via a configuration utility function `isMultiWorkspaceMode()`
5. THE System SHALL NOT allow changing workspace mode without restarting the application

---

### Requirement 12: Single-Workspace Mode Behavior

**User Story:** As a user in single-workspace mode, I want a simplified UI without workspace switching, so that I can focus on my work.

#### Acceptance Criteria

1. IN single-workspace mode THEN the System SHALL hide the workspace switcher in the sidebar
2. IN single-workspace mode THEN the System SHALL hide "Create new workspace" buttons throughout the UI
3. IN single-workspace mode THEN the System SHALL automatically add new users to the default workspace with the configured Default Member Role
4. IN single-workspace mode THEN the System SHALL use "Settings" instead of "Workspace Settings" in navigation
5. IN single-workspace mode THEN the System SHALL skip workspace selection during onboarding
6. THE System SHALL store the default workspace ID in `instance_settings` table
7. THE System SHALL store the default member role in `instance_settings` table (default: WORKSPACE_MEMBER)
8. THE admin SHALL be able to configure the default member role as one of: WORKSPACE_VIEWER, WORKSPACE_MEMBER, or WORKSPACE_EDITOR

---

### Requirement 13: Multi-Workspace Mode Behavior

**User Story:** As a user in multi-workspace mode, I want to manage multiple workspaces, so that I can organize work across different contexts.

#### Acceptance Criteria

1. IN multi-workspace mode THEN the System SHALL display the workspace switcher in the sidebar
2. IN multi-workspace mode THEN the System SHALL allow users to create new workspaces
3. IN multi-workspace mode THEN the System SHALL allow users to be members of multiple workspaces
4. IN multi-workspace mode THEN the System SHALL require workspace selection when a user has multiple workspaces
5. IN multi-workspace mode THEN new users without invitations SHALL be prompted to create a workspace

---

### Requirement 14: Role Terminology Migration

**User Story:** As a developer, I want the codebase to use consistent "Workspace" terminology, so that there is no confusion between legacy "Team" terms and the new "Workspace" model.

#### Acceptance Criteria

1. THE System SHALL rename `TEAM_OWNER` role to `WORKSPACE_OWNER` in all code and database references
2. THE System SHALL rename `TEAM_ADMIN` role to `WORKSPACE_ADMIN` in all code and database references
3. THE System SHALL rename `TEAM_EDITOR` role to `WORKSPACE_EDITOR` in all code and database references
4. THE System SHALL rename `TEAM_MEMBER` role to `WORKSPACE_MEMBER` in all code and database references
5. THE System SHALL rename `TEAM_VIEWER` role to `WORKSPACE_VIEWER` in all code and database references
6. THE System SHALL update the `roles.ts` configuration to use `WORKSPACE_*` role names
7. THE System SHALL update all RBAC permission mappings to use `WORKSPACE_*` roles
8. THE System SHALL create a database migration to update existing role values in `team_members` table
9. THE System SHALL maintain backwards compatibility by accepting legacy `TEAM_*` roles during a transition period
10. THE System SHALL update all documentation to use `WORKSPACE_*` terminology

---

### Requirement 15: Email Verification Configuration

**User Story:** As an administrator, I want to optionally disable email verification, so that internal deployments can function without email configuration.

#### Acceptance Criteria

1. THE System SHALL read the `SKIP_EMAIL_VERIFICATION` environment variable on startup
2. IF `SKIP_EMAIL_VERIFICATION=true` THEN the System SHALL bypass email verification for new user accounts
3. THE System SHALL display a warning banner in admin settings when email verification is disabled
4. THE System SHALL still support password reset via CLI when email verification is disabled
5. WHEN email service is configured AND `SKIP_EMAIL_VERIFICATION` is not set THEN the System SHALL require email verification by default
6. THE System SHALL log a warning at startup when email verification is disabled for security awareness

---

## User Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BEFORE RUNNING THE APP                             │
│                          (README + .env.example)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Required:                                                                  │
│  ✓ DATABASE_URL (Supabase/PostgreSQL)                                      │
│                                                                             │
│  Optional (graceful degradation if missing):                                │
│  ○ RESEND_API_KEY → Falls back to "copy invite link"                        │
│  ○ R2/S3 credentials → Falls back to local uploads (10MB limit)             │
│  ○ REDIS_URL → Falls back to in-memory rate limiting                        │
│                                                                             │
│  Workspace Mode:                                                            │
│  ○ MULTI_WORKSPACE_MODE=false (default) → Single workspace, simplified UI   │
│  ○ MULTI_WORKSPACE_MODE=true → Multiple workspaces, full features           │
│                                                                             │
│  Then: bun install → bun run db:migrate → bun dev                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INSTANCE STATE DETECTION                            │
│                         (Requirement 1)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│         ┌─────────────────────────────────────────────┐                     │
│         │         Does admin user exist?              │                     │
│         └─────────────────────────────────────────────┘                     │
│                    │                    │                                   │
│                   NO                   YES                                  │
│                    │                    │                                   │
│                    ▼                    ▼                                   │
│         ┌──────────────────┐   ┌──────────────────────┐                    │
│         │ Redirect to      │   │ Normal app routing   │                    │
│         │ /setup           │   │ (login/dashboard)    │                    │
│         └──────────────────┘   └──────────────────────┘                    │
│                    │                                                        │
└────────────────────┼────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SETUP WIZARD                                   │
│                              (/setup route)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 1: Service Health Check (Requirement 2)                          │ │
│  │                                                                        │ │
│  │   ✓ Database: Connected                                               │ │
│  │   ✓ Migrations: Up to date                                            │ │
│  │   ⚠ Storage: Local filesystem (limited to 10MB)                       │ │
│  │   ⚠ Email: Not configured (invites will show copy-able links)         │ │
│  │   ⚠ Redis: Not configured (in-memory rate limiting)                   │ │
│  │                                                                        │ │
│  │   Workspace Mode: Single-workspace (MULTI_WORKSPACE_MODE=false)       │ │
│  │                                                                        │ │
│  │   [Configure Services ▾] [Continue with defaults →]                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 2: Create Admin Account (Requirement 3)                          │ │
│  │                                                                        │ │
│  │   Email:           [________________________]                         │ │
│  │   Password:        [________________________]                         │ │
│  │   Confirm:         [________________________]                         │ │
│  │   Display Name:    [________________________]                         │ │
│  │                                                                        │ │
│  │                                              [Create Account →]       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 3: Configure Instance (Requirement 4)                            │ │
│  │                                                                        │ │
│  │   Instance Name:   [UI SyncUp________________]                        │ │
│  │   Public URL:      [https://syncup.company.com] (optional)            │ │
│  │                                                                        │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │   │ Resource Limits (from environment)                              │ │ │
│  │   │   • Max projects per workspace: 50                              │ │ │
│  │   │   • Max issues per project: 1000                                │ │ │
│  │   │   • Max members per workspace: 100                              │ │ │
│  │   └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │                                              [Save & Continue →]      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 4: Create Your Workspace (Requirement 5)                         │ │
│  │                                                                        │ │
│  │   Workspace Name:  [Acme Design________________]                      │ │
│  │   (Slug: acme-design - auto-generated)                                │ │
│  │                                                                        │ │
│  │   ℹ️ This will be your default workspace.                             │ │
│  │                                                                        │ │
│  │                                              [Create Workspace →]     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STEP 5: Sample Data (Optional) (Requirement 6)                        │ │
│  │                                                                        │ │
│  │   Would you like to explore with sample data?                         │ │
│  │                                                                        │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │   │ 📦 Demo Project                                                 │ │ │
│  │   │ Includes sample issues, annotations, and comments               │ │ │
│  │   │ to help you explore the platform features.                      │ │ │
│  │   └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │                    [Yes, create demo] [No, skip →]                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
                         ┌──────────────────────┐
                         │  🎉 Setup Complete    │
                         │  Redirect to         │
                         │  /workspaces/[slug]  │
                         └──────────────────────┘
```

---

## Invited User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVITED USER FLOW                                   │
│                         (Requirement 7)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks email/copied invitation link:                                  │
│  https://app.example.com/invite?token=abc123                               │
│                                                                             │
│         ┌─────────────────────────────────────────────┐                     │
│         │       Is invitation token valid?            │                     │
│         └─────────────────────────────────────────────┘                     │
│                    │                    │                                   │
│                   NO                   YES                                  │
│                    │                    │                                   │
│                    ▼                    ▼                                   │
│  ┌────────────────────────┐   ┌────────────────────────────────────────┐   │
│  │ Error Screen           │   │ Does user have an account?             │   │
│  │                        │   └────────────────────────────────────────┘   │
│  │ "This invitation has   │            │                    │              │
│  │ expired or is invalid" │           NO                   YES             │
│  │                        │            │                    │              │
│  │ [Request new invite]   │            ▼                    ▼              │
│  └────────────────────────┘   ┌────────────────┐   ┌────────────────────┐  │
│                               │ Show inline    │   │ Show "Sign in to   │  │
│                               │ account        │   │ accept" prompt     │  │
│                               │ creation form  │   │                    │  │
│                               │                │   │ [Sign in →]        │  │
│                               │ • Email        │   └────────────────────┘  │
│                               │ • Password     │            │              │
│                               │ • Name         │            │              │
│                               │                │            │              │
│                               │ [Create & Join]│            │              │
│                               └────────────────┘            │              │
│                                       │                     │              │
│                                       ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Invitation Preview                               │   │
│  │                                                                      │   │
│  │   ┌────────────────────────────────────────────────────────────┐    │   │
│  │   │ 🎉 You're invited to join                                   │    │   │
│  │   │                                                             │    │   │
│  │   │    ACME DESIGN                                              │    │   │
│  │   │                                                             │    │   │
│  │   │    Invited by: John Smith                                  │    │   │
│  │   │    Your role: EDITOR                                       │    │   │
│  │   │                                                             │    │   │
│  │   │    "You'll be able to create and manage issues."           │    │   │
│  │   └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │            [Accept Invitation]  [Decline]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌──────────────────────┐                           │
│                         │  🎉 Welcome!          │                           │
│                         │  Redirect to          │                           │
│                         │  /workspaces/[slug]   │                           │
│                         └──────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Self-Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELF-REGISTRATION FLOW                              │
│                         (Requirement 8)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User completes sign-up at /sign-up                                        │
│                                                                             │
│         ┌─────────────────────────────────────────────┐                     │
│         │    Check MULTI_WORKSPACE_MODE               │                     │
│         └─────────────────────────────────────────────┘                     │
│                    │                    │                                   │
│              SINGLE MODE           MULTI MODE                               │
│                    │                    │                                   │
│                    ▼                    ▼                                   │
│  ┌────────────────────────┐   ┌───────────────────────────────────────────┐│
│  │ Auto-join default      │   │                Choose Your Path           ││
│  │ workspace as MEMBER    │   │                                           ││
│  │                        │   │  ┌─────────────────────┐ ┌──────────────┐ ││
│  │ [Go to Dashboard →]    │   │  │ 🏢 Create workspace │ │ 📨 Have code │ ││
│  └────────────────────────┘   │  │                     │ │              │ ││
│            │                  │  │ Set up your own     │ │ Join existing│ ││
│            │                  │  │ workspace           │ │ workspace    │ ││
│            │                  │  │                     │ │              │ ││
│            │                  │  │ [Select →]          │ │ [Select →]   │ ││
│            │                  │  └─────────────────────┘ └──────────────┘ ││
│            │                  │          │                      │          ││
│            │                  └──────────┼──────────────────────┼──────────┘│
│            │                             │                      │           │
│            │                             ▼                      ▼           │
│            │                  ┌──────────────────┐   ┌──────────────────┐   │
│            │                  │ Workspace Create │   │ Enter Invite Code│   │
│            │                  │                  │   │                  │   │
│            │                  │ Name: [________] │   │ Code: [________] │   │
│            │                  │                  │   │                  │   │
│            │                  │ [Create →]       │   │ [Join →]         │   │
│            │                  └──────────────────┘   └──────────────────┘   │
│            │                             │                      │           │
│            ▼                             ▼                      ▼           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    🎉 Welcome to your workspace!                      │  │
│  │                    Redirect to /workspaces/[slug]                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Degradation Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SERVICE DEGRADATION TABLE                               │
│                     (Requirement 9)                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┬─────────────────────────┬─────────────────────────────┐   │
│  │ Service     │ Configured              │ Not Configured              │   │
│  ├─────────────┼─────────────────────────┼─────────────────────────────┤   │
│  │ Database    │ ✓ Required - app works  │ ✗ App shows error page      │   │
│  ├─────────────┼─────────────────────────┼─────────────────────────────┤   │
│  │ Email       │ ✓ Send invitation       │ ⚠ Show "Copy Link" button   │   │
│  │ (Resend)    │   emails automatically  │   in invitation modal       │   │
│  ├─────────────┼─────────────────────────┼─────────────────────────────┤   │
│  │ Storage     │ ✓ Upload files to       │ ⚠ Local filesystem storage  │   │
│  │ (R2/S3)     │   cloud up to limits    │   with 10MB per-file limit  │   │
│  ├─────────────┼─────────────────────────┼─────────────────────────────┤   │
│  │ Redis       │ ✓ Distributed rate      │ ⚠ In-memory rate limiting   │   │
│  │             │   limiting across pods  │   (resets on restart)       │   │
│  └─────────────┴─────────────────────────┴─────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workspace Mode Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WORKSPACE MODE COMPARISON                               │
│                     (Requirements 11, 12, 13)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Environment Variable: MULTI_WORKSPACE_MODE                                 │
│                                                                             │
│  ┌───────────────────────┬─────────────────────┬─────────────────────────┐ │
│  │ Feature               │ Single Mode (false) │ Multi Mode (true)       │ │
│  ├───────────────────────┼─────────────────────┼─────────────────────────┤ │
│  │ Workspace switcher    │ Hidden              │ Visible                 │ │
│  ├───────────────────────┼─────────────────────┼─────────────────────────┤ │
│  │ Create workspace btn  │ Hidden              │ Visible                 │ │
│  ├───────────────────────┼─────────────────────┼─────────────────────────┤ │
│  │ Settings navigation   │ "Settings"          │ "Workspace Settings"    │ │
│  ├───────────────────────┼─────────────────────┼─────────────────────────┤ │
│  │ New user onboarding   │ Auto-join default   │ Create or join choice   │ │
│  ├───────────────────────┼─────────────────────┼─────────────────────────┤ │
│  │ Multiple memberships  │ No                  │ Yes                     │ │
│  ├───────────────────────┼─────────────────────┼─────────────────────────┤ │
│  │ Ideal for             │ Small teams,        │ Agencies, enterprises,  │ │
│  │                       │ single-org hosting  │ SaaS deployments        │ │
│  └───────────────────────┴─────────────────────┴─────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
