# Tech Stack

## Framework & Runtime

- **Next.js 16** (App Router) - React framework with server-first routing
- **React 19.2** - UI library
- **TypeScript 5** - Type safety
- **Node 20 LTS** - Runtime (see `.nvmrc`)
- **Bun** - Package manager (preferred over npm/yarn)

## UI & Styling

- **shadcn/ui** - Component library built on Radix UI primitives
- **Radix UI** - Headless accessible components
- **Tailwind CSS 4** - Utility-first styling
- **Framer Motion** (motion) - Animations
- **Lucide React** + **Remix Icon** - Icon libraries
- **next-themes** - Dark mode support

## Data & State

- **TanStack Query (React Query) 5** - Server state management, caching, mutations
- **Zod** - Runtime validation and type inference
- **SWR** - Alternative data fetching (used in some features)

## Forms & Validation

- **React Hook Form** - Form state management
- **@hookform/resolvers** - Zod integration for forms

## Database (Planned)

- **PostgreSQL** - Primary database (see `docker-compose.yml`)
- **Drizzle ORM** - Type-safe database queries (see `docs/DRIZZLE_ZOD_POSTGRESQL_INSTRUCTION.md`)

## Auth

- **better-auth** - Authentication library

## Testing

- **Vitest** - Unit and integration tests
- **@testing-library/react** - Component testing
- **Playwright** - E2E tests

## Dev Tools

- **ESLint 9** - Linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## Common Commands

```bash
# Development
bun dev                 # Start dev server (http://localhost:3000)
bun build              # Production build
bun start              # Start production server

# Code Quality
bun typecheck          # Run TypeScript compiler checks
bun lint               # Run ESLint
bun format             # Format code with Prettier

# Testing
bun test               # Run unit tests (Vitest)
bun test:watch         # Run tests in watch mode
bun test:ui            # Run E2E tests (Playwright)
```

## Path Aliases

- `@/*` maps to `./src/*` for absolute imports

## Key Libraries

- **class-variance-authority** - Component variant management
- **clsx** + **tailwind-merge** - Conditional className utilities (via `cn()` helper)
- **cmdk** - Command palette component
- **date-fns** - Date utilities
- **sonner** - Toast notifications
- **uuid** - Unique ID generation

## Architecture Notes

- Server components by default; use `"use client"` only when needed
- API routes in `src/app/api/*` for backend endpoints
- Mock data in `src/mocks/*` for development/testing
- Feature-first organization in `src/features/*`
- Prefer `lib/logger` and `lib/performance` when you add instrumentation or observability hooks so new pages stay consistent with the shared plumbing rather than introducing ad-hoc console/log statements.
