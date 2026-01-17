# Workspace Architecture

UI SyncUp uses a **Workspace** model to organize users, projects, and resources. This document describes the workspace architecture and configuration options.

## Overview

A **Workspace** is the top-level organizational unit in UI SyncUp. It contains:
- **Members** with assigned roles
- **Projects** for organizing issues and annotations
- **Settings** for workspace-level configuration

```
Instance
├── Workspace(s)
│   ├── Members (with roles)
│   ├── Projects
│   │   ├── Issues
│   │   └── Annotations
│   └── Settings
```

---

## Workspace Modes

UI SyncUp supports two operational modes controlled by the `MULTI_WORKSPACE_MODE` environment variable:

### Single-Workspace Mode (Default)

```bash
MULTI_WORKSPACE_MODE=false  # or not set
```

**Behavior:**
- One workspace is auto-created during initial setup
- Admin names the workspace during setup wizard
- Workspace switcher is hidden in the UI
- All users belong to the single workspace
- Simplified onboarding (no "create workspace" choice)
- Ideal for small teams, agencies, and single-org self-hosting

**UI Changes in Single Mode:**
| Component | Multi-Workspace | Single-Workspace |
|-----------|-----------------|------------------|
| Sidebar workspace switcher | Visible | Hidden |
| "Create new workspace" button | Visible | Hidden |
| Workspace settings navigation | "Workspace Settings" | "Settings" |
| Onboarding flow | Choice: create/join | Direct to dashboard |

### Multi-Workspace Mode

```bash
MULTI_WORKSPACE_MODE=true
```

**Behavior:**
- Users can create multiple workspaces
- Users can be members of multiple workspaces
- Workspace switcher is visible
- Full workspace management UI available
- Ideal for agencies, enterprises, or SaaS deployments

---

## Data Model

### Workspace Entity

```typescript
interface Workspace {
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
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX workspaces_slug_idx ON workspaces(slug);
```

> **Note:** The current codebase uses `teams` table. A migration will rename this to `workspaces` as part of the workspace refactor.

---

## Workspace Roles

Workspace roles follow a **two-tier hierarchy**:

### Management Roles (Workspace Settings Access)

| Role | Description |
|------|-------------|
| **WORKSPACE_OWNER** | Full control over workspace and members. Can delete workspace and transfer ownership. |
| **WORKSPACE_ADMIN** | Manage members, projects, integrations. Cannot delete workspace or transfer ownership. |

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

---

## Workspace Mode Detection

The system detects workspace mode at runtime:

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
| Show workspace switcher | `isMultiWorkspaceMode()` |
| Allow workspace creation | `isMultiWorkspaceMode()` |
| Show "Create workspace" in onboarding | `isMultiWorkspaceMode()` |
| Require workspace selection on login | `isMultiWorkspaceMode() && userHasMultipleWorkspaces` |

---

## API Endpoints

### Workspace Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces` | List user's workspaces |
| `POST` | `/api/workspaces` | Create new workspace |
| `GET` | `/api/workspaces/:id` | Get workspace details |
| `PATCH` | `/api/workspaces/:id` | Update workspace |
| `DELETE` | `/api/workspaces/:id` | Soft delete workspace |
| `POST` | `/api/workspaces/:id/switch` | Switch active workspace |

### Workspace Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces/:id/members` | List workspace members |
| `POST` | `/api/workspaces/:id/members` | Add member |
| `PATCH` | `/api/workspaces/:id/members/:userId` | Update member role |
| `DELETE` | `/api/workspaces/:id/members/:userId` | Remove member |

---

## Setup Wizard Integration

### Single-Workspace Mode Setup

During initial setup in single-workspace mode:

1. **Service Health Check** - Verify database connection
2. **Create Admin Account** - First user becomes admin
3. **Configure Instance** - Set instance name and URL
4. **Create Workspace** - Name the default workspace (required)
5. **Optional Sample Data** - Create demo project

The workspace created in step 4 becomes the permanent workspace for this instance.

### Multi-Workspace Mode Setup

Same as single-workspace, but after setup:
- Users can create additional workspaces
- Workspace switcher appears in sidebar
- New users choose: "Create workspace" or "Join with invite"

---

## Migration Strategy

The transition from "Teams" to "Workspaces" will be semantic only:

### Phase 1: Documentation & Types (Current)
- Update all documentation to use "Workspace" terminology
- Update TypeScript types and interfaces
- Update UI text and labels

### Phase 2: Database Migration (Future)
- Rename `teams` table to `workspaces`
- Rename `team_members` table to `workspace_members`
- Update foreign keys and indexes

### Phase 3: API Routes (Future)
- Create new `/api/workspaces/*` routes
- Deprecate `/api/teams/*` routes with redirect
- Update client API calls

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MULTI_WORKSPACE_MODE` | `false` | Enable multi-workspace features |

---

## UI Components

### Workspace Switcher (Multi-Mode Only)

Located in the sidebar, allows users to:
- See current workspace name and logo
- Switch between workspaces
- Create new workspace (if enabled)

### Workspace Settings

Accessible via workspace dropdown or settings navigation:
- General settings (name, description, image)
- Member management
- Role assignments
- Danger zone (delete workspace)

---

## Best Practices

### Single-Workspace Deployments
- Set `MULTI_WORKSPACE_MODE=false` (or leave unset)
- Choose a descriptive workspace name during setup
- All users will automatically be part of this workspace

### Multi-Workspace Deployments
- Set `MULTI_WORKSPACE_MODE=true`
- Consider naming conventions for workspaces
- Use workspace-based access control for department separation

### Self-Hosting
- Single-workspace mode is recommended for most self-hosted instances
- Keeps the UI clean and reduces cognitive load
- Can enable multi-workspace later if needed

---

## Related Documentation

- [RBAC Documentation](./RBAC.md) - Role-based access control
- [Resource Limits](./RESOURCE_LIMITS.md) - Quotas and limits
- [Onboarding Specification](/.kiro/specs/refactor-onboarding/requirements.md) - Setup wizard details
