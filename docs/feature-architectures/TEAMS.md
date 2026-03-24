# Team Architecture

UI SyncUp uses a **Team** model to organize users, projects, and resources. This document describes the team architecture and configuration options.

## Overview

A **Team** is the top-level organizational unit in UI SyncUp. It contains:
- **Members** with assigned roles
- **Projects** for organizing issues and annotations
- **Settings** for team-level configuration

```
Instance
├── Team(s)
│   ├── Members (with roles)
│   ├── Projects
│   │   ├── Issues
│   │   └── Annotations
│   └── Settings
```

---

## Team Modes

UI SyncUp supports two operational modes controlled by the `MULTI_WORKSPACE_MODE` environment variable:

### Single-Team Mode (Default)

```bash
MULTI_WORKSPACE_MODE=false  # or not set
```

**Behavior:**
- One team is auto-created during initial setup
- Admin names the team during setup wizard
- Team switcher is hidden in the UI
- All users belong to the single team
- Simplified onboarding (no "create team" choice)
- Ideal for small teams, agencies, and single-org self-hosting

**UI Changes in Single Mode:**
| Component | Multi-Team | Single-Team |
|-----------|------------|-------------|
| Sidebar team switcher | Visible | Hidden |
| "Create new team" button | Visible | Hidden |
| Team settings navigation | "Team Settings" | "Settings" |
| Onboarding flow | Choice: create/join | Direct to dashboard |

### Multi-Team Mode

```bash
MULTI_WORKSPACE_MODE=true
```

**Behavior:**
- Users can create multiple teams
- Users can be members of multiple teams
- Team switcher is visible
- Full team management UI available
- Ideal for agencies, enterprises, or SaaS deployments

---

## Data Model

### Team Entity

```typescript
interface Team {
  id: string;           // UUID
  name: string;         // Display name (2-50 chars)
  slug: string;         // URL-safe identifier
  description?: string; // Optional description
  image?: string;       // Optional logo URL
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;     // Soft delete support
}
```

### Database Schema

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX teams_slug_idx ON teams(slug);
```

---

## Team Roles

Team roles follow a **two-tier hierarchy**:

### Management Roles (Team Settings Access)

| Role | Description |
|------|-------------|
| **WORKSPACE_OWNER** | Full control over team and members. Can delete team and transfer ownership. |
| **WORKSPACE_ADMIN** | Manage members, projects, integrations. Cannot delete team or transfer ownership. |

### Operational Roles (Content Access)

| Role | Level | Description |
|------|-------|-------------|
| **WORKSPACE_EDITOR** | 3 | Create and manage issues and annotations. |
| **WORKSPACE_MEMBER** | 2 | View projects and comment on issues. |
| **WORKSPACE_VIEWER** | 1 | View-only access to projects and issues. |

### Role Assignment

Users have **one management role** (optional) + **one operational role** (required):

- `WORKSPACE_OWNER` + `WORKSPACE_EDITOR` → Owner who creates content
- `WORKSPACE_OWNER` + `WORKSPACE_MEMBER` → Owner who only manages
- `WORKSPACE_ADMIN` + `WORKSPACE_VIEWER` → Admin with read-only content access
- `WORKSPACE_EDITOR` (no management role) → Content creator
- `WORKSPACE_MEMBER` (no management role) → Collaborator

> **Note:** Role enum values (`WORKSPACE_OWNER`, `WORKSPACE_EDITOR`, etc.) are internal identifiers kept for backwards compatibility. The user-facing label for these is "Team Owner", "Team Admin", etc.

---

## Team Mode Detection

The system detects team mode at runtime:

```typescript
// src/config/workspace.ts
export const WORKSPACE_CONFIG = {
  multiWorkspaceMode: process.env.MULTI_WORKSPACE_MODE === 'true',
};

export function isMultiWorkspaceMode(): boolean {
  return WORKSPACE_CONFIG.multiWorkspaceMode;
}
```

### Mode-Dependent Behavior

| Feature | Check Function |
|---------|----------------|
| Show team switcher | `isMultiWorkspaceMode()` |
| Allow team creation | `isMultiWorkspaceMode()` |
| Show "Create team" in onboarding | `isMultiWorkspaceMode()` |
| Require team selection on login | `isMultiWorkspaceMode() && userHasMultipleTeams` |

---

## API Endpoints

### Team Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams` | List user's teams |
| `POST` | `/api/teams` | Create new team |
| `GET` | `/api/teams/:id` | Get team details |
| `PATCH` | `/api/teams/:id` | Update team |
| `DELETE` | `/api/teams/:id` | Soft delete team |
| `POST` | `/api/teams/:id/switch` | Switch active team |

### Team Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams/:id/members` | List team members |
| `POST` | `/api/teams/:id/members` | Add member |
| `PATCH` | `/api/teams/:id/members/:userId` | Update member role |
| `DELETE` | `/api/teams/:id/members/:userId` | Remove member |

---

## Setup Wizard Integration

### Single-Team Mode Setup

During initial setup in single-team mode:

1. **Service Health Check** - Verify database connection
2. **Create Admin Account** - First user becomes admin
3. **Configure Instance** - Set instance name
4. **Create Team** - Name the default team (required)
5. **Optional Sample Data** - Create demo project

The team created in step 4 becomes the permanent team for this instance. On completion, the `team_id` cookie is set automatically so the admin can access `/team/settings` immediately.

### Multi-Team Mode Setup

Same as single-team, but after setup:
- Users can create additional teams
- Team switcher appears in sidebar
- New users choose: "Create team" or "Join with invite"

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MULTI_WORKSPACE_MODE` | `false` | Enable multi-team features |

---

## UI Components

### Team Switcher (Multi-Mode Only)

Located in the sidebar, allows users to:
- See current team name and logo
- Switch between teams
- Create new team (if enabled)

### Team Settings

Accessible via team dropdown or settings navigation:
- General settings (name, description, image)
- Member management
- Role assignments
- Danger zone (delete team)

---

## Best Practices

### Single-Team Deployments
- Set `MULTI_WORKSPACE_MODE=false` (or leave unset)
- Choose a descriptive team name during setup
- All users will automatically be part of this team

### Multi-Team Deployments
- Set `MULTI_WORKSPACE_MODE=true`
- Consider naming conventions for teams
- Use team-based access control for department separation

### Self-Hosting
- Single-team mode is recommended for most self-hosted instances
- Keeps the UI clean and reduces cognitive load
- Can enable multi-team later if needed

---

## Related Documentation

- [RBAC Documentation](./RBAC.md) - Role-based access control
- [Resource Limits](./RESOURCE_LIMITS.md) - Quotas and limits
- [Onboarding Specification](/.ai/specs/refactor-onboarding/requirements.md) - Setup wizard details
