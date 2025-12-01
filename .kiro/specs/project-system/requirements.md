# Requirements Document

## Introduction

The Project System is the core organizational unit within UI SyncUp that enables teams to manage visual feedback and issue tracking. Projects serve as containers for Issues (Tickets) and documentation, with granular role-based access control. This spec covers wiring the existing ready-to-wire frontend implementation to a real backend, including database schema updates, API route handlers, and RBAC enforcement.

The frontend components and hooks are already implemented in `src/features/projects/` following the ready-to-wire pattern. This spec focuses on:
1. Updating the database schema to match the frontend types
2. Implementing API route handlers in `src/app/api/projects/`
3. Wiring the frontend hooks to real API calls
4. Enforcing RBAC on all project operations

## Glossary

- **Project**: A container for issues and documentation within a Team, identified by a unique key (e.g., "MKT") and slug.
- **Team**: The parent organizational unit that owns one or more Projects.
- **Project Role**: One of four access levels within a project: `owner`, `editor`, `member`, `viewer`.
- **Visibility**: Project access scope - `public` (visible to all team members) or `private` (invitation only).
- **Project Status**: Lifecycle state - `active` (normal operation) or `archived` (read-only, no new issues).
- **Project Member**: A user with an assigned role within a specific project.
- **Project Key**: A short uppercase identifier (2-10 characters) used in issue references (e.g., "MKT-123").
- **Slug**: A URL-friendly identifier derived from the project name.
- **Projects Page**: The team-scoped page at `/projects` that displays all accessible projects for the current team.

## Requirements

### Requirement 1

**User Story:** As a team member, I want to view a list of projects I have access to on the team's projects page, so that I can navigate to the project I need to work on.

#### Acceptance Criteria

1. WHEN a user navigates to the Projects Page THEN the System SHALL display all public projects in the team and all private projects where the user is a member.
2. WHEN a user has TEAM_OWNER or TEAM_ADMIN management role THEN the System SHALL include all private projects in the list regardless of membership.
3. WHEN the project list is displayed THEN the System SHALL show project statistics (total tickets, completed tickets, progress percentage, member count) for each project.
4. WHEN the user applies filter parameters THEN the System SHALL filter results by status, visibility, and search term.
5. WHEN the project list exceeds the page limit THEN the System SHALL return paginated results using **offset-based pagination** with page, limit, total, and totalPages metadata.
6. WHEN fetching project lists THEN the System SHALL use efficient aggregation to retrieve project stats (tickets, members) in a single query to avoid N+1 performance issues.
6. WHEN the project list is empty THEN the System SHALL display an empty state with a prompt to create the first project.

### Requirement 2

**User Story:** As a team member, I want to view project details, so that I can see the project's current state and my role within it.

#### Acceptance Criteria

1. WHEN a user requests a project by ID THEN the System SHALL return the project details if the user has view access.
2. WHEN a user without view access requests a private project THEN the System SHALL return a 403 Forbidden error.
3. WHEN project details are returned THEN the System SHALL include the user's current role within the project (or null if not a member).
4. WHEN project details are returned for a public project THEN the System SHALL indicate whether the user can join the project.

### Requirement 3

**User Story:** As a team editor, I want to create new projects, so that I can organize work into separate containers.

#### Acceptance Criteria

1. WHEN a user with PROJECT_CREATE permission submits a valid project creation request THEN the System SHALL create the project and assign the creator as PROJECT_OWNER.
2. WHEN a project is created THEN the System SHALL generate a URL-friendly slug from the project name.
3. WHEN a user attempts to create a project with a duplicate key within the same team THEN the System SHALL return a 409 Conflict error.
4. WHEN a user without PROJECT_CREATE permission attempts to create a project THEN the System SHALL return a 403 Forbidden error.
5. WHEN a project is created with PROJECT_OWNER or PROJECT_EDITOR role assignment THEN the System SHALL auto-promote the user to TEAM_EDITOR operational role if not already assigned.

### Requirement 4

**User Story:** As a project owner or editor, I want to update project settings, so that I can modify the project name, description, visibility, or status.

#### Acceptance Criteria

1. WHEN a user with PROJECT_UPDATE permission submits a valid update request THEN the System SHALL update the project and return the updated project.
2. WHEN a user without PROJECT_UPDATE permission attempts to update a project THEN the System SHALL return a 403 Forbidden error.
3. WHEN a project visibility is changed from public to private THEN the System SHALL retain all existing members.
4. WHEN a project visibility is changed from private to public THEN the System SHALL allow any team member to view and join the project.
5. WHEN a project status is changed to archived THEN the System SHALL prevent new issue creation while preserving read access.

### Requirement 5

**User Story:** As a project owner, I want to delete a project, so that I can remove projects that are no longer needed.

#### Acceptance Criteria

1. WHEN a user with PROJECT_DELETE permission requests project deletion THEN the System SHALL **soft delete** the project (set `deletedAt` timestamp) to prevent accidental data loss.
2. WHEN a user without PROJECT_DELETE permission attempts to delete a project THEN the System SHALL return a 403 Forbidden error.
3. WHEN a project is soft deleted THEN the System SHALL exclude it from all standard list and detail views.
4. WHEN a project is soft deleted THEN the System SHALL release its unique constraints (Key and Slug) so they can be reused by new projects.

### Requirement 6

**User Story:** As a team member, I want to join public projects, so that I can participate in projects that interest me.

#### Acceptance Criteria

1. WHEN a user requests to join a public project THEN the System SHALL add the user as a PROJECT_VIEWER member.
2. WHEN a user attempts to join a private project without invitation THEN the System SHALL return a 403 Forbidden error.
3. WHEN a user who is already a member attempts to join a project THEN the System SHALL return a 409 Conflict error.

### Requirement 7

**User Story:** As a project member, I want to leave a project, so that I can remove myself from projects I no longer need access to.

#### Acceptance Criteria

1. WHEN a non-owner member requests to leave a project THEN the System SHALL remove the member from the project.
2. WHEN the sole PROJECT_OWNER attempts to leave a project THEN the System SHALL return a 400 Bad Request error with a message indicating ownership must be transferred first.
3. WHEN a user leaves a project THEN the System SHALL revoke all project-specific permissions for that user.

### Requirement 8

**User Story:** As a project owner, I want to manage project members, so that I can control who has access and what they can do.

#### Acceptance Criteria

1. WHEN a user with PROJECT_MANAGE_MEMBERS permission requests the member list THEN the System SHALL return all project members with their roles.
2. WHEN a user with PROJECT_MANAGE_MEMBERS permission updates a member's role THEN the System SHALL update the role and return the updated member.
3. WHEN a user with PROJECT_MANAGE_MEMBERS permission removes a member THEN the System SHALL remove the member from the project.
4. WHEN a user attempts to change the role of the sole PROJECT_OWNER THEN the System SHALL return a 400 Bad Request error.
5. WHEN a member is assigned PROJECT_OWNER or PROJECT_EDITOR role THEN the System SHALL auto-promote the user to TEAM_EDITOR operational role if not already assigned.
6. WHEN a user without PROJECT_MANAGE_MEMBERS permission attempts to manage members THEN the System SHALL return a 403 Forbidden error.

### Requirement 9

**User Story:** As a developer, I want the project data to be persisted correctly, so that project information is reliable and consistent.

#### Acceptance Criteria

1. THE System SHALL store projects with the following fields: id (UUID), teamId (FK), name, key, slug, description, icon, visibility (public/private), status (active/archived), createdAt, updatedAt, **deletedAt**.
2. THE System SHALL store project members with the following fields: projectId (FK), userId (FK), role (owner/editor/member/viewer), joinedAt.
3. THE System SHALL enforce unique constraint on (teamId, key) combination **only for non-deleted projects**.
4. THE System SHALL enforce unique constraint on (teamId, slug) combination **only for non-deleted projects**.
5. THE System SHALL use database transactions for multi-step operations (e.g., create project + add owner) to ensure data integrity.
6. THE System SHALL default project status to 'active' when creating a new project.
7. THE System SHALL default project visibility to 'private' when creating a new project.
8. WHEN project data is serialized for API responses THEN the System SHALL validate the response against the defined Zod schemas.
9. WHEN project data is deserialized from API requests THEN the System SHALL validate the request against the defined Zod schemas.

### Requirement 10

**User Story:** As a developer, I want project API responses to be validated, so that I can trust the data format is correct.

#### Acceptance Criteria

1. WHEN serializing a project for API response THEN the System SHALL produce output that round-trips through parse(serialize(project)) without data loss.
2. WHEN deserializing a project creation request THEN the System SHALL produce output that round-trips through serialize(parse(request)) without data loss.
