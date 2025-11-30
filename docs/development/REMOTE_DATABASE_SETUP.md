# Remote Database Setup Guide

This guide explains how to initialize and manage the database schema on remote Supabase instances (develop, staging, production).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Methods](#deployment-methods)
  - [Method 1: Drizzle Kit (Recommended)](#method-1-drizzle-kit-recommended)
  - [Method 2: Supabase CLI](#method-2-supabase-cli)
  - [Method 3: Direct SQL Execution](#method-3-direct-sql-execution)
- [CI/CD Integration](#cicd-integration)
- [Vercel Deployment](#vercel-deployment)
- [Safety Guidelines](#safety-guidelines)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying database schema to remote Supabase:

- [ ] Remote Supabase project created (develop/staging/production)
- [ ] Database connection strings obtained from Supabase Dashboard
- [ ] Local migrations tested and working (`bun run db:migrate` on local)
- [ ] Database backup verified (Supabase provides automatic backups)
- [ ] Access credentials secured (never commit to Git)

---

## Quick Start

**TL;DR - Deploy schema to remote database in 3 steps:**

```bash
# 1. Get your remote database URL from Supabase Dashboard
# Settings → Database → Connection string (Direct connection)

# 2. Set environment variable
export DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 3. Run migrations
bun run db:migrate

# 4. Verify tables were created
psql "$DIRECT_URL" -c "\dt"
```

---

## Deployment Methods

### Method 1: Drizzle Kit (Recommended)

This is the cleanest approach since the project uses Drizzle ORM for schema management.

#### Step 1: Obtain Remote Database Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (develop/staging/production)
3. Navigate to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Copy both connection strings:
   - **Transaction mode** (pooled) → `DATABASE_URL`
   - **Session mode** (direct) → `DIRECT_URL`

**Example connection strings:**
```bash
# Pooled connection (for application runtime)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

#### Step 2: Configure Environment Variables

**Option A: Create environment-specific file**

```bash
# Create .env.develop (for develop environment)
cat > .env.develop << EOF
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
EOF

# Or .env.production (for production environment)
cat > .env.production << EOF
DATABASE_URL="your-production-pooled-url"
DIRECT_URL="your-production-direct-url"
EOF
```

**Option B: Export environment variables**

```bash
# For develop environment
export DATABASE_URL="your-develop-pooled-url"
export DIRECT_URL="your-develop-direct-url"

# For production environment
export DATABASE_URL="your-production-pooled-url"
export DIRECT_URL="your-production-direct-url"
```

#### Step 3: Run Migrations

**Using environment file:**

```bash
# Load environment variables from file
export $(cat .env.develop | xargs)

# Run migrations
bun run db:migrate
```

**Using inline environment variables:**

```bash
# Run migrations with explicit connection string
DATABASE_URL="your-remote-url" DIRECT_URL="your-direct-url" bun run db:migrate
```

**Using Drizzle Kit directly:**

```bash
# Run migrations with custom config
drizzle-kit migrate --config=drizzle.config.ts
```

#### Step 4: Verify Schema Deployment

**Check tables via psql:**

```bash
# List all tables
psql "$DIRECT_URL" -c "\dt"

# Check specific table structure
psql "$DIRECT_URL" -c "\d users"

# Verify migration history
psql "$DIRECT_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"
```

**Check via Supabase Dashboard:**

1. Go to **Table Editor** in Supabase Dashboard
2. Verify all tables are present
3. Check table structures match your schema

**Check via Drizzle Studio:**

```bash
# Open Drizzle Studio connected to remote database
DATABASE_URL="your-remote-url" bun run db:studio
```

---

### Method 2: Supabase CLI

Use Supabase's native migration system for tighter integration with Supabase features.

#### Step 1: Install and Login to Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Or use npx (no installation required)
npx supabase --version

# Login to Supabase
npx supabase login
```

#### Step 2: Link Local Project to Remote

```bash
# Link to your remote Supabase project
npx supabase link --project-ref [YOUR-PROJECT-REF]

# Find your project ref in the Supabase Dashboard URL:
# https://supabase.com/dashboard/project/[PROJECT-REF]
```

**Example:**
```bash
npx supabase link --project-ref abcdefghijklmnop
```

#### Step 3: Convert Drizzle Migrations to Supabase Format

Supabase expects migrations in `supabase/migrations/` directory with timestamp-based naming.

```bash
# Create Supabase migrations directory (if not exists)
mkdir -p supabase/migrations

# Copy Drizzle migrations with proper naming
# Format: YYYYMMDDHHMMSS_description.sql
cp drizzle/0000_strange_reaper.sql supabase/migrations/20240101000000_initial_schema.sql
cp drizzle/0001_wonderful_triathlon.sql supabase/migrations/20240102000000_update_schema.sql
```

**Or use a script to automate conversion:**

```bash
# Create conversion script
cat > scripts/convert-migrations.sh << 'EOF'
#!/bin/bash
mkdir -p supabase/migrations
counter=0
for file in drizzle/*.sql; do
  timestamp=$(date -u -d "+$counter days" +"%Y%m%d%H%M%S")
  filename=$(basename "$file" .sql)
  cp "$file" "supabase/migrations/${timestamp}_${filename}.sql"
  counter=$((counter + 1))
done
echo "✅ Migrations converted to Supabase format"
EOF

chmod +x scripts/convert-migrations.sh
./scripts/convert-migrations.sh
```

#### Step 4: Push Migrations to Remote

```bash
# Push all migrations to the remote database
npx supabase db push

# Or push to specific environment
npx supabase db push --db-url "your-direct-connection-string"
```

#### Step 5: Verify Deployment

```bash
# Check remote database status
npx supabase db remote status

# List applied migrations
npx supabase migration list --remote
```

---

### Method 3: Direct SQL Execution

Quick one-time setup for manual deployment or emergency fixes.

#### Step 1: Combine Migration Files

```bash
# Combine all Drizzle migrations into a single file
cat drizzle/0000_strange_reaper.sql drizzle/0001_wonderful_triathlon.sql > combined_migration.sql

# Review the combined file before executing
cat combined_migration.sql
```

#### Step 2: Execute via Supabase Dashboard (GUI Method)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New query**
5. Paste the contents of `combined_migration.sql`
6. Click **Run** or press `Cmd/Ctrl + Enter`
7. Verify success message

#### Step 3: Execute via Command Line (CLI Method)

```bash
# Execute SQL file directly
psql "$DIRECT_URL" < combined_migration.sql

# Or execute with verbose output
psql "$DIRECT_URL" -f combined_migration.sql -v ON_ERROR_STOP=1

# Or execute inline SQL
psql "$DIRECT_URL" -c "$(cat combined_migration.sql)"
```

#### Step 4: Verify Execution

```bash
# Check if tables were created
psql "$DIRECT_URL" -c "\dt"

# Check table counts
psql "$DIRECT_URL" -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';"
```

---

## CI/CD Integration

Automate database migrations in your deployment pipeline.

### Create Migration Script

Create `scripts/migrate-remote.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL must be set');
  }

  console.log('🔄 Running migrations against remote database...');
  console.log(`📍 Target: ${connectionString.split('@')[1]?.split('/')[0] || 'unknown'}`);
  
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigrations().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### Add Script to package.json

```json
{
  "scripts": {
    "db:migrate:remote": "bun run scripts/migrate-remote.ts",
    "db:migrate:develop": "DIRECT_URL=$DEVELOP_DIRECT_URL bun run scripts/migrate-remote.ts",
    "db:migrate:production": "DIRECT_URL=$PRODUCTION_DIRECT_URL bun run scripts/migrate-remote.ts"
  }
}
```

### GitHub Actions Workflow

Create `.github/workflows/deploy-database.yml`:

```yaml
name: Deploy Database Schema

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - develop
          - staging
          - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run migrations
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: bun run db:migrate:remote
      
      - name: Verify migration
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
        run: |
          psql "$DIRECT_URL" -c "\dt" || echo "⚠️ Could not verify tables"
```

### Manual Deployment Workflow

```bash
# 1. Deploy code to preview environment
git push origin develop

# 2. Wait for Vercel preview deployment to complete
# Check: https://vercel.com/dashboard

# 3. Run migrations against develop database
export DIRECT_URL="your-develop-direct-url"
bun run db:migrate:remote

# 4. Test the preview deployment
# Visit: https://develop-ui-syncup.vercel.app

# 5. If all tests pass, merge to main (production)
git checkout main
git merge develop
git push origin main

# 6. Run migrations against production database
export DIRECT_URL="your-production-direct-url"
bun run db:migrate:remote
```

---

## Vercel Deployment

Integrate database migrations with Vercel deployments.

### Option 1: Pre-build Hook (Automatic)

**⚠️ Warning:** This runs migrations automatically on every deployment. Use with caution.

Add to `package.json`:

```json
{
  "scripts": {
    "vercel-build": "bun run db:migrate && bun run build"
  }
}
```

Configure in `vercel.json`:

```json
{
  "buildCommand": "bun run vercel-build"
}
```

**Pros:**
- Fully automated
- No manual intervention required

**Cons:**
- Migrations run on every deployment (even failed builds)
- No rollback mechanism
- Risky for production

### Option 2: Separate Deployment Step (Recommended)

Run migrations manually before promoting deployments.

**Workflow:**

```bash
# 1. Deploy code to preview (automatic)
git push origin develop

# 2. Wait for preview deployment
# Vercel will post preview URL in PR comments

# 3. Run migrations against develop database
export DIRECT_URL="$DEVELOP_DIRECT_URL"
bun run db:migrate:remote

# 4. Test preview deployment thoroughly
# Visit preview URL and test all features

# 5. If tests pass, promote to production
vercel promote <preview-deployment-url>

# 6. Run migrations against production database
export DIRECT_URL="$PRODUCTION_DIRECT_URL"
bun run db:migrate:remote
```

### Option 3: Vercel Deploy Hook

Create a separate deployment hook for migrations.

**Setup:**

1. Go to Vercel Dashboard → Project Settings → Git
2. Create a **Deploy Hook** named "Run Migrations"
3. Copy the webhook URL

**Usage:**

```bash
# Trigger migration deployment
curl -X POST "https://api.vercel.com/v1/integrations/deploy/[HOOK-ID]"

# Or use GitHub Actions to trigger after successful deployment
```

---

## Safety Guidelines

### Pre-Migration Checklist

Before running migrations on any remote database:

- [ ] **Test locally first**: Run `bun run db:migrate` on local Supabase
- [ ] **Review SQL**: Check migration files for destructive operations (DROP, TRUNCATE)
- [ ] **Backup database**: Verify Supabase automatic backups are enabled
- [ ] **Check dependencies**: Ensure no breaking schema changes
- [ ] **Plan rollback**: Have a rollback strategy ready
- [ ] **Schedule maintenance**: Run during low-traffic periods (if destructive)
- [ ] **Notify team**: Inform team members of deployment
- [ ] **Monitor application**: Watch error logs during and after migration

### Migration Best Practices

**DO:**
- ✅ Use transactions for multiple operations
- ✅ Add indexes after data insertion (for large tables)
- ✅ Use `IF NOT EXISTS` for idempotent migrations
- ✅ Test migrations on a copy of production data
- ✅ Keep migrations small and focused
- ✅ Document breaking changes in migration comments

**DON'T:**
- ❌ Drop tables without backup
- ❌ Remove columns without deprecation period
- ❌ Run migrations during peak traffic
- ❌ Skip testing on staging environment
- ❌ Modify production data without approval
- ❌ Use hardcoded values (use environment variables)

### Rollback Strategy

**If migration fails:**

```bash
# 1. Identify the failed migration
psql "$DIRECT_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# 2. Restore from backup (Supabase Dashboard → Database → Backups)
# Or manually revert changes

# 3. Fix the migration file locally
# Edit drizzle/XXXX_migration.sql

# 4. Test the fix locally
bun run db:migrate

# 5. Re-run on remote
bun run db:migrate:remote
```

**If application breaks after migration:**

```bash
# 1. Rollback application deployment
vercel promote <previous-deployment-url>

# 2. Revert database schema (if needed)
# Restore from Supabase backup

# 3. Fix issues and redeploy
```

### Monitoring After Migration

**Immediate checks (within 5 minutes):**

```bash
# Check application health
curl https://ui-syncup.com/api/health

# Check database connectivity
psql "$DIRECT_URL" -c "SELECT 1;"

# Check table counts
psql "$DIRECT_URL" -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables;"

# Check for errors in application logs
vercel logs --follow
```

**Extended monitoring (within 30 minutes):**

- Monitor error rates in Vercel Analytics
- Check database CPU and memory usage in Supabase Dashboard
- Verify critical user flows work correctly
- Review slow query logs

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "relation already exists"

**Cause:** Migration already applied or table exists from previous attempt.

**Solution:**

```bash
# Check migration history
psql "$DIRECT_URL" -c "SELECT * FROM drizzle.__drizzle_migrations;"

# If migration is recorded but table doesn't exist, remove the record
psql "$DIRECT_URL" -c "DELETE FROM drizzle.__drizzle_migrations WHERE name = 'XXXX_migration';"

# Re-run migration
bun run db:migrate:remote
```

#### Issue: "password authentication failed"

**Cause:** Incorrect database credentials or expired password.

**Solution:**

```bash
# Verify connection string format
echo $DIRECT_URL

# Test connection manually
psql "$DIRECT_URL" -c "SELECT version();"

# Reset database password in Supabase Dashboard
# Settings → Database → Database password → Reset
```

#### Issue: "connection timeout"

**Cause:** Network issues, firewall, or database overload.

**Solution:**

```bash
# Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# Test connectivity
ping db.[PROJECT-REF].supabase.co

# Try with increased timeout
psql "$DIRECT_URL?connect_timeout=30" -c "SELECT 1;"

# Check if IP is blocked (Supabase Dashboard → Settings → Database → Connection pooling)
```

#### Issue: "too many connections"

**Cause:** Connection pool exhausted.

**Solution:**

```bash
# Use direct connection (not pooled)
# Ensure DIRECT_URL uses port 5432, not 6543

# Check active connections
psql "$DIRECT_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections (if needed)
psql "$DIRECT_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';"
```

#### Issue: "migration out of order"

**Cause:** Migrations applied in wrong order or missing migration.

**Solution:**

```bash
# Check which migrations are applied
psql "$DIRECT_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"

# Check local migration files
ls -la drizzle/

# Apply missing migrations manually
psql "$DIRECT_URL" < drizzle/XXXX_missing_migration.sql

# Record migration in history
psql "$DIRECT_URL" -c "INSERT INTO drizzle.__drizzle_migrations (name, created_at) VALUES ('XXXX_missing_migration', NOW());"
```

#### Issue: "syntax error in SQL"

**Cause:** Invalid SQL in migration file or PostgreSQL version mismatch.

**Solution:**

```bash
# Check PostgreSQL version
psql "$DIRECT_URL" -c "SELECT version();"

# Validate SQL syntax locally
psql "postgresql://localhost:5432/postgres" < drizzle/XXXX_migration.sql

# Fix syntax errors in migration file
# Re-generate migration if needed
bun run db:generate
```

### Getting Help

**Check logs:**

```bash
# Drizzle migration logs
bun run db:migrate:remote 2>&1 | tee migration.log

# Supabase logs
npx supabase logs --db

# Application logs
vercel logs --follow
```

**Useful commands:**

```bash
# Check database size
psql "$DIRECT_URL" -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# List all schemas
psql "$DIRECT_URL" -c "\dn"

# List all tables with row counts
psql "$DIRECT_URL" -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Check table structure
psql "$DIRECT_URL" -c "\d+ users"

# Export schema
pg_dump "$DIRECT_URL" --schema-only > schema.sql
```

**Resources:**

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)

---

## Summary

**Recommended workflow for production:**

1. ✅ Test migrations locally (`bun run db:migrate`)
2. ✅ Deploy code to preview environment
3. ✅ Run migrations on develop database (`bun run db:migrate:remote`)
4. ✅ Test preview deployment thoroughly
5. ✅ Merge to main and deploy to production
6. ✅ Run migrations on production database
7. ✅ Monitor application health and error logs

**Key takeaways:**

- Always test migrations locally first
- Use `DIRECT_URL` for migrations (not pooled connection)
- Keep migrations idempotent (safe to run multiple times)
- Have a rollback plan ready
- Monitor application after migration
- Document any manual steps or special considerations

For questions or issues, refer to the [Troubleshooting](#troubleshooting) section or contact the team.
