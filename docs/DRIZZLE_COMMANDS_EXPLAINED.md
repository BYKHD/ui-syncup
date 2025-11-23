# Drizzle Database Commands Explained

This guide explains the difference between `db:generate`, `db:migrate`, and `db:push` commands in Drizzle ORM and when to use each one.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Command Details](#command-details)
  - [db:generate](#dbgenerate)
  - [db:migrate](#dbmigrate)
  - [db:push](#dbpush)
- [Visual Comparison](#visual-comparison)
- [When to Use Each Command](#when-to-use-each-command)
- [Real-World Scenarios](#real-world-scenarios)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)

---

## Quick Reference

| Command | Creates Files? | Applies to DB? | Use Case | Commit to Git? |
|---------|---------------|----------------|----------|----------------|
| `bun run db:generate` | ✅ Yes (SQL) | ❌ No | Create migration files from schema changes | ✅ Yes |
| `bun run db:migrate` | ❌ No | ✅ Yes | Apply migration files to database | N/A |
| `bun run db:push` | ❌ No | ✅ Yes | Quick sync schema to database (prototyping) | ❌ No |

**TL;DR:**
- **`generate`** = Convert TypeScript schema → SQL files
- **`migrate`** = Run SQL files → Database
- **`push`** = Sync TypeScript schema → Database (no files)

---

## Command Details

### `db:generate`

**What it does:** Creates migration SQL files from your schema changes

**Command:**
```bash
bun run db:generate
```

**When to use:** After you modify your Drizzle schema files in `src/server/db/schema/`

**Workflow:**
```typescript
// 1. Edit your schema
// src/server/db/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // Add a new column:
  avatar: text('avatar'), // ← NEW
})

// 2. Run generate
// $ bun run db:generate
// Drizzle asks: "What should we name this migration?"
// You type: "add_avatar_column"

// 3. Drizzle creates a new migration file
// drizzle/0002_add_avatar_column.sql
// ALTER TABLE "users" ADD COLUMN "avatar" text;
```

**Output:**
- Creates a new SQL file in `drizzle/` directory
- File naming: `XXXX_description.sql` (e.g., `0002_add_avatar_column.sql`)
- Contains SQL statements to transform database from previous state to new state

**Think of it as:** "Convert my TypeScript schema changes into SQL migration files"

**Example output:**
```bash
$ bun run db:generate

drizzle-kit: v0.31.7
drizzle-orm: v0.44.7

No config path provided, using default 'drizzle.config.ts'
Reading config file '/path/to/project/drizzle.config.ts'

? Migration name (leave blank to use timestamp): › add_avatar_column

✔ Generated migration file: drizzle/0002_add_avatar_column.sql
```

---

### `db:migrate`

**What it does:** Executes migration SQL files against your database

**Command:**
```bash
bun run db:migrate
```

**When to use:** After generating migrations, to apply them to your database

**Workflow:**
```bash
# 1. You have migration files in drizzle/
# drizzle/0000_initial_schema.sql
# drizzle/0001_add_teams.sql
# drizzle/0002_add_avatar_column.sql

# 2. Run migrate
$ bun run db:migrate

# 3. Drizzle:
#    - Reads all .sql files in drizzle/
#    - Checks which ones are already applied (stored in drizzle.__drizzle_migrations table)
#    - Runs only the new ones in order
#    - Records them as applied
```

**Output:**
- Executes SQL against your database
- Creates/updates `drizzle.__drizzle_migrations` table to track applied migrations
- Your database schema now matches your TypeScript schema

**Think of it as:** "Run the SQL migration files against my database"

**Example output:**
```bash
$ bun run db:migrate

drizzle-kit: v0.31.7
drizzle-orm: v0.44.7

No config path provided, using default 'drizzle.config.ts'
Reading config file '/path/to/project/drizzle.config.ts'

Applying migrations...
✔ 0002_add_avatar_column.sql applied successfully

All migrations applied successfully!
```

**Migration tracking table:**
```sql
-- Drizzle creates this table automatically
CREATE TABLE drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);

-- Example data
SELECT * FROM drizzle.__drizzle_migrations;
-- id | hash                              | created_at
-- 1  | 0000_initial_schema               | 1704067200000
-- 2  | 0001_add_teams                    | 1704153600000
-- 3  | 0002_add_avatar_column            | 1704240000000
```

---

### `db:push`

**What it does:** Directly syncs your TypeScript schema to the database WITHOUT creating migration files

**Command:**
```bash
bun run db:push
```

**When to use:** During rapid prototyping or local development when you don't care about migration history

**Workflow:**
```typescript
// 1. Edit your schema
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatar: text('avatar'), // ← NEW
})

// 2. Run push (skips generate step)
$ bun run db:push

// 3. Drizzle:
#    - Compares your TypeScript schema to actual database
#    - Generates SQL on-the-fly
#    - Applies changes immediately
#    - NO migration file created
```

**Output:**
- Database schema updated immediately
- No migration files created
- No migration history tracked
- Changes are applied directly

**Think of it as:** "Just make my database match my schema right now, I don't need migration files"

**Example output:**
```bash
$ bun run db:push

drizzle-kit: v0.31.7
drizzle-orm: v0.44.7

No config path provided, using default 'drizzle.config.ts'
Reading config file '/path/to/project/drizzle.config.ts'

Pulling schema from database...
Comparing schemas...

Changes to be applied:
  ALTER TABLE "users" ADD COLUMN "avatar" text;

? Do you want to apply these changes? › (Y/n)

✔ Changes applied successfully!
```

---

## Visual Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT WORKFLOW                      │
└─────────────────────────────────────────────────────────────┘

Option 1: PRODUCTION-READY (with migration history)
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Edit Schema  │  →   │ db:generate  │  →   │ db:migrate   │
│ (TypeScript) │      │ (Create SQL) │      │ (Run SQL)    │
└──────────────┘      └──────────────┘      └──────────────┘
                             ↓
                      drizzle/0002_xxx.sql
                      (Committed to Git)


Option 2: RAPID PROTOTYPING (no migration history)
┌──────────────┐      ┌──────────────┐
│ Edit Schema  │  →   │  db:push     │
│ (TypeScript) │      │ (Sync Now)   │
└──────────────┘      └──────────────┘
                      (No files created)
```

---

## When to Use Each Command

### Use `db:generate` + `db:migrate` when:

✅ Working on production code  
✅ Need to track schema changes over time  
✅ Working in a team (others need to apply your changes)  
✅ Want to review SQL before applying  
✅ Need rollback capability  
✅ Deploying to staging/production  
✅ Want to maintain migration history  
✅ Need to audit schema changes  

**Example workflow:**
```bash
# 1. Edit schema
vim src/server/db/schema/users.ts

# 2. Generate migration
bun run db:generate
# Drizzle asks: "What should we name this migration?"
# You type: "add_avatar_column"

# 3. Review the generated SQL
cat drizzle/0002_add_avatar_column.sql

# 4. Apply to local database
bun run db:migrate

# 5. Test your changes
bun dev

# 6. Commit migration file
git add drizzle/0002_add_avatar_column.sql
git add src/server/db/schema/users.ts
git commit -m "feat: add avatar column to users"

# 7. Push to remote
git push

# 8. Teammate pulls and runs
git pull
bun run db:migrate  # ← Applies your migration to their database
```

---

### Use `db:push` when:

✅ Rapid prototyping / experimenting  
✅ Local development only  
✅ Don't care about migration history  
✅ Want quick feedback loop  
✅ Schema is still in flux  
✅ Testing different schema designs  
✅ Throwaway experiments  

**Example workflow:**
```bash
# Rapid iteration cycle
vim src/server/db/schema/users.ts  # Add column
bun run db:push                     # Apply immediately
bun dev                             # Test

vim src/server/db/schema/users.ts  # Change column type
bun run db:push                     # Apply immediately
bun dev                             # Test

vim src/server/db/schema/users.ts  # Remove column
bun run db:push                     # Apply immediately
bun dev                             # Test

# Once happy with schema, switch to generate + migrate
bun run db:generate                 # Create migration file
git add drizzle/0002_final_schema.sql
git commit -m "feat: finalize user schema"
```

---

## Real-World Scenarios

### Scenario 1: Adding a new feature (Production-ready)

**Goal:** Add a new `projects` table to the database

```bash
# 1. Create new table in schema
cat > src/server/db/schema/projects.ts << 'EOF'
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { teams } from './teams'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
EOF

# 2. Generate migration
bun run db:generate
# Name: "create_projects_table"

# 3. Review SQL
cat drizzle/0003_create_projects_table.sql
# CREATE TABLE "projects" (
#   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
#   "name" text NOT NULL,
#   "team_id" uuid NOT NULL REFERENCES "teams"("id"),
#   "created_at" timestamp DEFAULT now() NOT NULL
# );

# 4. Apply locally
bun run db:migrate

# 5. Test
bun dev

# 6. Commit
git add drizzle/0003_create_projects_table.sql
git add src/server/db/schema/projects.ts
git commit -m "feat: add projects table"

# 7. Deploy to production
git push origin main
# In production:
DATABASE_URL=$PROD_URL bun run db:migrate
```

---

### Scenario 2: Experimenting with schema (Prototyping)

**Goal:** Try different schema designs quickly

```bash
# Quick iteration without migration files
vim src/server/db/schema/experiments.ts
# Add table with some columns
bun run db:push  # Instant sync

# Try different column types
vim src/server/db/schema/experiments.ts
# Change text to varchar(255)
bun run db:push  # Instant sync

# Add indexes
vim src/server/db/schema/experiments.ts
# Add index on email column
bun run db:push  # Instant sync

# Add relations
vim src/server/db/schema/experiments.ts
# Add foreign key to users
bun run db:push  # Instant sync

# Once satisfied, create proper migration
bun run db:generate
# Name: "create_experiments_table"
bun run db:migrate
git add drizzle/0004_create_experiments_table.sql
git commit -m "feat: add experiments table"
```

---

### Scenario 3: Team collaboration

**Goal:** Share schema changes with team members

**Developer A:**
```bash
# 1. Add new column
vim src/server/db/schema/users.ts
# Add: role: text('role').notNull().default('member')

# 2. Generate migration
bun run db:generate
# Name: "add_role_column"

# 3. Apply locally
bun run db:migrate

# 4. Test
bun dev

# 5. Commit and push
git add drizzle/0005_add_role_column.sql
git add src/server/db/schema/users.ts
git commit -m "feat: add role column to users"
git push
```

**Developer B:**
```bash
# 1. Pull changes
git pull

# 2. Apply migration to local database
bun run db:migrate
# ✅ Database now has role column

# 3. Continue development
bun dev
```

---

### Scenario 4: Fixing a production issue

**Goal:** Add missing index to improve query performance

```bash
# 1. Add index to schema
vim src/server/db/schema/issues.ts
# Add: index('idx_issues_status').on(issues.status)

# 2. Generate migration
bun run db:generate
# Name: "add_status_index"

# 3. Review SQL (important for production!)
cat drizzle/0006_add_status_index.sql
# CREATE INDEX "idx_issues_status" ON "issues" ("status");

# 4. Test locally
bun run db:migrate
bun dev

# 5. Commit
git add drizzle/0006_add_status_index.sql
git add src/server/db/schema/issues.ts
git commit -m "perf: add index on issues.status"
git push

# 6. Deploy to production
# (After code deployment)
DATABASE_URL=$PROD_URL bun run db:migrate
```

---

### Scenario 5: Resetting local database

**Goal:** Start fresh with a clean database

```bash
# Option 1: Using Supabase (recommended)
npx supabase stop
npx supabase start
bun run db:migrate  # Apply all migrations

# Option 2: Using db:push (quick but no history)
# Drop all tables manually or via SQL
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
bun run db:push  # Recreate schema

# Option 3: Using migrations (proper way)
# Drop all tables manually
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
bun run db:migrate  # Apply all migrations in order
```

---

## Common Mistakes

### ❌ Mistake 1: Using `db:push` in production

**Don't do this:**
```bash
# DON'T DO THIS IN PRODUCTION
DATABASE_URL=$PROD_URL bun run db:push
```

**Why it's bad:**
- No migration history
- Can't rollback changes
- Team can't reproduce changes
- No audit trail
- Risky for production data

**Do this instead:**
```bash
# Proper production workflow
bun run db:generate
bun run db:migrate  # Test locally first
DATABASE_URL=$PROD_URL bun run db:migrate  # Then production
```

---

### ❌ Mistake 2: Forgetting to commit migration files

**Don't do this:**
```bash
bun run db:generate
bun run db:migrate
git add src/server/db/schema/users.ts
git commit -m "feat: add column"  # ← Forgot drizzle/*.sql
git push
```

**Why it's bad:**
- Teammates can't apply your schema changes
- Production deployment will fail
- Schema drift between environments

**Do this instead:**
```bash
bun run db:generate
bun run db:migrate
git add src/server/db/schema/users.ts
git add drizzle/0002_add_column.sql  # ← Don't forget this!
git commit -m "feat: add column"
git push
```

---

### ❌ Mistake 3: Editing migration files after applying

**Don't do this:**
```bash
bun run db:migrate                # Applied migration
vim drizzle/0003_xxx.sql          # Edit the SQL
bun run db:migrate                # Won't re-run (already applied)
```

**Why it's bad:**
- Migration already recorded as applied
- Your database doesn't match the migration file
- Other environments will get different schema

**Do this instead:**
```bash
# Create a NEW migration to fix issues
vim src/server/db/schema/users.ts  # Fix schema
bun run db:generate                # Create new migration
# Name: "fix_previous_migration"
bun run db:migrate                 # Apply fix
```

---

### ❌ Mistake 4: Running migrations out of order

**Don't do this:**
```bash
# Apply only specific migration
psql $DATABASE_URL < drizzle/0005_new_feature.sql
# Skip 0003 and 0004
```

**Why it's bad:**
- Migrations may depend on previous changes
- Migration tracking table out of sync
- Schema inconsistencies

**Do this instead:**
```bash
# Always run migrations in order
bun run db:migrate  # Applies all pending migrations
```

---

### ❌ Mistake 5: Not testing migrations locally

**Don't do this:**
```bash
bun run db:generate
git add drizzle/0003_xxx.sql
git commit -m "feat: add table"
git push
# Deploy to production without testing
DATABASE_URL=$PROD_URL bun run db:migrate  # 🔥 Hope it works!
```

**Why it's bad:**
- Migration might fail in production
- Could cause downtime
- Data loss risk

**Do this instead:**
```bash
bun run db:generate
bun run db:migrate  # Test locally first
bun dev             # Verify app works
# Test thoroughly
git add drizzle/0003_xxx.sql
git commit -m "feat: add table"
git push
# Deploy to staging first
DATABASE_URL=$STAGING_URL bun run db:migrate
# Test staging
# Then production
DATABASE_URL=$PROD_URL bun run db:migrate
```

---

## Best Practices

### 1. Local Development Workflow

**For rapid iteration:**
```bash
# Use db:push for quick experiments
bun run db:push
bun dev
# Iterate quickly

# Once schema is stable, create proper migration
bun run db:generate
bun run db:migrate
git add drizzle/*.sql
git commit
```

**For production-ready features:**
```bash
# Always use generate + migrate
bun run db:generate
bun run db:migrate
git add drizzle/*.sql
git commit
```

---

### 2. Migration Naming

**Use descriptive names:**
```bash
# Good names
add_avatar_column
create_projects_table
add_status_index
rename_user_to_account

# Bad names
migration_1
update
fix
changes
```

---

### 3. Review Generated SQL

**Always review before applying:**
```bash
bun run db:generate
# Name: "add_email_unique_constraint"

# Review the SQL
cat drizzle/0007_add_email_unique_constraint.sql
# ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");

# Looks good? Apply it
bun run db:migrate
```

---

### 4. Commit Migration Files

**Always commit migration files with schema changes:**
```bash
git add src/server/db/schema/users.ts
git add drizzle/0008_add_verified_column.sql
git commit -m "feat: add email verification"
```

---

### 5. Test Before Production

**Testing checklist:**
```bash
# 1. Test locally
bun run db:migrate
bun dev
# Test all features

# 2. Test in staging
DATABASE_URL=$STAGING_URL bun run db:migrate
# Run integration tests

# 3. Deploy to production
DATABASE_URL=$PROD_URL bun run db:migrate
# Monitor for issues
```

---

### 6. Keep Migrations Small

**Good: Small, focused migrations**
```bash
# Migration 1: Add column
bun run db:generate  # add_role_column

# Migration 2: Add index
bun run db:generate  # add_role_index

# Migration 3: Add constraint
bun run db:generate  # add_role_check_constraint
```

**Bad: Large, complex migrations**
```bash
# Migration 1: Everything at once
# - Add 5 tables
# - Add 10 columns
# - Add 15 indexes
# - Migrate data
# Hard to debug if something fails!
```

---

### 7. Document Complex Migrations

**Add comments to migration files:**
```sql
-- drizzle/0009_migrate_user_data.sql
-- This migration moves user data from old_users to users table
-- Run during maintenance window (low traffic)
-- Estimated time: 5 minutes for 100k users

BEGIN;

-- Copy data
INSERT INTO users (id, name, email)
SELECT id, name, email FROM old_users;

-- Verify counts match
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM old_users;
  SELECT COUNT(*) INTO new_count FROM users;
  
  IF old_count != new_count THEN
    RAISE EXCEPTION 'Data migration failed: counts do not match';
  END IF;
END $$;

COMMIT;
```

---

### 8. Use Transactions for Safety

**Drizzle migrations run in transactions by default, but be aware:**
```sql
-- Safe: Wrapped in transaction
BEGIN;
ALTER TABLE users ADD COLUMN role text;
ALTER TABLE users ADD COLUMN verified boolean DEFAULT false;
COMMIT;

-- If second statement fails, first is rolled back
```

---

### 9. Backup Before Major Changes

**Before destructive migrations:**
```bash
# Backup production database
pg_dump $PROD_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
DATABASE_URL=$PROD_URL bun run db:migrate

# If something goes wrong, restore
psql $PROD_URL < backup_20240101_120000.sql
```

---

### 10. Monitor After Migration

**Post-migration checklist:**
```bash
# 1. Check application health
curl https://ui-syncup.com/api/health

# 2. Check database connectivity
psql $PROD_URL -c "SELECT 1;"

# 3. Verify table structure
psql $PROD_URL -c "\d users"

# 4. Check row counts
psql $PROD_URL -c "SELECT COUNT(*) FROM users;"

# 5. Monitor error logs
vercel logs --follow

# 6. Check performance metrics
# Monitor response times, error rates
```

---

## Summary

**Key Takeaways:**

1. **`db:generate`** creates SQL migration files from schema changes
2. **`db:migrate`** applies SQL migration files to database
3. **`db:push`** syncs schema directly without creating files

**When to use what:**

- **Production:** Always use `generate` + `migrate`
- **Prototyping:** Use `push` for speed
- **Team work:** Always use `generate` + `migrate` and commit files
- **Experiments:** Use `push`, then `generate` when ready

**Golden Rules:**

✅ Always test migrations locally first  
✅ Review generated SQL before applying  
✅ Commit migration files with schema changes  
✅ Use descriptive migration names  
✅ Keep migrations small and focused  
✅ Never use `db:push` in production  
✅ Always backup before major changes  

---

## Working with Multiple Environments

### Environment Setup

UI SyncUp uses different database environments for different purposes:

| Environment | Database | Purpose | When to Use |
|-------------|----------|---------|-------------|
| **Local** | Local Supabase | Development & experimentation | Daily development, testing features |
| **Remote Dev** | Remote Supabase (develop) | Shared development | Testing with team, integration testing |
| **Staging** | Remote Supabase (staging) | Pre-production testing | Final testing before production |
| **Production** | Remote Supabase (production) | Live application | Production deployments only |

---

### Configuration Files

Create separate environment files for each environment:

```bash
# .env.local (Local Supabase)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY="your-local-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-local-service-role-key"

# .env.develop (Remote Supabase - Develop)
DATABASE_URL="postgresql://postgres.[DEV-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[DEV-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[DEV-REF].supabase.co"
SUPABASE_ANON_KEY="your-dev-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-dev-service-role-key"

# .env.staging (Remote Supabase - Staging)
DATABASE_URL="postgresql://postgres.[STAGING-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[STAGING-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[STAGING-REF].supabase.co"
SUPABASE_ANON_KEY="your-staging-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-staging-service-role-key"

# .env.production (Remote Supabase - Production)
DATABASE_URL="postgresql://postgres.[PROD-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROD-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROD-REF].supabase.co"
SUPABASE_ANON_KEY="your-prod-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-prod-service-role-key"
```

**Add to `.gitignore`:**
```bash
# Environment files (never commit these!)
.env.local
.env.develop
.env.staging
.env.production
```

---

### Helper Scripts

Add environment-specific scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:local": "next dev",
    "dev:remote": "dotenv -e .env.develop -- next dev",
    
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    
    "db:migrate:local": "dotenv -e .env.local -- drizzle-kit migrate",
    "db:migrate:develop": "dotenv -e .env.develop -- drizzle-kit migrate",
    "db:migrate:staging": "dotenv -e .env.staging -- drizzle-kit migrate",
    "db:migrate:production": "dotenv -e .env.production -- drizzle-kit migrate",
    
    "db:push:local": "dotenv -e .env.local -- drizzle-kit push",
    "db:push:develop": "dotenv -e .env.develop -- drizzle-kit push",
    
    "db:studio:local": "dotenv -e .env.local -- drizzle-kit studio",
    "db:studio:develop": "dotenv -e .env.develop -- drizzle-kit studio",
    
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status"
  }
}
```

**Install dotenv-cli:**
```bash
bun add -D dotenv-cli
```

---

### Daily Development Workflow

#### Working with Local Supabase (Recommended for Daily Development)

**Advantages:**
- ✅ Fast iteration (no network latency)
- ✅ Work offline
- ✅ Free to experiment (no cost)
- ✅ Can reset database anytime
- ✅ No impact on team members

**Setup:**
```bash
# 1. Start local Supabase
npx supabase start

# 2. Apply migrations
bun run db:migrate:local

# 3. Start development server
bun dev

# 4. Open Supabase Studio (optional)
# Visit: http://127.0.0.1:54323
```

**Daily workflow:**
```bash
# Morning: Start local Supabase
npx supabase start

# Develop features
vim src/server/db/schema/users.ts
bun run db:push:local  # Quick iteration
bun dev

# Test changes
# ...

# Once stable, create migration
bun run db:generate
bun run db:migrate:local

# Commit
git add drizzle/*.sql
git commit -m "feat: add new feature"

# Evening: Stop local Supabase (optional)
npx supabase stop
```

---

#### Working with Remote Supabase Dev (For Team Collaboration)

**Advantages:**
- ✅ Shared data with team
- ✅ Test integrations with real data
- ✅ Closer to production environment
- ✅ Test with larger datasets

**When to use:**
- Testing features that require shared data
- Integration testing with team members
- Testing with production-like data
- Debugging issues that only occur with real data

**Setup:**
```bash
# 1. Load remote dev environment
export $(cat .env.develop | xargs)

# 2. Start development server
bun run dev:remote

# Or use the script
bun run dev:remote
```

**Workflow:**
```bash
# 1. Develop locally first
npx supabase start
bun run db:migrate:local
bun dev
# Test thoroughly

# 2. Create migration
bun run db:generate
# Name: "add_new_feature"

# 3. Test migration locally
bun run db:migrate:local
bun dev
# Verify everything works

# 4. Apply to remote dev
bun run db:migrate:develop

# 5. Test with remote dev
bun run dev:remote
# Verify with shared data

# 6. Commit and push
git add drizzle/*.sql
git add src/server/db/schema/*.ts
git commit -m "feat: add new feature"
git push

# 7. Notify team
# Post in Slack: "Applied migration to dev: add_new_feature"
```

---

### Real-World Scenarios (Following Best Practices)

#### Scenario 1: Adding a New Feature (Full Workflow)

**Goal:** Add a new `comments` table with proper workflow

**Step 1: Local Development**
```bash
# 1. Start local Supabase
npx supabase start

# 2. Create schema
cat > src/server/db/schema/comments.ts << 'EOF'
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { issues } from './issues'
import { users } from './users'

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
EOF

# 3. Quick iteration with push
bun run db:push:local
bun dev
# Test the feature

# 4. Make adjustments
vim src/server/db/schema/comments.ts
# Add index on issueId for performance
bun run db:push:local
bun dev
# Test again
```

**Step 2: Create Proper Migration**
```bash
# 1. Generate migration
bun run db:generate
# Name: "create_comments_table"

# 2. Review SQL
cat drizzle/0010_create_comments_table.sql

# 3. Apply to local
bun run db:migrate:local

# 4. Test thoroughly
bun dev
# Test all comment features
# - Create comment
# - Edit comment
# - Delete comment
# - List comments
```

**Step 3: Test with Remote Dev**
```bash
# 1. Apply migration to remote dev
bun run db:migrate:develop

# 2. Test with remote dev environment
bun run dev:remote

# 3. Test with shared data
# - Create comments on existing issues
# - Test with multiple users
# - Verify permissions work correctly
```

**Step 4: Code Review & Commit**
```bash
# 1. Commit changes
git add src/server/db/schema/comments.ts
git add drizzle/0010_create_comments_table.sql
git commit -m "feat: add comments table and API"

# 2. Push and create PR
git push origin feature/add-comments
gh pr create --title "Add comments feature" --body "Adds comments table and API endpoints"

# 3. Notify team
# Slack: "PR ready for review. Migration applied to dev environment."
```

**Step 5: Deploy to Staging**
```bash
# After PR approval and merge to develop branch

# 1. Apply migration to staging
bun run db:migrate:staging

# 2. Deploy code to staging (Vercel automatic)
# Wait for deployment to complete

# 3. Test on staging
# Visit: https://staging-ui-syncup.vercel.app
# Test all comment features

# 4. Run integration tests
bun run test:ui
```

**Step 6: Deploy to Production**
```bash
# After staging tests pass

# 1. Merge to main
git checkout main
git merge develop
git push origin main

# 2. Apply migration to production
bun run db:migrate:production

# 3. Monitor deployment
# Watch Vercel deployment
# Monitor error logs
# Check application health

# 4. Verify in production
curl https://ui-syncup.com/api/health
# Test comment features
```

---

#### Scenario 2: Fixing a Bug in Production

**Goal:** Add missing index causing slow queries

**Step 1: Reproduce Locally**
```bash
# 1. Start local Supabase
npx supabase start

# 2. Apply all migrations to match production
bun run db:migrate:local

# 3. Reproduce the issue
bun dev
# Test slow query
# Confirm it's slow without index
```

**Step 2: Fix Locally**
```bash
# 1. Add index to schema
vim src/server/db/schema/issues.ts
# Add: index('idx_issues_project_status').on(issues.projectId, issues.status)

# 2. Generate migration
bun run db:generate
# Name: "add_project_status_index"

# 3. Review SQL
cat drizzle/0011_add_project_status_index.sql
# CREATE INDEX "idx_issues_project_status" ON "issues" ("project_id", "status");

# 4. Apply locally
bun run db:migrate:local

# 5. Test performance improvement
bun dev
# Verify query is now fast
```

**Step 3: Fast-Track to Production**
```bash
# For critical performance fixes, skip staging

# 1. Commit
git add src/server/db/schema/issues.ts
git add drizzle/0011_add_project_status_index.sql
git commit -m "perf: add index on issues(project_id, status)"

# 2. Push to main (hotfix)
git push origin main

# 3. Apply to production immediately
bun run db:migrate:production

# 4. Monitor
# Watch query performance
# Check error rates
# Verify improvement

# 5. Backport to other environments
bun run db:migrate:develop
bun run db:migrate:staging
```

---

#### Scenario 3: Data Migration (Complex)

**Goal:** Migrate user roles from string to enum

**Step 1: Plan Migration**
```bash
# Create migration plan document
cat > docs/migrations/0012_migrate_user_roles.md << 'EOF'
# Migration: User Roles to Enum

## Current State
- roles stored as text: 'owner', 'admin', 'member', 'viewer'
- No constraints, allows invalid values

## Target State
- roles stored as enum: user_role
- Enforced at database level

## Steps
1. Create enum type
2. Add new column with enum type
3. Migrate data from old column to new
4. Verify data integrity
5. Drop old column
6. Rename new column

## Rollback Plan
- Keep old column until verified
- Can rollback by dropping new column

## Estimated Time
- 100k users: ~30 seconds
- Downtime: None (additive changes)
EOF
```

**Step 2: Test Locally**
```bash
# 1. Create migration
cat > drizzle/0012_migrate_user_roles.sql << 'EOF'
-- Step 1: Create enum type
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Step 2: Add new column
ALTER TABLE users ADD COLUMN role_new user_role;

-- Step 3: Migrate data
UPDATE users SET role_new = role::user_role WHERE role IS NOT NULL;

-- Step 4: Verify counts match
DO $$
DECLARE
  total_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM users WHERE role IS NOT NULL;
  SELECT COUNT(*) INTO migrated_count FROM users WHERE role_new IS NOT NULL;
  
  IF total_count != migrated_count THEN
    RAISE EXCEPTION 'Migration failed: counts do not match (% vs %)', total_count, migrated_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: % users migrated', migrated_count;
END $$;

-- Step 5: Drop old column
ALTER TABLE users DROP COLUMN role;

-- Step 6: Rename new column
ALTER TABLE users RENAME COLUMN role_new TO role;

-- Step 7: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
EOF

# 2. Apply to local
bun run db:migrate:local

# 3. Verify
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT role, COUNT(*) FROM users GROUP BY role;"

# 4. Test application
bun dev
# Verify all role-based features work
```

**Step 3: Test with Remote Dev**
```bash
# 1. Apply to remote dev
bun run db:migrate:develop

# 2. Test with real data
bun run dev:remote

# 3. Verify data integrity
psql "$DEVELOP_DIRECT_URL" -c "SELECT role, COUNT(*) FROM users GROUP BY role;"

# 4. Test all role-based features
# - Owner permissions
# - Admin permissions
# - Member permissions
# - Viewer permissions
```

**Step 4: Deploy to Staging**
```bash
# 1. Apply to staging
bun run db:migrate:staging

# 2. Run full test suite
bun run test:ui

# 3. Manual testing
# Test all user flows
# Verify no regressions
```

**Step 5: Deploy to Production**
```bash
# 1. Schedule maintenance window (optional)
# For large tables, notify users

# 2. Backup production database
# Supabase does this automatically, but verify

# 3. Apply migration
bun run db:migrate:production

# 4. Monitor closely
# Watch error logs
# Check query performance
# Verify user reports

# 5. Verify data
psql "$PRODUCTION_DIRECT_URL" -c "SELECT role, COUNT(*) FROM users GROUP BY role;"
```

---

#### Scenario 4: Team Member Onboarding

**Goal:** Help new team member set up their development environment

**Step 1: Clone Repository**
```bash
# 1. Clone repo
git clone https://github.com/your-org/ui-syncup.git
cd ui-syncup

# 2. Install dependencies
bun install
```

**Step 2: Set Up Local Supabase**
```bash
# 1. Start local Supabase
npx supabase start

# 2. Copy environment template
cp .env.example .env.local

# 3. Update .env.local with local Supabase credentials
# Get credentials from: npx supabase status
vim .env.local

# 4. Apply all migrations
bun run db:migrate:local

# 5. Verify setup
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\dt"
```

**Step 3: Test Local Development**
```bash
# 1. Start development server
bun dev

# 2. Open browser
# Visit: http://localhost:3000

# 3. Test basic features
# - Sign up
# - Create team
# - Create project
# - Create issue
```

**Step 4: Set Up Remote Dev Access (Optional)**
```bash
# 1. Get remote dev credentials from team lead
# Team lead shares .env.develop (via 1Password or similar)

# 2. Save to .env.develop
vim .env.develop

# 3. Test remote dev connection
bun run dev:remote

# 4. Verify can connect to shared data
# Visit: http://localhost:3000
# Should see shared team data
```

**Step 5: Make First Contribution**
```bash
# 1. Create feature branch
git checkout -b feature/my-first-feature

# 2. Make changes
vim src/features/issues/components/issue-card.tsx

# 3. Test locally
bun dev

# 4. Commit and push
git add .
git commit -m "feat: improve issue card UI"
git push origin feature/my-first-feature

# 5. Create PR
gh pr create --title "Improve issue card UI"
```

---

#### Scenario 5: Debugging Production Issue Locally

**Goal:** Reproduce and fix a production bug locally

**Step 1: Get Production Data (Anonymized)**
```bash
# 1. Export anonymized data from production
# (Team lead or DevOps does this)
pg_dump "$PRODUCTION_DIRECT_URL" \
  --data-only \
  --table=issues \
  --table=projects \
  --table=teams \
  > production_data_anonymized.sql

# 2. Anonymize sensitive data
sed -i 's/user@example.com/test@example.com/g' production_data_anonymized.sql
sed -i 's/John Doe/Test User/g' production_data_anonymized.sql
```

**Step 2: Load Data Locally**
```bash
# 1. Start local Supabase
npx supabase start

# 2. Apply migrations
bun run db:migrate:local

# 3. Import anonymized data
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" < production_data_anonymized.sql

# 4. Verify data loaded
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT COUNT(*) FROM issues;"
```

**Step 3: Reproduce Issue**
```bash
# 1. Start development server
bun dev

# 2. Follow reproduction steps from bug report
# - Navigate to specific project
# - Perform specific action
# - Observe error

# 3. Check logs
# Look for error messages
# Identify root cause
```

**Step 4: Fix and Test**
```bash
# 1. Fix the bug
vim src/features/issues/api/update-issue.ts

# 2. Test fix locally
bun dev
# Verify bug is fixed

# 3. Run tests
bun run test

# 4. Commit fix
git add .
git commit -m "fix: resolve issue update bug"
git push
```

**Step 5: Deploy Fix**
```bash
# 1. Create PR
gh pr create --title "Fix issue update bug"

# 2. After approval, merge
gh pr merge

# 3. Deploy to production
# Vercel automatic deployment

# 4. Verify fix in production
# Test the specific scenario
# Monitor error logs
```

---

### Environment Switching Best Practices

#### Quick Environment Switching

Create a helper script `scripts/switch-env.sh`:

```bash
#!/bin/bash

ENV=$1

if [ -z "$ENV" ]; then
  echo "Usage: ./scripts/switch-env.sh [local|develop|staging|production]"
  exit 1
fi

case $ENV in
  local)
    cp .env.local .env
    echo "✅ Switched to LOCAL environment"
    echo "📍 Database: Local Supabase (127.0.0.1:54322)"
    ;;
  develop)
    cp .env.develop .env
    echo "✅ Switched to DEVELOP environment"
    echo "📍 Database: Remote Supabase (develop)"
    ;;
  staging)
    cp .env.staging .env
    echo "✅ Switched to STAGING environment"
    echo "📍 Database: Remote Supabase (staging)"
    ;;
  production)
    echo "⚠️  WARNING: Switching to PRODUCTION environment"
    echo "⚠️  This should only be used for read-only operations"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      cp .env.production .env
      echo "✅ Switched to PRODUCTION environment"
      echo "📍 Database: Remote Supabase (production)"
    else
      echo "❌ Cancelled"
      exit 1
    fi
    ;;
  *)
    echo "❌ Invalid environment: $ENV"
    echo "Valid options: local, develop, staging, production"
    exit 1
    ;;
esac
```

**Usage:**
```bash
chmod +x scripts/switch-env.sh

# Switch to local
./scripts/switch-env.sh local
bun dev

# Switch to remote dev
./scripts/switch-env.sh develop
bun dev

# Switch back to local
./scripts/switch-env.sh local
bun dev
```

---

#### Environment Verification

Create a helper script `scripts/verify-env.ts`:

```typescript
import { config } from 'dotenv'

config({ path: '.env' })

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
}

console.log('🔍 Current Environment Configuration:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (env.DATABASE_URL?.includes('127.0.0.1')) {
  console.log('📍 Environment: LOCAL')
  console.log('🗄️  Database: Local Supabase')
  console.log('🔗 URL:', env.SUPABASE_URL)
} else if (env.SUPABASE_URL?.includes('supabase.co')) {
  const projectRef = env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  console.log('📍 Environment: REMOTE')
  console.log('🗄️  Database: Remote Supabase')
  console.log('🔗 Project:', projectRef)
  console.log('🔗 URL:', env.SUPABASE_URL)
} else {
  console.log('⚠️  Environment: UNKNOWN')
  console.log('⚠️  Please check your .env file')
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
```

**Usage:**
```bash
# Check current environment
bun run scripts/verify-env.ts

# Output:
# 🔍 Current Environment Configuration:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📍 Environment: LOCAL
# 🗄️  Database: Local Supabase
# 🔗 URL: http://127.0.0.1:54321
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Safety Checklist

Before running commands against remote environments:

**Pre-flight Checklist:**
```bash
# 1. Verify environment
bun run scripts/verify-env.ts

# 2. Confirm you're in the right environment
echo $DATABASE_URL

# 3. For production, double-check
if [[ $DATABASE_URL == *"production"* ]]; then
  echo "⚠️  WARNING: You are about to modify PRODUCTION"
  echo "⚠️  Press Ctrl+C to cancel, or Enter to continue"
  read
fi

# 4. Run command
bun run db:migrate
```

---

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle Migrations Guide](https://orm.drizzle.team/docs/migrations)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

For questions or issues, refer to the main [SUPABASE_LOCAL_SETUP.md](./SUPABASE_LOCAL_SETUP.md) or [REMOTE_DATABASE_SETUP.md](./REMOTE_DATABASE_SETUP.md) documentation.
