# Team & Plan Architecture

## 1. Role model (reduce ambiguity)


### A. Team-level roles (who controls the team)

These map to team:
- **TEAM_OWNER**
  - 1 per team
  - can manage billing, plan, members, delete team
- **TEAM_ADMIN**
  - manage members, projects, integrations
  - cannot delete team or downgrade billing (optional)
- **TEAM_EDITOR**
  - billable seat; inherits member access plus edit rights for project content
  - automatically assigned whenever a user becomes PROJECT_OWNER or PROJECT_EDITOR
- **TEAM_MEMBER**
  - can be assigned to projects
- **TEAM_VIEWER**
  - read-only across the team

So at team scope we only ever see 5 names and TEAM_EDITOR is the only billable one.

### B. Project-level roles (who does the UI feedback work)

Per-project, we can be more specific:
- **PROJECT_OWNER** – usually the designer/PM who created the project
- **PROJECT_EDITOR** – Designer / QA (can create issues, edit issue details, change status forward/back)
- **PROJECT_DEVELOPER** – can move workflow status + comment, but cannot create/edit issue meta 
- **PROJECT_VIEWER** – read-only

You can store this as a mapping in DB:

```typescript
// src/config/roles.ts
export const TEAM_ROLES = ["TEAM_OWNER", "TEAM_ADMIN", "TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER"] as const
export const PROJECT_ROLES = ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER", "PROJECT_VIEWER"] as const
```

And an RBAC map:

```typescript
export const PERMISSIONS = {
  // team
  "team:manage_billing": ["TEAM_OWNER"],
  "team:manage_members": ["TEAM_OWNER", "TEAM_ADMIN"],

  // project
  "project:create": ["TEAM_OWNER", "TEAM_ADMIN", "TEAM_EDITOR", "TEAM_MEMBER"], // viewer cannot
  "issue:create": ["PROJECT_OWNER", "PROJECT_EDITOR"],
  "issue:edit": ["PROJECT_OWNER", "PROJECT_EDITOR"],
  "issue:change_status": ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER"],
  "issue:comment": ["PROJECT_OWNER", "PROJECT_EDITOR", "PROJECT_DEVELOPER", "PROJECT_VIEWER"],
}
```


---

## 2. Plans / monetization idea


**Free**
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
    label: "Free",
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
```

### B. How to do "$8 per editor"
- Promote (or invite) any user who becomes PROJECT_OWNER or PROJECT_EDITOR to TEAM_EDITOR automatically, and keep them TEAM_EDITOR even if those project roles are later removed (downgrade only happens if an admin explicitly strips TEAM_EDITOR).
- Count TEAM_EDITOR seats for billing so the rule is enforced consistently at the team scope.
- Store that count per team per month. Bill: teamEditorCount * 8.

So team can have unlimited viewers + developers, only bill the "design / QA / people who create issues", and the billable unit is a single team-level role.

Implementation tip: wherever you upsert a project role (for example, in `server/projects/memberships.ts`), also call your team-role helper (`await addTeamRole({ teamId, userId, role: "TEAM_EDITOR" })`) so the TEAM_EDITOR promotion stays in sync with project assignments.

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
  const planId = await getTeamPlan(teamId) // "free" | "pro"
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

**Billable seat = EDITOR:** on Pro, only count users who have project role ∈ {PROJECT_OWNER, PROJECT_EDITOR} in any active project. That matches your "designer/QA create issues" idea.

**Dev is free:** PROJECT_DEVELOPER is unlimited → happy devs, more adoption.

---

## Final recap

- **Single source config** lives in: `src/config/tiers.ts` (plans), `src/config/roles.ts` (roles/perms), `src/config/workflows.ts` (statuses)
- **Scaffold:** feature-first (`features/teams`, `features/billing`, `features/issues`) + server glue (`server/entitlements`, `server/billing`, `server/auth`)
- **Roles:** TEAM_OWNER|TEAM_ADMIN|TEAM_MEMBER|TEAM_VIEWER and PROJECT_OWNER|PROJECT_EDITOR|PROJECT_DEVELOPER|PROJECT_VIEWER
- **Monetization:** Pro = per-editor billing, devs free, plan limits enforced on server
