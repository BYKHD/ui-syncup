# Drizzle + Zod + PostgreSQL — Developer Instruction (for TypeScript apps)

> **Audience:** Backend/Full‑stack developers using Node.js/TypeScript (e.g., Next.js, Express, Fastify).  
> **Goal:** A consistent, safe, and productive pattern that combines **Zod** (runtime validation), **Drizzle ORM** (typed SQL), and **PostgreSQL** (source of truth).

---
## Table of Contents
1. Principles & Architecture
2. Tech Stack & Installation
3. Project Structure
4. Environment & Configuration
5. Database Schema with Drizzle
6. Zod Schemas (from Drizzle + custom rules)
7. Migrations & Seeding
8. Query Patterns (CRUD, pagination, transactions)
9. API Integration (Route examples)
10. Error Handling & Mapping (Zod ↔ Postgres)
11. Data Types & Gotchas (decimal, bigint, date, jsonb)
12. Security & Permissions
13. Performance & Indexing
14. Testing Strategy
15. CI/CD & Release Management
16. Conventions & Checklists
17. Troubleshooting

---
## 1) Principles & Architecture
- **Single source of truth:** PostgreSQL schema & constraints define reality (uniques, FKs, checks). ORM types help, but DB enforces.  
- **Validate at the boundary:** All external input is parsed with **Zod** before touching business logic or DB.  
- **No duplication of shapes:** Generate Zod from Drizzle where possible, then layer domain‑specific rules/refinements.  
- **Explicitness:** Name fields, indexes, and relations clearly. Prefer explicit transactions for multi‑step writes.  
- **Observability:** Log SQL (in non‑prod), surface Zod errors clearly, map Postgres codes to HTTP.

High‑level flow:
1) **Request →** Zod validates/coerces.  
2) **Service/Repo →** Drizzle executes typed SQL.  
3) **Response →** Optional Zod shaping/serialization.

---
## 2) Tech Stack & Installation
**Core packages**
```bash
bun add drizzle-orm pg zod drizzle-zod
bun add -D drizzle-kit tsx typescript @types/node dotenv
```

**CLI setup**
- `drizzle-kit` generates migrations from your TS schema and applies them.
- Use `tsx` (or `ts-node`) to run TS scripts.

---
## 3) Project Structure (Feature-First Architecture)
```
src/
  server/                           # Server-only logic (auth, DB, RBAC)
    db/
      schema/
        users.ts                    # User table schema
        issues.ts                   # Issues table schema
        projects.ts                 # Projects table schema
        teams.ts                    # Teams table schema
        index.ts                    # Re-exports all tables & relations
      client.ts                     # Postgres connection + Drizzle instance
      index.ts                      # Exports db client
      seeds/
        seed.ts                     # Database seed scripts
    auth/                           # Auth server logic
      cookies.ts                    # httpOnly cookie management
      tokens.ts                     # JWT sign/verify/rotate
      session.ts                    # getSession(), requireSession()
      rbac.ts                       # roles, permissions, guards

  features/                         # Feature-first organization
    auth/
      api/
        types.ts                    # Zod DTOs (login, signup, etc.)
      hooks/
        use-session.ts              # Client cache of /api/auth/me
        use-sign-in.ts              # POST /api/auth/login
        index.ts
      types/
        index.ts                    # Session, User, Role domain types
      utils/
        validators.ts               # Zod schemas for credentials
      components/
        sign-in-form.tsx
        role-gate.tsx
      index.ts

    issues/
      api/
        get-issues.ts               # GET /issues fetcher
        get-issue.ts                # GET /issues/:id fetcher
        create-issue.ts             # POST /issues fetcher
        update-issue.ts             # PATCH /issues/:id fetcher
        types.ts                    # Zod DTOs (transport layer)
        index.ts
      hooks/
        use-issues.ts               # React Query list wrapper
        use-issue.ts                # React Query detail wrapper
        use-create-issue.ts         # React Query mutation
        index.ts
      types/
        index.ts                    # Domain types (Issue, Status, Priority)
      components/
        issues-table.tsx
        create-issue-dialog.tsx
        index.ts
      screens/
        issues-list-screen.tsx      # Composed feature UI
      index.ts

    projects/
      api/
        get-projects.ts
        create-project.ts
        types.ts
        index.ts
      hooks/
        use-projects.ts
        use-create-project.ts
        index.ts
      types/
        index.ts
      components/
        projects-grid.tsx
      index.ts

  app/                              # Next.js App Router
    api/                            # Route handlers
      auth/
        login/route.ts              # POST /api/auth/login
        logout/route.ts             # POST /api/auth/logout
        me/route.ts                 # GET /api/auth/me
      issues/
        route.ts                    # GET/POST /api/issues
        [id]/route.ts               # GET/PATCH/DELETE /api/issues/:id
      projects/
        route.ts                    # GET/POST /api/projects
        [id]/route.ts               # GET/PATCH/DELETE /api/projects/:id

  lib/                              # App plumbing
    api-client.ts                   # fetch wrapper (credentials: 'include')
    query.ts                        # QueryClient setup/provider
    env.ts                          # Zod-validated env (DB_URL, etc.)
    cn.ts                           # tailwind-merge + clsx
    logger.ts

  utils/                            # Pure helpers
    errors.ts                       # Error mappers (Postgres → HTTP)
    pagination.ts                   # Pagination helpers

  config/                           # Single sources of truth
    roles.ts                        # TEAM_*/PROJECT_* roles + PERMISSIONS
    workflows.ts                    # Issue status model
    nav.ts                          # Navigation configuration

drizzle.config.ts                   # Root-level drizzle-kit config
```

> **Key differences from generic structure:**
> - Database logic lives in `server/db/` (server-only)
> - Zod validation split by layer:
>   - **Transport DTOs** in `features/<name>/api/types.ts` (request/response shapes)
>   - **Domain types** in `features/<name>/types/` (business logic)
>   - **Validators** in `features/<name>/utils/validators.ts` (custom Zod refinements)
> - No generic `services/` folder—business logic flows through feature layers:
>   - `app/api/` route handlers → `features/<name>/api/` fetchers (client-side)
>   - Server-side logic in route handlers uses `server/db/` directly
> - Strict layering: `app/` → `features/` → `components/` → `lib`/`server`

---
## 4) Environment & Configuration
### `DATABASE_URL`
```
postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require
```

### `env.ts` (validate env with Zod)
```ts
import { z } from "zod";

export const Env = z.object({
  DATABASE_URL: z.string().url().includes("postgres"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof Env>;
export const env = Env.parse(process.env);
```

### `drizzle.config.ts`
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
});
```

### DB client (`src/server/db/client.ts`)
```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/env";

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
export const db = drizzle(pool, { schema });
```

**Scripts** (in `package.json`)
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "seed": "tsx src/server/db/seeds/seed.ts"
  }
}
```

---
## 5) Database Schema with Drizzle
**Example:** `users` and `issues` tables.
```ts
// src/server/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  age: integer("age"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```
```ts
// src/server/db/schema/issues.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```
```ts
// src/server/db/schema/index.ts
export * from "./users";
export * from "./issues";
```

**Conventions**
- **snake_case** columns, plural table names.
- Always include `created_at` (and `updated_at` if needed).
- Use `uuid` PK with `gen_random_uuid()` (enable `pgcrypto` extension in your DB).
- Declare foreign keys with explicit `onDelete` policy.
- Add indexes for common filters (email, foreign keys, created_at).

---
## 6) Zod Schemas (generated + domain rules)
Use `drizzle-zod` to avoid duplicating shapes, then layer constraints.
```ts
// src/validation/users.ts
import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "@/db/schema";

export const InsertUser = createInsertSchema(users, {
  email: (z) => z.string().email(),
  name: (z) => z.string().min(1).max(120),
  age: (z) => z.number().int().gte(13).optional(),
});

export const SelectUser = createSelectSchema(users);
export type TInsertUser = z.infer<typeof InsertUser>;
export type TSelectUser = z.infer<typeof SelectUser>;
```

Custom refinements & transforms:
```ts
export const CreateIssue = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(10_000).optional(),
  reporterId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
});
```

**Guideline:**
- **Boundary in:** Parse request payloads with Zod (`parse`/`safeParse`).
- **Boundary out:** Optionally shape responses (strip internals, serialize dates via `.toISOString()`).

---
## 7) Migrations & Seeding
**Generate & apply**
```bash
pnpm db:generate   # scans TS schema → SQL migrations in /drizzle
pnpm db:migrate    # applies migrations to target DB
```

**Seed script**
```ts
// src/server/db/seeds/seed.ts
import { db } from "@/db/client";
import { users, issues } from "@/db/schema";

await db.insert(users).values([
  { email: "ada@example.com", name: "Ada Lovelace" },
  { email: "alan@example.com", name: "Alan Turing" },
]);

const [ada] = await db.select().from(users).where(users.email.eq("ada@example.com"));
await db.insert(issues).values({ title: "First issue", reporterId: ada.id });

console.log("Seed completed");
process.exit(0);
```

**Rules**
- Never hand‑edit generated SQL; regenerate from TS.
- One migration per logical change; commit migrations.
- Seeding is idempotent where possible.

---
## 8) Query Patterns
**CRUD**
```ts
// Create
await db.insert(users).values(data);

// Read
const rows = await db.select().from(users).limit(50);

// Update
await db.update(users).set({ name: "New Name" }).where(users.id.eq(id));

// Delete
await db.delete(users).where(users.id.eq(id));
```

**Pagination (cursor)**
```ts
// cursor = { createdAt: iso, id: uuid }
// fetch newer than cursor (or older, depending on sort)
```
Use `(created_at, id)` composite cursor to ensure stable ordering.

**Transactions**
```ts
await db.transaction(async (tx) => {
  const u = await tx.insert(users).values(data).returning();
  await tx.insert(issues).values({ title: "Welcome", reporterId: u[0].id });
});
```

---
## 9) API Integration (Route examples)
**Next.js Route Handler (POST /api/users)**
```ts
// src/api/users/POST.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { InsertUser } from "@/validation/users";
import { users } from "@/db/schema";
import { mapPostgresError } from "@/utils/errors";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = InsertUser.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [created] = await db.insert(users).values(parsed.data).returning();
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    const { status, message } = mapPostgresError(e);
    return NextResponse.json({ error: message }, { status });
  }
}
```

**Express example (GET /users)**
```ts
app.get("/users", async (req, res) => {
  const rows = await db.select().from(users).limit(100);
  res.json(rows);
});
```

---
## 10) Error Handling & Mapping
**Zod errors → 400** with `error.flatten()`.

**Postgres errors → HTTP**
- `23505` **unique_violation** → 409 Conflict (e.g., duplicate email)
- `23503` **foreign_key_violation** → 409 or 422 (invalid relation)
- `23514` **check_violation** → 422
- Default → 500

```ts
// src/utils/errors.ts
export function mapPostgresError(e: any) {
  const code = e?.code as string | undefined;
  switch (code) {
    case "23505":
      return { status: 409, message: "Duplicate key" };
    case "23503":
      return { status: 422, message: "Related record missing" };
    case "23514":
      return { status: 422, message: "Constraint failed" };
    default:
      return { status: 500, message: "Internal error" };
  }
}
```

---
## 11) Data Types & Gotchas
- **text vs varchar(n):** Prefer `text`. Add a `CHECK` only when the length is a real business rule—not a UI whim.
  ```sql
  ALTER TABLE users ADD CONSTRAINT name_len CHECK (char_length(name) <= 120);
  ```
- **Email case-insensitivity:** Use `CITEXT` or a functional index. Works great with soft deletes.
  ```sql
  CREATE EXTENSION IF NOT EXISTS citext;
  ALTER TABLE users ALTER COLUMN email TYPE citext;
  CREATE UNIQUE INDEX users_email_unq_active
    ON users (email) WHERE deleted_at IS NULL;
  -- or:
  CREATE UNIQUE INDEX users_email_unq_lower_active
    ON users ((lower(email))) WHERE deleted_at IS NULL;
  ```
- **numeric/decimal:** Node `pg` returns strings. Use integer cents or a decimal lib for arithmetic; if you keep `numeric`, parse/transform at the edge.
- **bigint:** Use `z.bigint()` or string→BigInt transform; be explicit in your Zod schema.
- **timestamptz:** Store UTC. Serialize to ISO-8601. Prefer `timestamptz` over `timestamp`.
- **jsonb:** Model the shape with Zod; index with GIN when you query by keys/paths.
  ```sql
  CREATE INDEX products_meta_gin ON products USING GIN (meta jsonb_path_ops);
  ```
- **UUIDs:** Generate in DB (`gen_random_uuid()`), not clients. Enable `pgcrypto` in the database.
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```
---
## 12) Security & Permissions
- **Parameterized queries** only (Drizzle does this by default). No string‑built SQL.
- **AuthZ checks in services** (e.g., ensure `reporterId` matches current user or role grants access).
- **Input validation** with Zod (lengths, formats, enums). Never trust client types.
- **Secrets** from env are Zod‑validated; never hardcode.
- Consider **Row‑Level Security (RLS)** in Postgres for multi‑tenant setups.

---
## 13) Performance & Indexing
- **Index the essentials:** all FKs, frequently filtered columns, and your pagination sort `(created_at, id)`.
- **Composite & covering indexes:** Order columns by selectivity and sort; add `INCLUDE(...)` to cover projections where it matters.
  ```sql
  CREATE INDEX issues_list_idx ON issues (reporter_id, created_at DESC, id DESC) INCLUDE (title, status);
  ```
- **Partial indexes:** Apply uniqueness or speed only to the live working set (e.g., soft-deleted rows excluded).
  ```sql
  CREATE UNIQUE INDEX users_email_unq_active
    ON users (email) WHERE deleted_at IS NULL;
  ```
- **Functional indexes:** Normalize values you query by (e.g., `lower(email)`, `coalesce(status,'open')`).
  ```sql
  CREATE INDEX users_email_lower_idx ON users ((lower(email)));
  ```
- **JSONB indexing:** Use GIN for key/path queries; keep payloads small and stable. Denormalize only what you measure.
- **Pagination:** Prefer keyset (cursor) pagination over deep `OFFSET`.
- **Connection pooling:** Pool size 10–20 for typical Node apps; use PgBouncer in transaction mode for serverless/concurrency spikes.
- **Analyze & vacuum:** Let autovacuum run; monitor table bloat on heavy update/delete tables.
---
## 14) Testing Strategy
- **Unit**: Zod schemas (valid/invalid cases).
- **Integration**: Spin up a Postgres (Docker) per test run, apply migrations, run DB tests.
- **Contract**: If exposing an API, snapshot response shapes (after Zod shaping).

Example unit test idea:
```ts
expect(InsertUser.safeParse({ email: "bad", name: "" }).success).toBe(false);
```

---
## 15) CI/CD & Release Management
- CI runs: typecheck, lint, unit tests, generate migrations, apply to test DB.
- Release: apply migrations before deploy (or during maintenance window).
- Keep rollback plan (backups or reversible migrations).

---
## 16) Conventions & Checklists
**Naming**
- Tables plural, columns snake_case.
- Foreign keys end with `_id`.

**Columns**
- `id uuid PK`, `created_at timestamptz not null default now()`.
- Optional: `updated_at` via trigger or application logic.

**Validation**
- Zod at every external boundary. Use `.coerce` for numbers/dates from strings.

**Routes**
- `POST` validates body; `GET` validates query params; respond with shaped DTO.

**Migrations**
- One migration per change; commit them; never edit applied migrations.

**Code review checklist**
- [ ] Zod schema exists for each endpoint input.
- [ ] DB constraints (unique/FK/check) match domain rules.
- [ ] Indexes exist for frequent queries.
- [ ] Errors mapped with correct HTTP codes.
- [ ] Transaction used for multi‑write operations.

---
## 17) Troubleshooting
- **Unique violation (23505)**: check for duplicate key; add pre‑check (optional) but rely on DB.
- **Foreign key (23503)**: ensure related row exists; check `onDelete` policy.
- **Decimal as string**: add transformer or parse before arithmetic.
- **Timezone drift**: standardize on UTC; use `timestamptz`.
- **Migration drift**: regenerate and re‑apply; avoid manual DB edits outside migrations.

---
### Quick Start Summary
1. Create tables in `src/server/db/schema/*` (Drizzle).
2. Generate & run migrations (`db:generate`, `db:migrate`).
3. Create Zod schemas via `drizzle-zod`, add refinements.
4. Build services with Drizzle queries (+ transactions).
5. Validate requests with Zod in your API routes. Map DB errors.
6. Test locally (Docker Postgres), seed, then deploy.

---
## 18) Soft delete done right
- Add `deleted_at timestamptz`.
- Make uniqueness **partial** so it applies only to active rows.
- Ensure all read queries scope `deleted_at IS NULL` (wrap in views or repository functions).

```sql
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
CREATE UNIQUE INDEX users_email_unq_active
  ON users ((lower(email))) WHERE deleted_at IS NULL;
```

In services, always include a default scope; expose an explicit `{ withDeleted: true }` override when needed.

---
## 19) Multi‑tenancy & Row‑Level Security (RLS)
- Add `tenant_id uuid not null` to all tenant‑scoped tables.
- Make uniques composite: `(tenant_id, …)`.
- Enable RLS and isolate by a session variable.

```sql
ALTER TABLE issues ADD COLUMN tenant_id uuid NOT NULL;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON issues
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- at session start (per request):
SELECT set_config('app.tenant_id', $1, true);
```

With Drizzle, call `db.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`)` right after acquiring a connection/transaction.

---
## 20) Operational hardening (timeouts, pools, retries)
Set strict timeouts to fail fast and avoid stuck connections:

```sql
ALTER ROLE app_user SET statement_timeout = '3s';
ALTER ROLE app_user SET lock_timeout = '1s';
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '15s';
```

- Use short transactions; never hold connections across awaits that don't touch the DB.
- Retry on **serialization failures** (`40001`) with jitter; never retry on unique violations.

---
## 21) Security posture & roles
- Separate roles: `app_user` (read/write limited), `migrations` (DDL), `readonly` (analytics).
- Grant least privilege; schema‑qualify objects; avoid `public` schema for app data.
- Encrypt secrets; don’t log raw PII; consider column‑level encryption for high‑risk fields (pgcrypto/KMS).

```sql
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA app AUTHORIZATION migrations;
GRANT USAGE ON SCHEMA app TO app_user;
```

---
## 22) Observability & SLOs
- Enable `pg_stat_statements`; set `log_min_duration_statement` (e.g., 200ms in staging).
- Track p50/p95/p99 for key queries; alert on pool saturation and statement timeouts.
- Surface Zod errors as structured payloads; map Postgres codes (`23505`, `23503`, `40001`, `57014`) to sensible HTTP statuses.

---
## 23) Upserts & conflict handling
Prefer explicit upserts; keep conflict targets aligned with your business keys.

```ts
// Drizzle example
await db.insert(users)
  .values(data)
  .onConflictDoUpdate({
    target: users.email, // or (users.tenantId, users.email)
    set: { name: data.name, updatedAt: new Date() },
  });
```

For event logs, consider `ON CONFLICT DO NOTHING` with idempotency keys.

---
**Appendix: Numeric transformer example**
```ts
import { numeric } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  price: numeric("price").$type<string>(), // pg returns string
});

// In Zod
export const InsertProduct = z.object({
  price: z.union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .refine((n) => Number.isFinite(n) && n >= 0, "Invalid price"),
});
```

This document is your team’s baseline. Extend with your domain models (tenancy, roles, billing) and keep the flow: **Zod at the edges, Drizzle for data, Postgres for truth**.
