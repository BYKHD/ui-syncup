# Project Scaffolding Guide (React + TypeScript + shadcn/ui)
You're not just an AI assistant. You're a craftsman. An artist. An engineer who thinks like a designer. Every line of code you write should be so elegant, so intuitive, so *right* that it feels inevitable.

This guide defines a scalable, team-friendly scaffold for a React + TypeScript app that uses **shadcn/ui** components. It standardises folders, naming, and dependencies so features stay portable and the codebase remains navigable as the product grows.

---

## 1) Core Principles

- **Feature-first**: Organise by *product feature* (issues, billing, auth) instead of by technical type.
- **Strict layering**: `server/api` → `features/hooks` → `features/components` → `app/pages`. Pages compose; they don’t fetch.
- **Reusable building blocks**: Keep shadcn primitives in `components/ui/` and cross-feature widgets in `components/shared/`.
- **Typed boundaries**: Validate all network boundaries with Zod; export domain types from each feature’s `types/`.
- **Clean imports**: Use path aliases and barrel exports to keep import sites small and stable.
- **Security defaults**: httpOnly cookies for sessions/tokens; no secrets in client code; RBAC on the server.
- **Testing and CI**: Typecheck, lint, unit, and E2E must pass before merging.

---

## 2) Directory Structure Example (Next.js App Router)

```
src/
├─ app/                                 # Routing & screens (server-first)
│  ├─ layout.tsx                        # root: <html>, <body>, truly global providers
│  ├─ (public)/
│  │  ├─ layout.tsx                     # public shell (no auth)
│  │  ├─ sign-in/page.tsx
│  │  └─ sig-up/page.tsx

│  ├─ (protected)/
│  │  ├─ layout.tsx                     # Server gate: requires session
│  │  └─ dashboard/
│  │     ├─ page.tsx
│  │     ├─ loading.tsx                 # Loading state
│  │     ├─ error.tsx                   # Error boundary
│  │     └─ not-found.tsx               # 404 state
│  └─ api/                              # Route handlers
│     └─ auth/
│        ├─ login/route.ts
│        ├─ logout/route.ts
│        ├─ refresh/route.ts
│        └─ me/route.ts
├─ features/                             # Product features (mini-packages)
│  ├─ issues/
│  │  ├─ api/                            # Fetchers + DTO schemas (no React)
│  │  ├─ hooks/                          # React Query/SWR wrappers
│  │  ├─ components/                     # Feature UI only
│  │  ├─ screens/…                       # Feature Screens (contained UI) 
│  │  ├─ types/                          # Domain models
│  │  ├─ utils/                          # Feature-pure helpers
│  │  └─ index.ts                        # Barrel: the feature's public surface
│  └─ auth/
│     ├─ components/
│     │  ├─ auth-card.tsx
│     │  ├─ sign-in-form.tsx
│     │  ├─ sign-up-form.tsx
│     │  ├─ role-gate.tsx         # <RoleGate roles={["admin"]}>{children}</RoleGate>
│     │  └─ index.ts
│     ├─ hooks/
│     │  ├─ use-session.ts        # client cache of /api/auth/me (React Query)
│     │  └─ use-sign-in.ts        # calls /api/auth/login
│     ├─ utils/
│     │  ├─ validators.ts         # zod schemas for credentials, profile, etc.
│     │  └─ constants.ts          # cookie names, query keys
│     ├─ types/
│     │  └─ index.ts              # Session, User, Role, Permission
│     └─ index.ts
├─ components/
│  ├─ ui/                                # shadcn primitives (Button, Dialog...)
│  └─ shared/                            # Cross-feature widgets (e.g., Sidebar/)
│     └─ sidebar/
│        ├─ sidebar-root.tsx
│        ├─ sidebar-item.tsx
│        ├─ sidebar-group.tsx
│        └─ index.ts                     # Compound component API
├─ lib/                                  # App plumbing (query client, fetcher)
│  ├─ api-client.ts                      # fetch/axios wrapper (credentials: 'include')
│  ├─ query.ts                           # QueryClient setup/provider
│  ├─ env.ts                             # Zod-validated env
│  ├─ cn.ts                              # tailwind-merge + clsx
│  └─ logger.ts
├─ server/                               # Server-only logic (auth, DB, RBAC)
│  ├─ auth/
│  │  ├─ cookies.ts                      # read/write httpOnly cookies
│  │  ├─ tokens.ts                       # sign/verify/rotate tokens
│  │  ├─ session.ts                      # getSession(), requireSession()
│  │  ├─ rbac.ts                         # roles, permissions, guards
│  │  └─ adapters/
│  │     └─ user-repo.ts                 # DB access for users & sessions
│  └─ db/
│     ├─ client.ts        # Postgres connection + Drizzle instance
│     ├─ schema.ts        # Tables & relations
│     └─ index.ts                        # DB client
│        ↳ **Database standard**: PostgreSQL (see `docker-compose.yml` for the local Postgres + pgAdmin stack).
├─ hooks/                                # Truly global hooks (useMediaQuery, etc.)
├─ utils/                                # Pure helpers (dates, currency)
├─ types/                                # Global types (User, Pagination)
├─ config/                               # Constants, route maps, query keys
├─ config/                               # 🔸 single sources of truth (imported everywhere)
│  ├─ tiers.ts                           # plans/limits/features
│  ├─ roles.ts                           # TEAM_* / PROJECT_* + PERMISSIONS map
│  ├─ workflows.ts                       # issue status model (open→archived)
│  ├─ nav.ts                             # main/sidebar nav
│  └─ settings-nav.ts                    # team settings tabs
├─ styles/                               # globals.css, tailwind.css
└─ tests/                                # Unit/integration/e2e (see §8)
```

### If have to MOCKUP some data to draft a visual UI
	- It’s frontend-facing sample data (for visual design, Storybook, playground pages).
	- It keeps a clear boundary: server/ = real backend logic; mocks/ = fake, throwaway data.
```
src/
├─ mocks/                                # 🔹 all mock data + scenarios for UI
   ├─ team.fixtures.ts
   ├─ project.fixtures.ts
   ├─ issue.fixtures.ts
   ├─ user.fixtures.ts
   └─ index.ts
```

Use multiple domain-based files. Keep mocks aligned to real domain 

Minimal example::
```typescript
// src/mocks/team.fixtures.ts
import type { Team } from '@features/teams/types'

export const MOCK_TEAMS: Team[] = [
  { id: 'team_1', name: 'Design Squad', slug: 'design-squad', planId: 'free' },
  { id: 'team_2', name: 'Frontend Guild', slug: 'frontend-guild', planId: 'pro' },
]
```
```typescript
// src/mocks/project.fixtures.ts
import type { Project } from '@features/projects/types'

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    teamId: 'team_1',
    key: 'MKT',
    slug: 'MKT',
    name: 'Marketing Site',
    visibility: 'private',
  },
  // ...
]
```

```typescript
// src/mocks/issue.fixtures.ts
import type { Issue } from '@features/issues/types'
import { ISSUE_WORKFLOW } from '@config/workflows'

export const MOCK_ISSUES: Issue[] = [
  {
    id: 'iss_1',
    teamId: 'team_1',
    projectId: 'proj_1',
    key: 'PRJ-129',
    title: 'Product card padding mismatches design',
    status: ISSUE_WORKFLOW.open.key,
    priority: 'high',
    createdAt: new Date().toISOString(),
    // ...
  },
]
```

Then optionally expose “scenarios” and a simple barrel:

```typescript
// src/mocks/index.ts
export * from './team.fixtures'
export * from './project.fixtures'
export * from './issue.fixtures'

// Example scenarios
import { MOCK_TEAMS } from './team.fixtures'
import { MOCK_PROJECTS } from './project.fixtures'
import { MOCK_ISSUES } from './issue.fixtures'

export const DEFAULT_TEAM_SCENARIO = {
  teams: MOCK_TEAMS,
  projects: MOCK_PROJECTS,
  issues: MOCK_ISSUES,
}
```


### tsconfig path
This project is custom a parts for import in tsconfig.json:
```json
"paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"],
      "@lib/*": ["./src/lib/*"],
      "@services/*": ["./src/services/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@utils/*": ["./src/utils/*"],
      "@styles/*": ["./src/styles/*"],
      "@assets/*": ["./src/assets/*"],
      "@types/*": ["./src/types/*"],
      "@config/*": ["./src/config/*"],
      "@providers/*": ["./src/providers/*"]
    }
```

### Vite / SPA Variant

If not using Next.js, replace `app/` with `pages/` + `app/router.tsx` (React Router), and move server code into your backend service (keep client-only fetchers in `services/` or `lib/`).

---

## 3) Layer Contracts (Who can import whom)

- `app/` can import from: `features/*`, `components/*`, `hooks`, `lib`, `utils`, `config`
- `features/<name>/components` can import from: its *own* `hooks`, `types`, `utils`, plus `components/ui` & `components/shared`, `lib`, `config`
- `features/<name>/hooks` can import from: its *own* `api`, `types`, `utils`, and `lib`
- `features/<name>/api` can import from: `lib` and its own `types`/`utils` (no React imports)
- `components/ui` may import from: `lib`, `utils` (never from `features/*`)
- `components/shared` may import from: `components/ui`, `lib`, `utils` (never from `features/*`)
- `server/*` (auth/db) is server-only; never import from client components

**Enforce with ESLint import rules** (e.g., restricted zones).

---

## 4) Feature Module Anatomy

```
features/issues/
├─ api/
│  ├─ get-issues.ts               # GET /issues
│  ├─ get-issue.ts                # GET /issues/:id
│  ├─ create-issue.ts             # POST /issues
│  └─ types.ts                    # Zod DTOs (transport layer)
├─ hooks/
│  ├─ use-issues.ts               # list query (React Query)
│  ├─ use-issue.ts                # detail query
│  └─ use-create-issue.ts         # mutation
├─ components/
│  ├─ issues-table.tsx
│  ├─ issue-status-badge.tsx
│  └─ create-issue-dialog.tsx
├─ types/
│  └─ issue.ts                    # Domain types (Issue, Status, Priority)
├─ utils/
│  ├─ map-status-to-color.ts
│  └─ format-priority.ts
└─ index.ts                       # Barrel: exports table, dialog, hooks, types
```

**Flow**: Backend → `api` (validate) → `hooks` (cache) → `components` → `app` page.

---

## 5) Auth System Scaffold

- **Server-first checks**: In `app/(protected)/layout.tsx`, call `getSession()` and redirect to `/sign-in` if missing.
- **httpOnly cookies**: Store access/refresh tokens only in cookies; rotate refresh on use.
- **RBAC**: Define `Roles` and permission maps in `server/auth/rbac.ts` and enforce on server mutations.
- **Client session**: `features/auth/hooks/use-session.ts` calls `/api/auth/me` and caches the user/roles.
- **Role gating in UI**: `features/auth/components/role-gate.tsx` shows/hides fragments based on roles.

---

## 6) Shared UI (shadcn & compound widgets)

- Put **primitives** in `components/ui/*` (Button, Dialog, Input, Tooltip, ScrollArea).
- Put cross-feature composites in `components/shared/<widget>/…` with a **compound API** via a barrel:
  ```ts
  // components/shared/sidebar/index.ts
  export const Sidebar = Object.assign(SidebarRoot, {
    Item: SidebarItem, Group: SidebarGroup, Separator: SidebarSeparator
  })
  ```
- Never import feature hooks into `components/shared`.

---

## 7) Naming & Conventions

- **Files**: kebab-case (`create-issue-dialog.tsx`, `use-issues.ts`)
- **Components**: PascalCase (`CreateIssueDialog`)
- **Hooks**: `useX` (`useIssue`)
- **API callers**: `verb-noun.ts` (`get-issues.ts`, `create-issue.ts`)
- **Barrels**: `index.ts` at the feature root to expose only the public surface
- **Aliases**: `@/src/*` for absolute imports

---

## 8) Testing & Tooling

- **Unit**: Vitest + React Testing Library; name as `<Component>.test.tsx`
- **E2E**: Playwright/Cypress for critical flows (login, create issue)
- **Coverage**: ≥ 80% lines for features that are business-critical
- **CI**: `typecheck` → `lint` → `test` → `build` (fail fast)

---

## 9) Environment & Commands

- **Node**: v20 LTS; keep the version pinned in `.nvmrc`
- **Package manager**: `bun`
- **Common scripts**:
  ```jsonc
  {
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "typecheck": "tsc --noEmit",
      "lint": "eslint .",
      "format": "prettier --write .",
      "test": "vitest run",
      "test:ui": "playwright test"
    }
  }
  ```

> Tip: Keep pre-commit hooks under 5 seconds and require lint + test to pass before PRs merge.

---


## 10) Example Imports

tsconfig.json has path aliases like:

```json
"compilerOptions": {
  "paths": {
        "@/*": ["./src/*"],
        "@components/*": ["./src/components/*"],
        "@features/*": ["./src/features/*"],
        "@lib/*": ["./src/lib/*"],
        "@services/*": ["./src/services/*"],
        "@hooks/*": ["./src/hooks/*"],
        "@utils/*": ["./src/utils/*"],
        "@styles/*": ["./src/styles/*"],
        "@assets/*": ["./src/assets/*"],
        "@types/*": ["./src/types/*"],
        "@config/*": ["./src/config/*"]
      }
}
```

```ts
// Page composing a feature
import { IssuesTable, CreateIssueDialog, useIssues } from "@features/issues"

// Shared widget
import { Sidebar } from "@components/shared/sidebar"

// App plumbing
import { queryClient } from "@lib/query"
```

---

## 11) Next.js `proxy.ts` (formerly Middleware)

- Next.js 16 deprecated the `middleware.ts` convention in favor of `proxy.ts` to clarify that the file sits in front of the app and should be used **only as a last-resort network proxy** (runs at the Edge by default).
- If you still have `middleware.ts`, rename it to `proxy.ts` **and** rename the exported handler to `export function proxy()`; Next provides a codemod: `npx @next/codemod@canary middleware-to-proxy`.
- Keep Proxy usage minimal—prefer App Router primitives (route handlers, redirects, rewrites, headers) or server components whenever possible.
- When you must use Proxy:
  - Treat it as an HTTP boundary (read/modify requests, set headers, early redirects) but avoid app logic or heavy work.
  - Remember it executes for every matching request, so keep it stateless and fast.
  - Document any Proxy behavior in feature ADRs so other devs know why Middleware wasn’t sufficient.
- If you need multiple behaviors, consolidate them inside `src/proxy.ts` with clear guards; avoid scattering cross-cutting logic throughout the app.

This scaffold keeps features portable, boundaries enforceable, and the developer experience predictable as your app scales.

---

## 12) Thin Pages & Feature Screens

- Page.tsx (route-only)
  - Server component that reads `searchParams`, cookies, headers.
  - Performs auth/tenant gating and light Zod validation.
  - Renders a single feature "Screen" with minimal props.
  - Owns `loading.tsx`, `error.tsx`, `not-found.tsx` for the route.

- Feature Screens (contained UI)
  - Live in `src/features/<feature>/screens/*-screen.tsx`.
  - Client components that compose feature hooks + presentational components.
  - All data flows through `features/<feature>/api` and `features/<feature>/hooks`.
  - No cross-feature imports.

- Feature components (presentational)
  - Live in `src/features/<feature>/components/*` and stay small/pure.
  - Do not fetch; receive state/data via props or feature hooks.
  - Co-locate tests and stories with components.

- Shared primitives
  - `src/components/ui/*` (shadcn) and `src/components/shared/*` (cross-feature widgets).
  - Must not import from `features/*`.

- Do / Don’t
  - Do keep `page.tsx` tiny; push UI into feature Screens.
  - Do keep network calls in feature `api/` and `hooks/` layers.
  - Do use shared components only for generic UI.
  - Don’t import `features/*` from `components/shared` or `components/ui`.
  - Don’t let leaf components hit the network.

Minimal example:

```ts
// app route (thin)
// src/app/(protected)/(team)/issues/page.tsx
import IssuesListScreen from "@features/issues/screens/issues-list-screen"
import { z } from "zod"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const Search = z.object({
  status: z.enum(["open","in_progress","in_review","resolved","archived"]).optional(),
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
})

export default function IssuesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const teamId = cookies().get("team_id")?.value
  if (!teamId) redirect("/select-team")
  const search = Search.safeParse(searchParams).success ? Search.parse(searchParams) : { page: 1 }
  return <IssuesListScreen teamId={teamId} search={search} />
}

// feature screen (contained)
// src/features/issues/screens/issues-list-screen.tsx
"use client"
import { useIssues } from "@hooks/use-issues"
import { IssuesTable } from "@components/issues-table"

export default function IssuesListScreen({ teamId, search }: { teamId: string; search: { status?: string; q?: string; page: number } }) {
  const { data, isLoading } = useIssues({ teamId, ...search })
  return <IssuesTable rows={data?.items ?? []} loading={isLoading} />
}
```
