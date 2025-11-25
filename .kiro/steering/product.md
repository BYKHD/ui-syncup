# Product Overview

UI SyncUp is a visual feedback and issue tracking platform for design-to-development collaboration. It enables designers, QA, and developers to annotate UI mockups, create issues from visual feedback, and track them through a workflow from creation to resolution.

## Core Features

- **Visual Annotations**: Pin-based and box annotations on images/mockups with threaded comments
- **Issue Management**: Create, track, and resolve UI/UX issues with workflow states (Open → In Progress → In Review → Resolved → Archived)
- **Team & Project Organization**: Multi-team workspace with project-based access control
- **Two-Tier Role System**: Management roles (OWNER, ADMIN) for team settings + Operational roles (EDITOR, MEMBER, VIEWER) for content access
- **Plan-Based Limits**: Free tier (10 users, 1 project, 50 issues) and Pro tier (unlimited users, 50 projects, unlimited issues)

## Role System

### Management Roles (Team Settings Access)
- **TEAM_OWNER**: Full control over team, billing, members. Can delete team and transfer ownership. Not billable by itself.
- **TEAM_ADMIN**: Manage members, projects, integrations. Cannot delete team or transfer ownership. Not billable by itself.

### Operational Roles (Content Access & Billing)
- **TEAM_EDITOR**: Create and manage issues/annotations. **Billable ($8/month)**. Auto-assigned when user becomes PROJECT_OWNER or PROJECT_EDITOR.
- **TEAM_MEMBER**: View projects and comment. Can be assigned to projects. **Free**.
- **TEAM_VIEWER**: Read-only access. **Free**.

### Project Roles
- **PROJECT_OWNER**: Full project control. Auto-promotes to TEAM_EDITOR (billable).
- **PROJECT_EDITOR**: Create/manage issues. Auto-promotes to TEAM_EDITOR (billable).
- **PROJECT_DEVELOPER**: Update issue status and comment. **Free**.
- **PROJECT_VIEWER**: Read-only project access. **Free**.

## Target Users

- **Designers/QA** (PROJECT_EDITOR + TEAM_EDITOR): Create issues, annotate mockups, review implementations
- **Developers** (PROJECT_DEVELOPER + TEAM_MEMBER): View issues, update status, implement fixes
- **Project Managers** (PROJECT_OWNER + TEAM_EDITOR): Manage projects, assign roles, track progress
- **Team Admins** (TEAM_ADMIN + TEAM_MEMBER/VIEWER): Manage team settings without content creation (free) or with content creation (billable)
- **Team Owners** (TEAM_OWNER + any operational role): Full team control, billing determined by operational role

## Monetization

**Billing Model**: Pro plan bills per TEAM_EDITOR operational role at $8/month.

**Key Rules**:
- Only TEAM_EDITOR operational role is billable
- Management roles (TEAM_OWNER, TEAM_ADMIN) are NOT billable by themselves
- Users with PROJECT_OWNER or PROJECT_EDITOR automatically get TEAM_EDITOR (billable)
- PROJECT_DEVELOPER, TEAM_MEMBER, and TEAM_VIEWER are unlimited/free
- A TEAM_OWNER with TEAM_VIEWER operational role pays $0 (pure team manager)
- A TEAM_OWNER with TEAM_EDITOR operational role pays $8 (owner who also creates content)
