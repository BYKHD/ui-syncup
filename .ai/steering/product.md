# Product Overview

UI SyncUp is a visual feedback and issue tracking platform for design-to-development collaboration. It enables designers, QA, and developers to annotate UI mockups, create issues from visual feedback, and track them through a workflow from creation to resolution.

## Core Features

- **Visual Annotations**: Pin-based and box annotations on images/mockups with threaded comments
- **Issue Management**: Create, track, and resolve UI/UX issues with workflow states (Open → In Progress → In Review → Resolved → Archived)
- **Team & Project Organization**: Multi-team workspace with project-based access control
- **Two-Tier Role System**: Management roles (OWNER, ADMIN) for team settings + Operational roles (EDITOR, MEMBER, VIEWER) for content access
- **Flexible Deployment**: Self-host for complete control or use managed cloud services

## Role System

### Management Roles (Team Settings Access)
- **TEAM_OWNER**: Full control over team, settings, members. Can delete team and transfer ownership.
- **TEAM_ADMIN**: Manage members, projects, integrations. Cannot delete team or transfer ownership.

### Operational Roles (Content Access)
- **TEAM_EDITOR**: Create and manage issues/annotations. Auto-assigned when user becomes PROJECT_OWNER or PROJECT_EDITOR.
- **TEAM_MEMBER**: View projects and comment. Can be assigned to projects.
- **TEAM_VIEWER**: Read-only access.

### Project Roles
- **PROJECT_OWNER**: Full project control. Auto-promotes to TEAM_EDITOR.
- **PROJECT_EDITOR**: Create/manage issues. Auto-promotes to TEAM_EDITOR.
- **PROJECT_DEVELOPER**: Update issue status and comment.
- **PROJECT_VIEWER**: Read-only project access.

## Target Users

- **Designers/QA** (PROJECT_EDITOR + TEAM_EDITOR): Create issues, annotate mockups, review implementations
- **Developers** (PROJECT_DEVELOPER + TEAM_MEMBER): View issues, update status, implement fixes
- **Project Managers** (PROJECT_OWNER + TEAM_EDITOR): Manage projects, assign roles, track progress
- **Team Admins** (TEAM_ADMIN): Manage team settings and member access
- **Team Owners** (TEAM_OWNER): Full team control

## Open Source & Deployment

**License**: MIT License - Free for personal and commercial use.

**Self-Hosting**:
- Docker Compose support for easy deployment
- Requires PostgreSQL and Supabase (Self-hosted or Cloud)
- Full data ownership and privacy

**Community**:
- Issues & Feature Requests: GitHub Issues
- Discussions: GitHub Discussions
- Contributions: Pull Requests welcome (see CONTRIBUTING.md)
