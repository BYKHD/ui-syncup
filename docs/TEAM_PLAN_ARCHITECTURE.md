# Team & Plan Architecture

## 1. Role model (reduce ambiguity)

### A. Team-level roles (two-tier hierarchy)

#### Management Roles (not billable by themselves)

- **TEAM_OWNER**
  - Access team settings
  - 1 per team (default to who created)
  - Can manage billing, plan, members, delete team
  - Can transfer ownership to another user
  - **Not billable by itself**
  - Must also have an operational role (EDITOR/MEMBER/VIEWER)

- **TEAM_ADMIN**
  - Access team settings
  - Manage members, projects, integrations
  - Cannot delete team or transfer ownership
  - **Not billable by itself**
  - Must also have an operational role (EDITOR/MEMBER/VIEWER)

#### Operational Roles (determine billing)

- **TEAM_EDITOR**
  - **Billable seat ($8/month)**
  - Inherits member access plus edit rights for project content
  - Automatically assigned whenever a user becomes PROJECT_OWNER or PROJECT_EDITOR
  - Can create and manage issues and annotations

- **TEAM_MEMBER**
  - **Not billable**
  - Can be assigned to projects
  - Can view and comment (cannot create projects)

- **TEAM_VIEWER**
  - **Not billable**
  - Read-only across the team

#### Role Combination Examples

Users have **one management role** (or none) + **one operational role**:

- `TEAM_OWNER` + `TEAM_EDITOR` → **Billed 1 seat** (owner who also creates issues)
- `TEAM_OWNER` + `TEAM_MEMBER` → **Billed 0 seats** (owner who only manages team)
- `TEAM_ADMIN` + `TEAM_EDITOR` → **Billed 1 seat** (admin who also creates issues)
- `TEAM_ADMIN` + `TEAM_VIEWER` → **Billed 0 seats** (admin with read-only access)
- `TEAM_EDITOR` (no management role) → **Billed 1 seat** (designer/QA)
- `TEAM_MEMBER` (no management role) → **Billed 0 seats** (developer)

**Key insight:** Billing is determined solely by operational role (EDITOR/MEMBER/VIEWER), not by management role (OWNER/ADMIN).

#### Enforcing Management + Operational Role Requirement

Management roles (TEAM_OWNER, TEAM_ADMIN) **must always** be paired with an operational role. To prevent invalid states:

```typescript
// src/server/teams/validation.ts
export async function ensureManagementRoleHasOperationalRole(
  teamId: string,
  userId: string
) {
  const roles = await getUserRolesForTeam(userId, teamId)

  const hasManagementRole = roles.some(r =>
    ['TEAM_OWNER', 'TEAM_ADMIN'].includes(r)
  )
  const hasOperationalRole = roles.some(r =>
    ['TEAM_EDITOR', 'TEAM_MEMBER', 'TEAM_VIEWER'].includes(r)
  )

  if (hasManagementRole && !hasOperationalRole) {
    throw new Error('MANAGEMENT_ROLE_REQUIRES_OPERATIONAL_ROLE')
  }
}
```

**Implementation points:**
- Call this validation when assigning/removing roles
- Prevent removing operational role if user has management role
- When assigning TEAM_OWNER/TEAM_ADMIN, require operational role selection
- Consider DB constraint or periodic cleanup job to prevent orphaned states

### B. Project-level roles (who does the UI feedback work)

Per-project, we can be more specific:
- **PROJECT_OWNER** – usually the designer/PM who created the project (can create issues, edit issue details, change status forward/back) - can delete project
- **PROJECT_EDITOR** – Designer / QA (can create issues, edit issue details, change status forward/back)
- **PROJECT_DEVELOPER** – can move workflow status + comment, but cannot create/edit issue meta 
- **PROJECT_VIEWER** – read-only

You can store this as a mapping in DB:

```typescript
// src/config/roles.ts

// Management roles (not billable by themselves)
export const TEAM_MANAGEMENT_ROLES = ["TEAM_OWNER", "TEAM_ADMIN"] as const

// Operational roles (determine billing)
export const TEAM_OPERATIONAL_ROLES = ["TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER"] as const

// All team roles
export const TEAM_ROLES = [...TEAM_MANAGEMENT_ROLES, ...TEAM_OPERATIONAL_ROLES] as const

// Project roles
export const PROJECT_ROLES = ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER", "PROJECT_VIEWER"] as const

// Billable roles (single source of truth for billing)
// Note: PROJECT_OWNER and PROJECT_EDITOR auto-promote users to TEAM_EDITOR
// So we only need to count TEAM_EDITOR for billing purposes
export const BILLABLE_ROLES = ["TEAM_EDITOR"] as const
```

And an RBAC map:

```typescript
export const PERMISSIONS = {
  // Team management (requires management role)
  "team:manage_billing": ["TEAM_OWNER"],
  "team:delete": ["TEAM_OWNER"],
  "team:transfer_ownership": ["TEAM_OWNER"],
  "team:manage_members": ["TEAM_OWNER", "TEAM_ADMIN"],
  "team:manage_settings": ["TEAM_OWNER", "TEAM_ADMIN"],
  "team:view_settings": ["TEAM_OWNER", "TEAM_ADMIN"],

  // Team operations (requires operational role)
  "team:view": ["TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER"],
  
  // Project operations (requires operational role OR management role)
  "project:create": ["TEAM_EDITOR"], // only editors can create projects
  "project:view": ["TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER"],
  
  // Issue operations (project-level)
  "issue:create": ["PROJECT_OWNER", "PROJECT_EDITOR"],
  "issue:edit": ["PROJECT_OWNER", "PROJECT_EDITOR"],
  "issue:change_status": ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER"],
  "issue:comment": ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER", "PROJECT_VIEWER"],
}
```


---

## 2. Plans / monetization idea


**Free** (displayed as "Starter" in onboarding UI)
- up to 10 users
- 1 project
- 50 issues
- 100MB
- $0

**Pro**
- unlimited users
- 50 projects
- unlimited issues
- 80GB
- $8 per user/month (billed per TEAM_EDITOR seat; PROJECT_OWNER/PROJECT_EDITOR auto-upgrade)


### A. Single source of truth

Put it in: `src/config/tiers.ts`

```typescript
// src/config/tiers.ts
export type PlanId = "free" | "pro"
// Note: "free" is the canonical plan ID; display as "Starter" in UI/onboarding

type LimitSpec = {
  members: number | "unlimited"
  projects: number | "unlimited"
  issues: number | "unlimited"
  storageMB: number | "unlimited"
}

type BillingSpec =
  | { model: "free"; price: 0 }
  | { model: "per_editor"; priceUSD: number }

export type PlanSpec = {
  id: PlanId
  label: string
  limits: LimitSpec
  features: {
    jiraIntegration: boolean
    prioritySupport: boolean
    analytics: boolean
    privateProjects: boolean
  }
  billing: BillingSpec
}

export const PLANS: Record<PlanId, PlanSpec> = {
  free: {
    id: "free",
    label: "Starter", // Display name for onboarding/UI
    limits: {
      members: 10,           // team-level heads
      projects: 1,
      issues: 50,
      storageMB: 100,
    },
    features: {
      jiraIntegration: false,
      prioritySupport: false,
      analytics: false,
      privateProjects: true,
    },
    billing: { model: "free", price: 0 },
  },
  pro: {
    id: "pro",
    label: "Pro",
    limits: {
      members: "unlimited",
      projects: 50,
      issues: "unlimited",
      storageMB: 80_000, // 80GB
    },
    features: {
      jiraIntegration: true,
      prioritySupport: true,
      analytics: true,
      privateProjects: true,
    },
    // IMPORTANT: bill per EDITOR (project-level)
    billing: { model: "per_editor", priceUSD: 8 },
  },
}

// Helper for UI/onboarding contexts
export function getPlanDisplayName(planId: PlanId): string {
  return PLANS[planId].label
}
```

**Plan ID Consistency:**
- **Database/Billing/Analytics:** Always use `"free"` as the canonical plan ID
- **UI/Onboarding:** Display as `"Starter"` using the `label` field from PLANS config
- **Never store** `"starter"` in the database—always normalize to `"free"`
- This prevents confusion in reporting, billing calculations, and analytics dashboards

### B. How to do "$8 per editor"

**Billing Logic:**
1. Count unique users with `TEAM_EDITOR` operational role
2. Ignore management roles (TEAM_OWNER, TEAM_ADMIN) for billing
3. Bill: `editorCount × $8/month`

**Auto-promotion Rules:**
- When a user becomes `PROJECT_OWNER` or `PROJECT_EDITOR`, automatically assign `TEAM_EDITOR` operational role
- Keep `TEAM_EDITOR` even if project roles are later removed (downgrade only happens if admin explicitly changes operational role)
- Management roles (OWNER/ADMIN) are assigned separately and don't affect billing

**Example Billing Scenarios:**

| User | Management Role | Operational Role | Project Roles | Billable? |
|------|----------------|------------------|---------------|-----------|
| Alice | TEAM_OWNER | TEAM_EDITOR | PROJECT_OWNER (Project A) | ✅ 1 seat |
| Bob | TEAM_ADMIN | TEAM_MEMBER | PROJECT_DEVELOPER (Project B) | ❌ 0 seats |
| Carol | - | TEAM_EDITOR | PROJECT_EDITOR (Project C) | ✅ 1 seat |
| Dave | - | TEAM_MEMBER | PROJECT_DEVELOPER (Project D) | ❌ 0 seats |
| Eve | TEAM_OWNER | TEAM_VIEWER | - | ❌ 0 seats |

**Total: 2 billable seats × $8 = $16/month**

**Implementation tip:** 
```typescript
// server/projects/memberships.ts
async function assignProjectRole(userId: string, projectId: string, role: ProjectRole) {
  // Assign project role
  await assignRole({ userId, role, resourceType: 'project', resourceId: projectId })
  
  // Auto-promote to TEAM_EDITOR if needed
  if (role === 'PROJECT_OWNER' || role === 'PROJECT_EDITOR') {
    const teamId = await getTeamIdFromProject(projectId)
    await ensureOperationalRole(userId, teamId, 'TEAM_EDITOR')
  }
}
```

**Edge Case: Demoting PROJECT_OWNER**

Every project must always have at least one PROJECT_OWNER. When demoting a user from TEAM_EDITOR to TEAM_VIEWER/TEAM_MEMBER:

1. **Check their project roles** - Find all projects where this user is PROJECT_OWNER
2. **Block demotion if they're an owner** - Show error: "You can't demote this user yet. They are the only project owner on: Project A, Project B. Transfer ownership first."
3. **Provide transfer UI** - Let admin select new owners for each project
4. **Transfer in transaction** - Transfer all ownerships, then demote the user

```typescript
// server/teams/members.ts
async function demoteTeamMember(userId: string, teamId: string, newRole: 'TEAM_VIEWER' | 'TEAM_MEMBER') {
  // Check if user owns any projects
  const ownedProjects = await getOwnedProjects(userId)
  
  if (ownedProjects.length > 0) {
    throw new Error(
      `DEMOTION_BLOCKED: User owns ${ownedProjects.length} project(s). ` +
      `Transfer ownership first. Project IDs: ${ownedProjects.join(', ')}`
    )
  }
  
  // Safe to demote
  await updateRole(userId, 'TEAM_EDITOR', newRole, 'team', teamId)
}

// Or use the safe helper with ownership transfer
async function demoteWithTransfer(
  userId: string,
  teamId: string,
  newRole: 'TEAM_VIEWER' | 'TEAM_MEMBER',
  transfers: Record<string, string> // projectId -> newOwnerId
) {
  await demoteWithOwnershipTransfer(userId, teamId, newRole, transfers)
}
```

---

## 3. Where to put workflow 

Put  orkflow in `src/config/workflows.ts` so it's not repeated in components:

```typescript
// src/config/workflows.ts
export const ISSUE_WORKFLOW = {
  open: {
    label: "Open",
    description: "Created from design annotation; triage done. Ready for development.",
    stage: "creation",
    allowedTransitions: ["in_progress", "archived"],
    workflowNotes:
      "Issue has been created and triaged. Designer has provided clear requirements and assets. Ready for developer assignment.",
  },
  in_progress: {
    label: "In Progress",
    description: "Developer is implementing/fixing the issue.",
    stage: "development",
    allowedTransitions: ["in_review", "open", "archived"],
    workflowNotes: "Developer is actively working…",
  },
  in_review: {
    label: "In Review",
    description: "Waiting on design review. Implementation complete, needs approval.",
    stage: "review",
    allowedTransitions: ["resolved", "in_progress", "archived"],
  },
  resolved: {
    label: "Resolved",
    description: "Accepted by design; merged/deployed as defined.",
    stage: "completion",
    allowedTransitions: ["archived", "in_progress"],
    requiresConfirmation: true,
  },
  archived: {
    label: "Archived",
    description: "Long-term storage. No further edits expected.",
    stage: "storage",
    allowedTransitions: [],
    requiresConfirmation: true,
  },
} as const
```

Then, in mutation:

```typescript
// server/issues/can-transition.ts
import { ISSUE_WORKFLOW } from "@/src/config/workflows"
import { can } from "@/src/server/auth/rbac" // permission checker

export function canTransition(
  current: keyof typeof ISSUE_WORKFLOW,
  next: keyof typeof ISSUE_WORKFLOW,
  projectRole: string
) {
  const wf = ISSUE_WORKFLOW[current]
  if (!wf.allowedTransitions.includes(next)) return false
  // only dev, editor, owner can move
  return ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER"].includes(projectRole)
}
```

> Team-level roles (even TEAM_ADMIN) never grant workflow permissions by themselves—everyone must also hold a project role. If an admin needs edit powers, assign them as PROJECT_EDITOR/PROJECT_OWNER so they inherit the correct workflow abilities (and automatically become TEAM_EDITOR for billing).

---

## 4. Project scaffolding to match this

```
src/
├─ app/
│  ├─ layout.tsx
│  ├─ (auth)/...
│  └─ (protected)/
│     ├─ (team)/                     # everything team-scoped
│     │  └─ team/
│     │     └─ setting/
│     │        ├─ general/page.tsx
│     │        ├─ members/page.tsx
│     │        └─ billing/page.tsx
│     └─ issues/...
├─ config/
│  ├─ tiers.ts          # << single source plan config
│  ├─ roles.ts          # TEAM_ROLES, PROJECT_ROLES, PERMISSIONS
│  ├─ workflows.ts      # ISSUE_WORKFLOW 
│  └─ nav.ts            # for sidebar
├─ server/
│  ├─ auth/
│  │  ├─ session.ts
│  │  └─ rbac.ts        # checks permission using config/roles.ts
│  ├─ entitlements/
│  │  ├─ index.ts       # read plan from DB, merge with config/tiers.ts
│  │  └─ repo.ts        # read team overrides
│  ├─ teams/            # create team, add member, invite
│  ├─ billing/          # stripe/supa
│  └─ projects/         # public/private check
├─ features/
│  ├─ teams/            # UI for members/billing
│  ├─ projects/         # UI for project list, public/private toggle
│  └─ issues/           # UI for issue list/detail, status buttons
└─ lib/
   └─ cn.ts
```

**Key idea:** all configurable stuff is in `/src/config/*`. Both server and client can read it. The server enforces.

---

## 5. Enforcing plan limits

When someone tries to:
- create team member → check plan.limits.members
- create project → check plan.limits.projects
- create issue → check plan.limits.issues
- upload file → check plan.limits.storageMB

Usage tracking counts every project/member row as "active" (even archived or soft-deleted) until it is permanently deleted, so billing and limits cannot be bypassed via soft deletes.

Do it in `server/entitlements`:

```typescript
// src/server/entitlements/index.ts
import { PLANS } from "@/src/config/tiers"
import { getTeamPlan } from "./repo"
import { getUsageForTeam } from "./usage" // count members/projects/issues

export async function ensureCanCreateProject(teamId: string) {
  const planId = await getTeamPlan(teamId) // returns "free" | "pro" (canonical IDs)
  const plan = PLANS[planId]
  const usage = await getUsageForTeam(teamId)
  if (plan.limits.projects !== "unlimited" && usage.projects >= plan.limits.projects) {
    throw new Error("LIMIT_PROJECTS_REACHED")
  }
}
```

Then call it in route:

```typescript
// app/api/projects/create/route.ts
import { ensureCanCreateProject } from "@/src/server/entitlements"
export async function POST(req: Request) {
  const { teamId, name, visibility } = await req.json()
  await ensureCanCreateProject(teamId)
  // create...
}
```


---

## 6. Naming tips (to keep everyone sane)

- Always prefix with scope:
  - **TEAM_…** for team-level
  - **PROJECT_…** for project-level
- For features: `team:manage_members`, `project:issue:create`
- For DB tables:
  - `team`
  - `team_members`
  - `team_subscriptions`
  - `projects`
  - `project_members`
  - `issues`
- For API route names: `/api/team/members`, `/api/team/billing`, `/api/projects`, `/api/issues`

That keeps your Figma / code / DB aligned.

---

## 7. Monetization notes 

**Free → Pro upsell triggers:**
- When team reaches 1 project and tries to create 2nd → "Need Pro"
- When issue count approaches 25/25 → progress bar + CTA
- When storage approaches 100MB → CTA

**Billable seat = TEAM_EDITOR:** On Pro, only count users with `TEAM_EDITOR` operational role. Management roles (OWNER/ADMIN) are not billable by themselves.

**Dev is free:** `PROJECT_DEVELOPER` and `TEAM_MEMBER` are unlimited → happy devs, more adoption.

**Owner can be free:** A `TEAM_OWNER` with `TEAM_VIEWER` operational role pays $0 → allows pure team managers who don't create content.

---

## Final recap

- **Single source config** lives in: `src/config/tiers.ts` (plans), `src/config/roles.ts` (roles/perms), `src/config/workflows.ts` (statuses)
- **Scaffold:** feature-first (`features/teams`, `features/billing`, `features/issues`) + server glue (`server/entitlements`, `server/billing`, `server/auth`)
- **Roles:** TEAM_OWNER|TEAM_ADMIN|TEAM_MEMBER|TEAM_VIEWER and PROJECT_OWNER|PROJECT_EDITOR|PROJECT_DEVELOPER|PROJECT_VIEWER
- **Monetization:** Pro = per-editor billing, devs free, plan limits enforced on server
