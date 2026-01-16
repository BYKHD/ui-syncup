# Resource Limits & Quotas

## 1. Role Model

### A. Team-level roles
#### Management Roles
- **TEAM_OWNER**: Access team settings, manage members/settings, delete team.
- **TEAM_ADMIN**: Manage members, projects, integrations. Cannot delete team.

#### Operational Roles
- **TEAM_EDITOR**: Create/manage issues and annotations. Assigned to content creators.
- **TEAM_MEMBER**: View projects and comment.
- **TEAM_VIEWER**: Read-only access.

### B. Project-level roles
- **PROJECT_OWNER**: Full project control.
- **PROJECT_EDITOR**: Create/manage issues.
- **PROJECT_DEVELOPER**: Update issue status and comment.
- **PROJECT_VIEWER**: Read-only.

## 2. Resource Quotas

To ensure system stability and fair usage in self-hosted environments, we define resource quotas. These are configured via environment variables.

### Default Limits (Instance Level)
All teams on the instance share the same limits.

- **Members**: Configured via `MAX_MEMBERS_PER_TEAM` (default: unlimited)
- **Projects**: Configured via `MAX_PROJECTS_PER_TEAM` (default: 100)
- **Issues**: Configured via `MAX_ISSUES_PER_TEAM` (default: unlimited)
- **Storage**: Configured via `MAX_STORAGE_PER_TEAM_MB` (default: 10,000)

### Configuration (Env Vars)

These values are read at runtime.

```bash
# .env
MAX_MEMBERS_PER_TEAM="50"
MAX_PROJECTS_PER_TEAM="25"
MAX_ISSUES_PER_TEAM="1000"
MAX_STORAGE_PER_TEAM_MB="5000"
```

## 3. Enforcement

Enforcement logic resides in `server/limits/` (formerly entitlements).

```typescript
// src/server/limits/index.ts
import { QUOTAS } from '@/config/quotas'

export async function ensureCanCreateProject(teamId: string) {
  const usage = await getUsageForTeam(teamId)
  if (QUOTAS.projects !== "unlimited" && usage.projects >= QUOTAS.projects) {
    throw new Error("LIMIT_PROJECTS_REACHED")
  }
}
```

## 4. Workflows

Workflows are defined in `src/config/workflows.ts`.

## 5. Naming Conventions

- **TEAM_…** for team-level
- **PROJECT_…** for project-level
- API Routes: `/api/team/members`, `/api/projects`, `/api/issues`
