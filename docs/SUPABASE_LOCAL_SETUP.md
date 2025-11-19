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

3.  **Run the App**
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
If you need to wipe the database and start fresh:
```bash
npx supabase db reset
```
This will:
1.  Drop the database.
2.  Re-create it.
3.  Apply all migrations.
4.  Run the seed script (if configured in `supabase/seed.sql`).

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
If Drizzle complains about schema drift, try `bun run db:push` to force sync, or `npx supabase db reset` to start clean.
