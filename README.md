# UI-Syncup

[![Deploy](https://github.com/BYKHD/ui-syncup/actions/workflows/deploy.yml/badge.svg)](https://github.com/BYKHD/ui-syncup/actions/workflows/deploy.yml)
[![CI Quality Checks](https://github.com/BYKHD/ui-syncup/actions/workflows/ci.yml/badge.svg)](https://github.com/BYKHD/ui-syncup/actions/workflows/ci.yml)

A visual feedback and issue tracking platform for design-to-development collaboration. UI-Syncup enables designers, QA engineers, and developers to annotate UI mockups, create issues from visual feedback, and track them through a structured workflow from creation to resolution.

## Features

- **Visual Annotations**: Pin-based and box annotations on images/mockups with threaded comments
- **Issue Management**: Create, track, and resolve UI/UX issues with workflow states (Open → In Progress → In Review → Resolved → Archived)
- **Team & Project Organization**: Multi-team workspace with project-based access control
- **Two-Tier Role System**: Management roles (OWNER, ADMIN) for team settings + Operational roles (EDITOR, MEMBER, VIEWER) for content access
- **Plan-Based Limits**: Free tier (10 users, 1 project, 50 issues) and Pro tier (unlimited users, 50 projects, unlimited issues)

## Tech Stack

- **Framework & Runtime**: Next.js 16 (App Router), React 19.2, TypeScript 5, Node 20 LTS, Bun
- **UI & Styling**: shadcn/ui, Radix UI, Tailwind CSS 4, Framer Motion, Lucide React, next-themes
- **Data & State**: TanStack Query 5, Zod, React Hook Form
- **Database**: PostgreSQL 15 (Supabase), Drizzle ORM, Supabase CLI
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth & Security**: better-auth, @node-rs/argon2, ioredis (rate limiting)
- **Email**: Resend, React Email
- **Testing**: Vitest, Playwright, fast-check (property-based), PGlite 

## Getting Started

### Prerequisites

- Node 20 LTS (see [.nvmrc](.nvmrc))
- Bun package manager
- Supabase CLI for local development

### Installation

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment variables: `cp .env.example .env.local`
4. Validate environment config: `bun run validate-env`
5. Start local Supabase: `bun run supabase:start`
6. Run database migrations: `bun run db:migrate`
7. Seed database (optional): `bun run db:seed`
8. Start development server: `bun dev`
9. Open [http://localhost:3000](http://localhost:3000) in your browser

### Development Commands

```bash
# Development
bun dev                 # Start dev server (http://localhost:3000)
bun build              # Production build
bun start              # Start production server

# Code Quality
bun typecheck          # Run TypeScript compiler checks
bun lint               # Run ESLint
bun format             # Format code with Prettier

# Testing (⚠️ Use 'bun run test', NOT 'bun test')
bun run test           # Run unit tests (Vitest) - SAFE
bun run test:watch     # Run tests in watch mode
bun run test:ui        # Run E2E tests (Playwright)

# Database
bun run db:generate    # Generate Drizzle migrations
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
bun run db:seed        # Seed database with test data

# Supabase (Local Development)
bun run supabase:start # Start local Supabase stack
bun run supabase:stop  # Stop local Supabase
bun run supabase:status # Check status and connection details

# Validation
bun run validate-env   # Validate environment variables
```

## Project Structure

### Architecture Principles

- **Feature-first organization**: Code is organized by product feature (not by technical type)
- **Strict layering**: server/api → features/hooks → features/components → app/pages
- **Thin pages pattern**: Pages are route handlers, screens contain UI logic
- **Typed boundaries**: All network boundaries validated with Zod schemas
- **Clean imports**: Barrel exports maintain stable public APIs

### Directory Layout

```
src/
├── app/                    # Next.js App Router (routing only)
│   ├── (protected)/        # Auth-required routes
│   ├── (public)/           # Public routes
│   └── api/                # API route handlers
├── features/               # Feature modules (mini-packages)
│   ├── annotations/        # Visual annotation system
│   ├── auth/               # Authentication & onboarding
│   ├── issues/             # Issue tracking
│   ├── projects/           # Project management
│   ├── teams/              # Team management
│   ├── team-settings/      # Team configuration
│   └── user-settings/      # User preferences
├── components/
│   ├── ui/                 # shadcn primitives
│   └── shared/             # Cross-feature widgets
├── config/                 # Single sources of truth
├── lib/                    # App-wide utilities
├── server/                 # Server-only logic (auth, DB, RBAC)
│   ├── auth/               # Session, tokens, RBAC
│   │   ├── cookies.ts      # httpOnly cookie management
│   │   ├── password.ts     # Argon2 password hashing
│   │   ├── rate-limiter.ts # Redis-based rate limiting
│   │   ├── rbac.ts         # Role-based access control
│   │   ├── session.ts      # Session management
│   │   └── tokens.ts       # JWT token handling
│   ├── db/                 # Database client & schema
│   │   ├── schema/         # Drizzle schema definitions
│   │   └── index.ts        # Database client
│   ├── email/              # Email service
│   │   ├── client.ts       # Resend client
│   │   ├── queue.ts        # Email queue management
│   │   ├── templates/      # React Email templates
│   │   └── worker.ts       # Background email processor
│   └── teams/              # Team management services
│       ├── team-service.ts       # Core team operations
│       ├── member-service.ts     # Member management
│       ├── invitation-service.ts # Invitation handling
│       ├── billable-seats.ts     # Billing calculations
│       └── plan-limits.ts        # Plan enforcement
├── mocks/                  # Mock data for development
└── hooks/                  # Global hooks

drizzle/                    # Database migrations
supabase/                   # Supabase configuration and seed data
```

### Feature Module Anatomy

Each feature follows this structure:
- `api/` - Fetchers + DTO schemas (no React)
- `hooks/` - React Query wrappers
- `components/` - Feature-specific UI
- `screens/` - Screen components (compose hooks)
- `types/` - Domain models
- `utils/` - Feature-specific helpers
- `index.ts` - Barrel export (public API)

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

### Target Users

- **Designers/QA** (PROJECT_EDITOR + TEAM_EDITOR): Create issues, annotate mockups, review implementations
- **Developers** (PROJECT_DEVELOPER + TEAM_MEMBER): View issues, update status, implement fixes
- **Project Managers** (PROJECT_OWNER + TEAM_EDITOR): Manage projects, assign roles, track progress
- **Team Admins** (TEAM_ADMIN + TEAM_MEMBER/VIEWER): Manage team settings without content creation (free) or with content creation (billable)

## Testing

### Important: Test Runner

⚠️ **ALWAYS** use `bun run test` (or `vitest`).

**NEVER** use `bun test` (Bun's native runner) - it ignores our test configuration and will write junk data to your local database.

### Test Types

- **Unit/Integration**: Vitest with PGlite - SAFE
- **Property-based**: fast-check for generative testing (use `*.property.test.ts` naming)
- **E2E**: Playwright - uses local Supabase database
- **Component**: React Testing Library with jsdom/happy-dom
- **Coverage target**: ≥ 80% for business-critical features

### Test Structure

Tests are co-located with source files:

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
│       │   └── team-creation.property.test.ts
│       └── team-service.ts
└── features/
    └── issues/
        └── components/
            ├── issue-list.tsx
            └── issue-list.test.tsx

tests/
└── e2e/
    ├── helpers/
    │   └── test-fixtures.ts
    └── auth.spec.ts
```

## Database & Local Development

This project uses **PostgreSQL 15** via **Supabase** with **Drizzle ORM**.

### Local Development with Supabase CLI

```bash
# Start local Supabase stack (Postgres, Auth, Storage, Studio)
bun run supabase:start

# Stop local Supabase
bun run supabase:stop

# Check status and get connection details
bun run supabase:status

# Access Supabase Studio at http://127.0.0.1:54323
# Local database runs on port 54322 (not 5432)
```

### Schema Management

- Migrations in `drizzle/` directory
- Schema defined in [src/server/db/schema/](src/server/db/schema/) (modular)
- Supabase config in `supabase/` directory
- Use Drizzle Kit for schema changes
- See `docs/SUPABASE_LOCAL_SETUP.md` for detailed setup

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- **Database**: Supabase PostgreSQL connection (local: port 54322)
- **Authentication**: better-auth secrets and session config
- **Storage**: Cloudflare R2 credentials (S3-compatible)
- **Email**: Resend API key
- **Redis**: ioredis connection for rate limiting
- **External APIs**: Any third-party service keys

Validate your configuration:

```bash
bun run validate-env
```

Environment variables are validated at build time using Zod schemas in [src/lib/env.ts](src/lib/env.ts).

For detailed setup instructions, see `docs/ENVIRONMENT_CONFIG.md`.

## Development Guidelines

### Layer Contracts (Import Rules)

- **app/** can import: `features/*`, `components/*`, `hooks`, `lib`, `config`
- **features/\<name\>/components** can import: own `hooks`, `types`, `utils` + `components/ui`, `components/shared`, `lib`, `config`
- **features/\<name\>/hooks** can import: own `api`, `types`, `utils` + `lib`
- **features/\<name\>/api** can import: `lib`, own `types`/`utils` (no React)
- **components/ui** can import: `lib`, `utils` (never `features/*`)
- **components/shared** can import: `components/ui`, `lib`, `utils` (never `features/*`)
- **server/** is server-only; never import from client components

### Naming Conventions

- **Files**: kebab-case (`create-issue-dialog.tsx`, `use-issues.ts`)
- **Components**: PascalCase (`CreateIssueDialog`)
- **Hooks**: camelCase with `use` prefix (`useIssue`, `useIssues`)
- **API functions**: verb-noun (`getIssues`, `createIssue`)
- **Types**: PascalCase (`Issue`, `IssueStatus`)
- **Constants**: UPPER_SNAKE_CASE (`ISSUE_WORKFLOW`, `PLANS`)

### Code Quality

- Typecheck, lint, and tests must pass before merging
- Use ESLint import rules to enforce layer contracts
- Keep pre-commit hooks under 5 seconds

## Documentation

For comprehensive architecture and scaffolding guidelines, see:

- [AGENTS.md](./AGENTS.md) - Complete project scaffolding guide
- [.ai/steering/product.md](./.ai/steering/product.md) - Product overview
- [.ai/steering/structure.md](./.ai/steering/structure.md) - Project structure
- [.ai/steering/tech.md](./.ai/steering/tech.md) - Tech stack details

## Contributing

1. Follow the architecture guidelines in [AGENTS.md](./AGENTS.md)
2. Keep features isolated and portable
3. Write tests for business-critical features
4. Ensure all checks pass: `bun typecheck && bun lint && bun run test`
5. Use conventional commits

## License

[Add your license here]
