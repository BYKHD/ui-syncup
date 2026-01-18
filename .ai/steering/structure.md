# Project Structure

## Overview

Feature-first architecture following the scaffolding guidelines in `AGENTS.md`. Code is organized by product feature rather than technical type, with strict layering and clear boundaries.

## Directory Layout

```
src/
├── app/                          # Next.js App Router (routing only)
│   ├── layout.tsx                # Root layout (html, body, global providers)
│   ├── (public)/                 # Public routes (no auth required)
│   │   ├── layout.tsx            # Public shell
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (protected)/              # Protected routes (auth required)
│   │   ├── layout.tsx            # Auth gate (server-side session check)
│   │   ├── onboarding/page.tsx   # Post-auth team setup (no team required)
│   │   ├── settings/             # User settings
│   │   └── (team)/               # Team-scoped routes
│   │       ├── projects/page.tsx
│   │       └── team/settings/    # Team settings
│   └── api/                      # API route handlers
│       └── auth/                 # Auth endpoints
│
├── features/                     # Feature modules (mini-packages)
│   ├── <feature>/
│   │   ├── api/                  # Fetchers + DTO schemas (no React)
│   │   ├── hooks/                # React Query/SWR wrappers
│   │   ├── components/           # Feature-specific UI
│   │   ├── screens/              # Screen components (thin, compose hooks)
│   │   ├── types/                # Domain models
│   │   ├── utils/                # Feature-specific helpers
│   │   └── index.ts              # Barrel export (public API)
│   │
│   ├── annotations/              # Visual annotation system
│   ├── auth/                     # Authentication & onboarding
│   ├── issues/                   # Issue tracking & details
│   ├── projects/                 # Project management
│   ├── teams/                    # Team creation
│   ├── team-settings/            # Team settings screens
│   └── user-settings/            # User preferences & settings
│
├── components/
│   ├── ui/                       # shadcn primitives (Button, Dialog, etc.)
│   └── shared/                   # Cross-feature widgets
│       ├── headers/              # AppHeader, breadcrumbs
│       ├── sidebar/              # AppSidebar, navigation
│       ├── notifications/        # Notification system
│       └── settings-sidebar/     # Settings navigation
│
├── config/                       # Single sources of truth (pure data)
│   ├── quotas.ts                 # Resource limits (Instance Config)
│   ├── roles.ts                  # RBAC roles & permissions
│   ├── workflow.ts               # Issue workflow states
│   ├── settings-nav.ts           # Settings navigation
│   ├── team-settings-nav.ts      # Team settings navigation
│   └── issue-options.ts          # Issue metadata options
│
├── lib/                          # App-wide utilities
│   ├── api-client.ts             # Fetch wrapper (credentials: 'include')
│   ├── query.tsx                 # React Query setup
│   ├── utils.ts                  # cn() helper (clsx + tailwind-merge)
│   ├── env.ts                    # Environment variables
│   ├── logger.ts                 # Logging utility
│   └── performance.ts            # Performance monitoring
│
├── server/                       # Server-only logic (auth, DB, RBAC)
│   ├── auth/                     # Session, tokens, RBAC
│   │   ├── cookies.ts            # httpOnly cookie management
│   │   ├── password.ts           # Argon2 password hashing
│   │   ├── rate-limiter.ts       # Redis-based rate limiting
│   │   ├── rbac.ts               # Role-based access control
│   │   ├── session.ts            # Session management
│   │   └── tokens.ts             # JWT token handling
│   ├── db/                       # Database client & schema
│   │   ├── schema/               # Drizzle schema definitions
│   │   └── index.ts              # Database client
│   ├── email/                    # Email service
│   │   ├── client.ts             # Resend client
│   │   ├── queue.ts              # Email queue management
│   │   ├── templates/            # React Email templates
│   │   └── worker.ts             # Background email processor
│   └── teams/                    # Team management services
│       ├── team-service.ts       # Core team operations
│       ├── member-service.ts     # Member management
│       ├── invitation-service.ts # Invitation handling
│       ├── member-counts.ts      # Member counting logic
│       └── resource-limits.ts    # Resource usage limits
│
├── mocks/                        # Mock data & fixtures
│   ├── issue.fixtures.ts
│   ├── project.fixtures.ts
│   ├── team.fixtures.ts
│   ├── user.fixtures.ts
│   ├── annotation.fixtures.ts
│   └── index.ts
│
├── hooks/                        # Global hooks
│   ├── use-mobile.ts
│   ├── use-team.ts
│   └── use-long-press.ts
│
├── providers/                    # React context providers
│   └── theme-provider.tsx
│
├── styles/
│   └── globals.css               # Global styles & Tailwind imports
│
└── types/                        # Global TypeScript types

docs/                             # Architecture documentation
tests/                            # Test files
drizzle/                          # Database migrations
supabase/                         # Supabase configuration and seed data
public/                           # Static assets
```

## Proxy (formerly middleware)

- Next.js 16 uses `src/proxy.ts` instead of `middleware.ts`. Keep the exported handler named `proxy` and avoid multiple files—the Next codemod (`npx @next/codemod@canary middleware-to-proxy`) can help if a legacy `middleware.ts` still exists.
- Treat the proxy as a last-resort HTTP boundary: read/modify requests, set headers, or do quick auth redirects, but don’t put feature logic there. Prefer App Router route handlers, rewrites, or server components for most behaviors.
- Keep the proxy stateless and fast; because it runs for every matching request, avoid heavy computations and consolidate cross-cutting checks (auth guard, header tweaks) behind clear guards in `src/proxy.ts`.
- Document any non-trivial proxy guard (why it exists, what routes it affects) in your feature’s ADR or docs so future maintainers understand why middleware couldn’t suffice.

## Layer Contracts (Import Rules)

- **app/** can import: `features/*`, `components/*`, `hooks`, `lib`, `config`
- **features/\<name\>/components** can import: own `hooks`, `types`, `utils` + `components/ui`, `components/shared`, `lib`, `config`
- **features/\<name\>/hooks** can import: own `api`, `types`, `utils` + `lib`
- **features/\<name\>/api** can import: `lib`, own `types`/`utils` (no React)
- **components/ui** can import: `lib`, `utils` (never `features/*`)
- **components/shared** can import: `components/ui`, `lib`, `utils` (never `features/*`)
- **server/** is server-only; never import from client components

## Feature Module Anatomy

Each feature follows this structure:

```
features/<feature>/
├── api/                          # Network layer
│   ├── get-<resource>.ts         # GET operations
│   ├── create-<resource>.ts      # POST operations
│   ├── update-<resource>.ts      # PUT/PATCH operations
│   ├── delete-<resource>.ts      # DELETE operations
│   ├── types.ts                  # DTO schemas (Zod)
│   └── index.ts                  # Barrel export
├── hooks/                        # React hooks
│   ├── use-<resource>.ts         # Query hook
│   ├── use-<resources>.ts        # List query hook
│   ├── use-create-<resource>.ts  # Mutation hook
│   └── index.ts                  # Barrel export
├── components/                   # Presentational components
│   ├── <feature>-list.tsx
│   ├── <feature>-detail.tsx
│   ├── <feature>-form.tsx
│   └── index.ts                  # Barrel export
├── screens/                      # Screen components (thin)
│   ├── <feature>-screen.tsx      # Main screen
│   └── index.ts                  # Barrel export
├── types/                        # Domain types
│   └── index.ts
├── utils/                        # Feature utilities
│   └── index.ts
└── index.ts                      # Public API (barrel)
```

## RBAC & Plans

- `config/roles.ts` declares the canonical roles referenced in `.ai/steering/product.md` (e.g., `PROJECT_EDITOR`, `TEAM_ADMIN`). Keep that file in sync with the product doc whenever plan limits or role names change.
- `server/auth/rbac.ts` enforces those roles on the backend and should reference the same role/permission enums used by `features/auth/hooks/use-session.ts` and the guarding middleware(proxy) in `app/(protected)/layout.tsx`.
- When a product role gains or loses permissions for a feature, update the adjacent `features/<feature>/components` screens (and tests) so the UI matches what the RBAC guard allows.
- Configuration changes should centralize in `config/` so logic, UI copy, and enforcement all read from the same source of truth.

## Naming Conventions

- **Files**: kebab-case (`create-issue-dialog.tsx`, `use-issues.ts`)
- **Components**: PascalCase (`CreateIssueDialog`)
- **Hooks**: camelCase with `use` prefix (`useIssue`, `useIssues`)
- **API functions**: verb-noun (`getIssues`, `createIssue`, `updateIssue`)
- **Types**: PascalCase (`Issue`, `IssueStatus`, `IssuePermissions`)
- **Constants**: UPPER_SNAKE_CASE (`ISSUE_WORKFLOW`, `PLANS`)

## Page Structure (Thin Pages Pattern)

Pages are thin route handlers that:
1. Read `searchParams`, cookies, headers (server component)
2. Perform auth/tenant gating
3. Light Zod validation
4. Render a single feature Screen with minimal props
5. Own `loading.tsx`, `error.tsx`, `not-found.tsx`

Example:
```tsx
// app/(protected)/issues/page.tsx
import { IssuesListScreen } from '@/features/issues'

export default function IssuesPage({ searchParams }) {
  const teamId = cookies().get('team_id')?.value
  if (!teamId) redirect('/select-team')
  return <IssuesListScreen teamId={teamId} search={searchParams} />
}
```

## Barrel Exports

Each feature exposes its public API via `index.ts`:
```ts
// features/issues/index.ts
export { IssueDetailsScreen } from './screens'
export { IssuesList, IssuesCreateDialog } from './components'
export { useIssues, useIssue, useCreateIssue } from './hooks'
export type { Issue, IssueStatus, IssuePermissions } from './types'
```

## Mock Data Strategy

- All mock data lives in `src/mocks/*`
- Domain-based files (`team.fixtures.ts`, `issue.fixtures.ts`)
- Used for visual UI development before backend implementation
- Easy to swap with real API calls later

## Mock Data Maintenance

- Tie each fixture set to the feature that consumes it (e.g., `features/issues` imports from `src/mocks/issue.fixtures`) so you instinctively revise the fixture whenever the feature’s Zod DTOs or API responses change.
- When a DTO schema in `features/<feature>/api/types.ts` is updated, add a checklist item to refresh the matching fixture file and scenario exports to keep UI mockups accurate.
- Consider a lightweight lint/story checkpoint (e.g., a `vitest` smoke test or Storybook story that renders the fixtures) so stale mock data is caught before it drifts from real API surfaces.

## Testing Structure

- Unit/integration tests: Co-located with source files in `__tests__/` folders or as `*.test.ts(x)` files
- E2E tests: `tests/e2e/*.spec.ts`
- Test fixtures: `tests/e2e/helpers/test-fixtures.ts`
- Property-based tests: Use `*.property.test.ts` naming convention
- Mock data: `src/mocks/*.fixtures.ts`

Example test locations:
```
src/
├── lib/
│   ├── __tests__/
│   │   ├── auth-config.test.ts
│   │   └── logger.property.test.ts
│   └── auth-config.ts
├── server/
│   └── teams/
│       ├── __tests__/
│       │   ├── team-service.test.ts
│       │   └── team-context.property.test.ts
│       └── team-service.ts
└── features/
    └── issues/
        └── components/
            ├── issue-list.tsx
            └── issue-list.test.tsx
```

## Documentation

- Feature-level docs in `features/<feature>/docs/`
- Architecture docs in `docs/`
- See `AGENTS.md` for complete scaffolding guidelines
