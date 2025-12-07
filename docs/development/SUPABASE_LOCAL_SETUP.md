# Supabase Local Development Setup

This guide explains how to run the local development environment using the **Supabase CLI**. This replaces the legacy `docker-compose` setup for a more faithful reproduction of the production environment.

## Prerequisites

*   **Docker Desktop**: Must be installed and running.
*   **Node.js & Bun**: As specified in `.nvmrc` and `package.json`.
*   **Supabase CLI**: Installed via `npm` (included in `package.json` scripts) or Homebrew.

## Quick Start

1.  **Start the Supabase Stack**
    This spins up a full local Supabase instance (Postgres, Studio, Auth, Storage, Edge Functions, etc.).
    ```bash
    npx supabase start
    ```
    *   **Studio URL**: [http://127.0.0.1:54323](http://127.0.0.1:54323) (Dashboard)
    *   **API URL**: `http://127.0.0.1:54321`
    *   **DB URL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

2.  **Verify Environment**
    Ensure your `.env.local` is configured to point to the local Supabase instance.
    ```bash
    # .env.local
    DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    SUPABASE_URL="http://127.0.0.1:54321"
    SUPABASE_ANON_KEY="your-local-anon-key"
    SUPABASE_SERVICE_ROLE_KEY="your-local-service-role-key"
    ```
    > **Note**: The keys are printed to the terminal when you run `npx supabase start`. You can also find them with `npx supabase status`.

3.  **Apply Database Migrations** (First-time setup)
    ```bash
    bun run db:migrate
    ```
    > **Important**: You must run migrations before the app will work. Without this step, you'll get `500 Internal Server Error` during signup because the database tables don't exist.

4.  **Run the App**
    ```bash
    bun dev
    ```

## Database Management

We use **Drizzle ORM** to manage the database schema.

### Applying Schema Changes
When you make changes to your Drizzle schema (`src/server/db/schema/*`), you need to apply them to the local database.

**Option A: Push (Prototyping)**
Quickly push schema changes without creating a migration file. Great for rapid iteration.
```bash
bun run db:push
```

**Option B: Migration (Production-ready)**
Generate a migration file and apply it. Use this when you are ready to commit changes.
```bash
# 1. Generate migration
bun run db:generate

# 2. Apply migration
bun run db:migrate
```

### Resetting the Database

If you need to wipe the database and start fresh, follow these steps:

#### Method 1: Using Supabase Reset (Recommended)

```bash
# 1. Stop the Supabase stack
npx supabase stop

# 2. Start fresh (this will recreate the database)
npx supabase start

# 3. Apply all Drizzle migrations
bun run db:migrate

# 4. (Optional) Verify tables were created
npx supabase db psql -c "\dt"
```

#### Method 2: Using Supabase DB Reset

```bash
# This drops and recreates the database, then applies migrations
npx supabase db reset

# Note: This only works if you have migrations in supabase/migrations/
# Since we use Drizzle, you may need to run:
bun run db:migrate
```

#### Method 3: Manual Reset (If above methods fail)

```bash
# 1. Stop Supabase
npx supabase stop

# 2. Remove all Docker volumes (nuclear option)
docker volume prune -f

# 3. Start Supabase fresh
npx supabase start

# 4. Apply Drizzle migrations
bun run db:migrate
```

**What gets reset:**
- All database tables and data
- Auth users
- Storage files
- Edge Functions state

**What persists:**
- Your schema files in `src/server/db/schema/`
- Migration files in `drizzle/`
- Environment variables in `.env.local`

### Accessing the Database
*   **Supabase Studio**: [http://127.0.0.1:54323](http://127.0.0.1:54323) - A powerful web UI for viewing tables, running SQL, and managing Auth.
*   **Drizzle Studio**: `bun run db:studio` - Drizzle's own schema viewer.
*   **PSQL**: `npx supabase db psql` - Direct command-line access.

## Auth & Storage

### Authentication
The local Supabase instance includes a fully functional Auth service (GoTrue).
*   Users created locally are stored in the local Postgres `auth` schema.
*   You can manage users in the **Authentication** tab of Supabase Studio.
*   Emails sent by Auth (e.g., confirmations) are captured by **Inbucket** at [http://127.0.0.1:54324](http://127.0.0.1:54324).

### Storage
The local instance replaces MinIO.
*   Buckets are stored in the `storage` schema.
*   Manage files in the **Storage** tab of Supabase Studio.

## Troubleshooting

**"Docker is not running"**
Ensure Docker Desktop is started.

**"Port 54322 is already in use"**
If you have another Postgres instance running, stop it.
```bash
# Stop legacy docker-compose
docker-compose -f docker-compose-old.yaml down
```

**"Auth not working"**
Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local` match the output of `npx supabase status`.

**"Schema mismatch"**
If Drizzle complains about schema drift, try `bun run db:push` to force sync, or follow the reset steps above.

**"500 Internal Server Error during signup"**
This usually means the database tables don't exist. Run:
```bash
bun run db:migrate
```

**"Migration already applied" errors**
If you see duplicate migration errors:
```bash
# Check which migrations are applied
npx supabase db psql -c "SELECT * FROM drizzle.__drizzle_migrations;"

# If needed, reset and reapply
npx supabase stop
npx supabase start
bun run db:migrate
```
