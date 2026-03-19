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
- **Supabase Realtime** - Real-time database updates via WebSockets

## Forms & Validation

- **React Hook Form** - Form state management
- **@hookform/resolvers** - Zod integration for forms

## Database

- **PostgreSQL 15** - Primary database via Supabase
- **Drizzle ORM** - Type-safe database queries and migrations
- **Supabase CLI** - Local development environment (replaces docker-compose)
- **Supabase** - PostgreSQL hosting, Auth, Storage, and additional services

## Storage

- **Cloudflare R2** - S3-compatible object storage for file uploads
- **AWS SDK** - S3 client for R2 integration

## Auth & Security

- **better-auth** - Authentication library with session management
- **@node-rs/argon2** - Password hashing
- **ioredis** - Redis client for rate limiting and session storage

## Email

- **Resend** - Transactional email service
- **React Email** - Email template components

## Testing

- **Vitest** - Unit and integration tests (with jsdom/happy-dom)
- **@testing-library/react** - Component testing utilities
- **Playwright** - E2E browser tests
- **fast-check** - Property-based testing
- **pg-mem** - In-memory PostgreSQL for testing

### Testing Rules

- **ALWAYS** use `bun run test` (or `vitest`) for unit tests
- **NEVER** use `bun test` (Bun's native runner) - it ignores test config and can corrupt your local database
- Tests use in-memory database by default (safe)
- E2E tests (`bun run test:ui`) use local database

## CLI Tooling (cli/ package)

The `cli/` directory is a **standalone npm package** published separately from the Next.js app.

- **tsup** - Bundles `cli/index.ts` and all imports into `cli/dist/index.js` (CJS, Node 20)
- **commander** - CLI argument parsing. Listed as a runtime `dependency` (not bundled) because its dual ESM+CJS exports cause class-instance conflicts when bundled
- All other CLI deps (`dotenv`, `postgres`, `zod`) are bundled — no runtime install needed

**Key files:**
- `cli/package.json` — npm package manifest; `"bin": { "ui-syncup": "dist/index.js" }`, `"files": ["dist", "templates"]`
- `cli/tsup.config.ts` — `shims: true` (for `import.meta.url` → CJS), `external: ["commander"]`
- `cli/.npmignore` — excludes TS source and `__tests__/` from the published tarball

**Build & publish workflow:**
```bash
cd cli
bun run build          # compiles → dist/index.js
npm publish --dry-run  # preview tarball (auto-runs build via prepublishOnly)
npm publish --access public
```

**Local testing:**
```bash
cd cli && npm link     # simulates global install
ui-syncup --help
npm unlink -g ui-syncup
```

**Template resolution after bundling:** `findTemplatePath()` in `cli/lib/filesystem.ts` checks `__dirname/../templates/` first (bundled layout) then falls back to the dev source layout.

**Version resolution after bundling:** `getVersion()` in `cli/lib/constants.ts` searches candidate `package.json` paths ordered for the bundled layout (`dist/` → `../package.json`) before the dev layout.

## Dev Tools

- **ESLint 9** - Linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## Common Commands

```bash
# Development
bun dev                 # Start dev server (http://localhost:3000)
bun build              # Production build (Next.js app)
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

# Supabase (Local Development - replaces docker-compose)
bun run supabase:start # Start local Supabase stack (Postgres, Studio, Auth, Storage)
bun run supabase:stop  # Stop local Supabase
bun run supabase:status # Check Supabase status and get connection details

# Validation
bun run validate-env   # Validate environment variables
```

## CLI Commands (run from cli/ directory)

```bash
cd cli
bun run build          # Compile CLI → dist/index.js via tsup
npm publish --dry-run  # Preview npm tarball without publishing
npm publish --access public  # Publish to npm registry
npm link               # Install CLI globally for local testing
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

## Environment Variables

- Validated with Zod in `src/lib/env.ts` at build time
- Local development: Copy `.env.example` to `.env.local`
- Vercel deployment: Configure in Project Settings → Environment Variables
- Run `bun run validate-env` to check configuration
- See `docs/ENVIRONMENT_CONFIG.md` for detailed setup

## Local Development

- **Supabase CLI** is used for local development (not docker-compose)
- Run `bun run supabase:start` to spin up local Postgres, Auth, Storage, Studio, and more
- Supabase Studio available at http://127.0.0.1:54323 for database management
- Local database runs on port 54322 (not 5432)
- See `docs/SUPABASE_LOCAL_SETUP.md` for detailed setup instructions

## Architecture Notes

- Server components by default; use `"use client"` only when needed
- API routes in `src/app/api/*` for backend endpoints
- Mock data in `src/mocks/*` for development/testing
- Feature-first organization in `src/features/*`
- Prefer `lib/logger` and `lib/performance` when you add instrumentation or observability hooks so new pages stay consistent with the shared plumbing rather than introducing ad-hoc console/log statements
- httpOnly cookies for session/token storage (never localStorage)
- All network boundaries validated with Zod schemas
