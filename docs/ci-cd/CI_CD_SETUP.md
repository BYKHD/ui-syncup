# 🚀 CI/CD Setup - Complete Guide

This guide explains your complete CI/CD setup for automated database migrations and deployments.

---

## 🎯 Production Readiness

Before deploying to production, validate your migration system:

```bash
# Run automated validation
bun run validate:migration-system

# Review production readiness checklist
# docs/ci-cd/PRODUCTION_READINESS_CHECKLIST.md
```

The validation script checks:
- ✅ Environment configuration
- ✅ Migration script functionality
- ✅ GitHub Actions workflow setup
- ✅ Documentation completeness
- ✅ Test coverage

**All checks must pass before production deployment.**

---

## 📖 Overview

Your deployment pipeline works like this:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Developer Workflow                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
  1. Make code changes + schema changes
  2. Generate migration: bun run db:generate
  3. Commit and push to develop branch
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  GitHub Actions (develop branch)                                    │
│  - Runs migrations on DEV database                                  │
│  - Vercel deploys PREVIEW environment                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
  4. Test in preview environment
  5. Create PR: develop → main
  6. Review + Approve
  7. Merge to main
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  GitHub Actions (main branch)                                       │
│  - Runs migrations on PROD database                                 │
│  - Vercel deploys PRODUCTION                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
  8. Verify production deployment
  9. Monitor for issues
```

---

## ⚙️ Initial Setup (One-Time)

### 1. Add GitHub Secrets

Follow the guide: [`.github/GITHUB_SECRETS_SETUP.md`](.github/GITHUB_SECRETS_SETUP.md)

**Quick version:**
```bash
# Using GitHub CLI
gh secret set DEV_DIRECT_URL --body "your-dev-database-url"
gh secret set PROD_DIRECT_URL --body "your-prod-database-url"

# Verify
gh secret list
```

### 2. Verify Vercel Integration

Run the automated verification script:

```bash
bun run verify:vercel
```

Or follow the detailed manual steps:
- **Quick Guide:** [`docs/VERCEL_QUICK_START.md`](./VERCEL_QUICK_START.md)
- **Full Checklist:** [`docs/VERCEL_INTEGRATION_CHECKLIST.md`](./VERCEL_INTEGRATION_CHECKLIST.md)

**Quick verification:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. **Settings** → **Git**
4. Verify:
   - ✅ Production Branch: `main`
   - ✅ Preview Branches: All branches enabled

### 3. Configure Vercel Environment Variables

Your environment variables should already be set, but verify:

**Production (main branch only):**
- `DIRECT_URL` → Your production database URL
- `SUPABASE_URL` → https://nkkwmkrzhilpcxrjqxrb.supabase.co
- All other production variables

**Preview (develop and other branches):**
- `DIRECT_URL` → Your dev database URL
- `SUPABASE_URL` → https://vgmarozegrghrpgopmbs.supabase.co
- All other dev variables

---

## 🔄 Daily Workflow

### Working on New Features

```bash
# 1. Start from develop branch
git checkout develop
git pull origin develop

# 2. Create feature branch (optional)
git checkout -b feature/my-new-feature

# 3. Make your changes (code + database schema if needed)
# Edit: src/server/db/schema/*.ts

# 4. Generate migration if you changed the schema
bun run db:generate

# 5. Test migration locally (recommended)
bun run db:push  # Pushes to your local dev database

# 6. Test your changes
bun run dev
bun run test
bun run typecheck

# 7. Commit your changes
git add .
git commit -m "feat: add new feature with migration"

# 8. Push to GitHub
git push origin feature/my-new-feature
# OR if working directly on develop:
git push origin develop
```

### Testing in Preview Environment

```bash
# 1. Push to develop (triggers preview deployment)
git checkout develop
git merge feature/my-new-feature
git push origin develop

# 2. GitHub Actions will:
#    - Run migrations on DEV database
#    - Vercel creates preview deployment

# 3. Check GitHub Actions progress:
#    Go to: https://github.com/YOUR_USERNAME/ui-syncup/actions

# 4. Get preview URL from:
#    - Vercel dashboard
#    - GitHub Actions deployment log
#    - Or check your PR comments (Vercel bot posts URL)

# 5. Test thoroughly in preview environment
#    - Test all new features
#    - Verify database changes work
#    - Check for any errors
```

### Deploying to Production

```bash
# 1. Create PR from develop to main
gh pr create \
  --base main \
  --head develop \
  --title "Release: [Feature Name]" \
  --body "$(cat .github/DEPLOYMENT_CHECKLIST.md)"

# 2. Review checklist in PR description
#    Go through each item carefully

# 3. Get team approval (if working with a team)

# 4. Merge PR
gh pr merge --squash  # or --merge or --rebase

# 5. Monitor deployment
#    - GitHub Actions: migrations running
#    - Vercel: production deployment

# 6. Verify production
#    - Visit your production URL
#    - Test critical features
#    - Monitor for errors
```

---

## 🗄️ Database Migration Workflow

### Understanding the Migration System

The automated migration system provides:
- **Idempotency**: Safe to run multiple times (skips already-applied migrations)
- **Transaction Atomicity**: Each migration runs in its own transaction (all-or-nothing)
- **Ordering Guarantees**: Migrations execute in chronological order by timestamp
- **Batch Processing**: Multiple pending migrations execute sequentially
- **Halt-on-Failure**: First failure stops subsequent migrations
- **Environment Isolation**: Separate databases for dev/preview and production

### Creating a New Migration

**Example: Adding a new table**

1. **Create schema file:**
```typescript
// src/server/db/schema/projects.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

2. **Export in index:**
```typescript
// src/server/db/schema/index.ts
export * from "./projects";  // Add this line
```

3. **Generate migration:**
```bash
bun run db:generate
# Creates: drizzle/XXXX_migration_name.sql
```

4. **Review generated SQL:**
```bash
cat drizzle/XXXX_*.sql
# Verify it matches your intent
```

5. **Test locally:**
```bash
bun run db:push
# Applies migration to your local dev database
```

### Modifying Existing Tables

**Example: Adding a column**

1. **Update schema:**
```typescript
// src/server/db/schema/users.ts
export const users = pgTable("users", {
  // ... existing columns
  bio: text("bio"),  // New column
});
```

2. **Generate migration:**
```bash
bun run db:generate
```

3. **Review SQL (important!):**
```sql
-- The generated migration should be:
ALTER TABLE "users" ADD COLUMN "bio" text;

-- If it's trying to drop and recreate table, you have a problem!
-- Never allow migrations that drop data.
```

4. **Test locally first:**
```bash
bun run db:push
```

### Migration Best Practices

✅ **DO:**
- Generate migrations for all schema changes
- Test migrations on dev database first
- Make migrations backwards compatible
- Use meaningful migration names
- Review generated SQL before committing
- Commit migration files with your code changes
- Follow naming convention: `{timestamp}_{description}.sql`
- Keep migrations focused (one logical change per migration)
- Add comments in migration SQL for complex changes

❌ **DON'T:**
- Modify existing migration files (create new ones instead)
- Drop tables or columns without team approval
- Skip testing migrations locally
- Deploy migrations without reviewing SQL
- Make breaking changes without coordination
- Create empty migration files
- Use comment-only migration files
- Rename or reorder existing migration files

---

## 🧪 Testing Migrations Before Production

Use this script to test migrations safely:

```bash
# Test on dev database
DIRECT_URL="your-dev-url" bun run db:push

# Verify in Supabase dev studio
# Go to: https://supabase.com/dashboard/project/vgmarozegrghrpgopmbs/editor

# If something went wrong, rollback:
# Create a rollback migration:
bun run db:generate
# Then manually write SQL to revert changes
```

---

## � Troublneshooting Migration Issues

### Common Migration Errors

#### Error: "DIRECT_URL environment variable is not set"

**Cause**: Missing database connection string configuration.

**Solution**:
```bash
# Check if secret is set
gh secret list

# Set the secret
gh secret set DEV_DIRECT_URL --body "postgresql://..."
gh secret set PROD_DIRECT_URL --body "postgresql://..."

# Verify in GitHub Actions
# Settings → Secrets and variables → Actions
```

#### Error: "Database connection failed after 3 attempts"

**Cause**: Network issues, database unavailable, or incorrect credentials.

**Solutions**:
1. **Check database status** in Supabase dashboard
2. **Verify connection string** format: `postgresql://user:pass@host:port/db`
3. **Check IP allowlist** in Supabase (if enabled)
4. **Re-run workflow** (may be transient network issue)

#### Error: "syntax error at or near..." (SQL State: 42601)

**Cause**: Invalid SQL syntax in migration file.

**Solution**:
```bash
# 1. Review the migration file
cat drizzle/XXXX_migration.sql

# 2. Test SQL locally
bun run db:push

# 3. Fix the SQL syntax
# Edit the migration file or regenerate

# 4. Commit and push the fix
git add drizzle/
git commit -m "fix: correct migration SQL syntax"
git push
```

#### Error: "relation does not exist" (SQL State: 42P01)

**Cause**: Migration references a table that doesn't exist yet.

**Solution**:
- Ensure migrations are applied in correct order
- Check if a previous migration failed
- Verify migration timestamps are sequential
- May need to create missing table first

#### Error: "duplicate key value violates unique constraint" (SQL State: 23505)

**Cause**: Attempting to insert duplicate data or create duplicate constraint.

**Solution**:
```sql
-- Option 1: Add IF NOT EXISTS clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_name ON table(column);

-- Option 2: Check for existing data
INSERT INTO table (column) VALUES ('value')
ON CONFLICT (column) DO NOTHING;

-- Option 3: Clean up duplicates first
DELETE FROM table WHERE id NOT IN (
  SELECT MIN(id) FROM table GROUP BY unique_column
);
```

#### Error: "foreign key constraint violation" (SQL State: 23503)

**Cause**: Referenced record doesn't exist or trying to delete referenced record.

**Solution**:
- Ensure parent records exist before creating child records
- Use `ON DELETE CASCADE` or `ON DELETE SET NULL` if appropriate
- Check migration order (create parent tables first)

#### Error: "Migration file is empty" or "contains only comments"

**Cause**: Invalid migration file with no executable SQL.

**Solution**:
```bash
# 1. Check the migration file
cat drizzle/XXXX_migration.sql

# 2. If truly empty, delete it
rm drizzle/XXXX_migration.sql

# 3. Regenerate migration
bun run db:generate

# 4. Verify it has content
cat drizzle/XXXX_migration.sql
```

#### Error: "Invalid naming convention"

**Cause**: Migration file doesn't follow `{timestamp}_{description}.sql` format.

**Solution**:
```bash
# Correct format examples:
# ✅ 0001_create_users.sql
# ✅ 0002_add_email_index.sql
# ❌ create_users.sql (missing timestamp)
# ❌ 1_users.sql (timestamp too short)

# Rename the file to match convention
mv drizzle/bad_name.sql drizzle/0003_descriptive_name.sql
```

### Migration Workflow Failures

#### Scenario: Migration succeeds but deployment fails

**What happened**: Database updated but application deployment failed.

**Impact**: Database is ahead of application code (usually safe).

**Solution**:
1. Fix the deployment issue
2. Re-run the workflow
3. Migration will be skipped (already applied)
4. Deployment will proceed

#### Scenario: Migration fails, subsequent migrations not run

**What happened**: First migration in batch failed, rest were skipped.

**Impact**: Database partially updated, some migrations pending.

**Solution**:
```bash
# 1. Fix the failed migration
# Edit the migration file or schema

# 2. Regenerate if needed
bun run db:generate

# 3. Test locally
bun run db:push

# 4. Push fix
git add .
git commit -m "fix: resolve migration issue"
git push

# 5. Workflow will:
#    - Skip already-applied migrations
#    - Apply the fixed migration
#    - Continue with remaining migrations
```

#### Scenario: Migration applied but not recorded in tracking table

**What happened**: Rare edge case, transaction committed but tracking failed.

**Impact**: Migration will try to run again and may fail.

**Solution**:
```sql
-- Manually add to tracking table via Supabase SQL Editor
-- Get the migration hash from the file
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('migration_hash_here', EXTRACT(EPOCH FROM NOW()) * 1000);
```

### Debugging Tips

#### View Migration Logs

```bash
# GitHub Actions logs
gh run list
gh run view <run-id> --log

# Filter for migration steps
gh run view <run-id> --log | grep -A 20 "database migrations"
```

#### Check Applied Migrations

```sql
-- Via Supabase SQL Editor
SELECT 
  id,
  hash,
  to_timestamp(created_at / 1000) as applied_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

#### Verify Database State

```sql
-- List all tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check table structure
\d table_name

-- View recent changes
SELECT schemaname, tablename, last_vacuum, last_analyze
FROM pg_stat_user_tables
ORDER BY last_analyze DESC NULLS LAST;
```

#### Test Migration Locally

```bash
# 1. Reset local database (CAUTION: destroys data)
bun run db:reset

# 2. Apply all migrations
bun run db:migrate

# 3. Verify schema
bun run db:studio
# Opens Drizzle Studio at http://localhost:4983
```

## 🚨 Emergency Procedures

### Rollback a Failed Migration

**Option 1: Revert the commit**
```bash
# Find the problematic commit
git log --oneline

# Revert it
git revert <commit-hash>
git push origin main
```

**Option 2: Create a rollback migration**
```bash
# Manually create SQL to undo changes
cat > drizzle/rollback_$(date +%s).sql << 'EOF'
-- Rollback migration
DROP TABLE IF EXISTS projects;
EOF

# Apply to production (via Supabase SQL Editor)
# https://supabase.com/dashboard/project/nkkwmkrzhilpcxrjqxrb/sql/new
```

**Option 3: Restore database backup**
```bash
# Contact team lead/DevOps
# Supabase has automatic backups
# Go to: Project Settings → Database → Backups
```

### Rollback a Failed Deployment

```bash
# Via Vercel CLI
vercel rollback

# Or via Vercel dashboard
# Deployments → Find previous good deployment → "..." → Promote to Production
```

---

## 📊 Monitoring & Debugging

### Monitoring and Alerts

For comprehensive monitoring and alerting setup, see:
- **[CI/CD Monitoring Guide](./CI_CD_MONITORING.md)** - Complete monitoring procedures
- **[Alerts Setup Guide](./CI_CD_ALERTS_SETUP.md)** - Configure notifications and alerts
- **[Quick Reference](./CI_CD_MONITORING_QUICK_REFERENCE.md)** - Quick troubleshooting guide

**Quick setup:**
```bash
# Verify status reporting is working
./scripts/verify-ci-status-reporting.sh

# Set up monitoring and alerts
./scripts/setup-monitoring.sh
```

### Check GitHub Actions Logs

```bash
# Via web
# Go to: https://github.com/YOUR_USERNAME/ui-syncup/actions

# Via CLI
gh run list
gh run view <run-id> --log
```

### Check Vercel Deployment Logs

```bash
# Via Vercel CLI
vercel logs

# Or via web dashboard
# https://vercel.com/YOUR_USERNAME/ui-syncup/deployments
```

### Check Database Issues

```bash
# Via Supabase SQL Editor
# Production: https://supabase.com/dashboard/project/nkkwmkrzhilpcxrjqxrb/sql
# Dev: https://supabase.com/dashboard/project/vgmarozegrghrpgopmbs/sql

# Check recent migrations:
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 10;

# Check table structure:
\d your_table_name
```

---

## 🎯 Common Scenarios

### Scenario 1: Hotfix in Production

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Make the fix (minimal changes only)
# If database change needed, generate migration

# 3. Test locally
bun run dev
bun run test

# 4. Push directly to main (skip develop)
git commit -m "hotfix: fix critical bug"
git push origin hotfix/critical-bug

# 5. Create PR to main
gh pr create --base main --head hotfix/critical-bug

# 6. Merge immediately (after quick review)
gh pr merge --squash

# 7. Sync back to develop
git checkout develop
git merge main
git push origin develop
```

### Scenario 2: Multiple Migrations in One Release

```bash
# 1. Work on develop, make multiple changes
git checkout develop

# Change 1: Add projects table
# Edit schema, generate migration
bun run db:generate

# Change 2: Add issues table
# Edit schema, generate migration
bun run db:generate

# 2. You'll have multiple migration files:
# drizzle/0002_add_projects.sql
# drizzle/0003_add_issues.sql

# 3. Test all migrations together locally
bun run db:push

# 4. Push to develop (tests all migrations on dev DB)
git add .
git commit -m "feat: add projects and issues tables"
git push origin develop

# 5. If successful, proceed to production
gh pr create --base main --head develop
```

### Scenario 3: Failed Migration in Production

```bash
# If migration fails, GitHub Actions will stop
# Vercel won't deploy yet (migrations run first)

# 1. Check error in GitHub Actions logs

# 2. Fix the issue:
#    Option A: Fix code and push again
#    Option B: Revert the commit

# 3. If you need to manually fix database:
#    Go to Supabase SQL Editor and fix manually
#    Then re-run the workflow
```

---

## 📖 Error Code Reference

### PostgreSQL Error Codes (SQL State)

Common error codes you may encounter during migrations:

| Code | Name | Description | Solution |
|------|------|-------------|----------|
| **42601** | Syntax Error | Invalid SQL syntax | Review SQL for typos, missing keywords |
| **42P01** | Undefined Table | Table does not exist | Check migration order, ensure dependencies |
| **42703** | Undefined Column | Column does not exist | Verify column name, check previous migrations |
| **42P07** | Duplicate Table | Table already exists | Add IF NOT EXISTS clause |
| **23505** | Unique Violation | Duplicate key value | Clean up duplicates, use ON CONFLICT |
| **23503** | Foreign Key Violation | Referenced record missing | Ensure parent records exist first |
| **23502** | Not Null Violation | NULL in NOT NULL column | Add default value or populate data first |
| **08006** | Connection Failure | Database connection lost | Check network, database status |
| **28P01** | Invalid Password | Authentication failed | Verify credentials in DIRECT_URL |

**Full reference:** [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

### Migration System Exit Codes

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| **0** | Success | All migrations applied successfully |
| **1** | Failure | Migration failed, check logs for details |

### Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "DIRECT_URL environment variable is not set" | Missing configuration | Set GitHub secret: `gh secret set DEV_DIRECT_URL` |
| "Invalid database URL format" | Malformed connection string | Check format: `postgresql://user:pass@host:port/db` |
| "Database connection failed after 3 attempts" | Cannot connect | Check database status, network, credentials |
| "Migration file is empty" | No SQL content | Delete file or add SQL statements |
| "Invalid naming convention" | Wrong filename format | Rename to `{timestamp}_{description}.sql` |

## 📚 File Reference

| File | Purpose |
|------|---------|
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Main CI/CD workflow - runs migrations and deploys |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Quality checks workflow - TypeScript, ESLint, tests, build |
| [`.github/DEPLOYMENT_CHECKLIST.md`](../.github/DEPLOYMENT_CHECKLIST.md) | Pre-deployment checklist |
| [`.github/GITHUB_SECRETS_SETUP.md`](../.github/GITHUB_SECRETS_SETUP.md) | How to configure GitHub secrets |
| [`docs/VERCEL_QUICK_START.md`](./VERCEL_QUICK_START.md) | Quick Vercel integration verification guide |
| [`docs/VERCEL_INTEGRATION_CHECKLIST.md`](./VERCEL_INTEGRATION_CHECKLIST.md) | Detailed Vercel verification checklist |
| [`docs/CI_CD_MONITORING.md`](./CI_CD_MONITORING.md) | Complete monitoring and status reporting guide |
| [`docs/CI_CD_ALERTS_SETUP.md`](./CI_CD_ALERTS_SETUP.md) | Alerts and notifications setup guide |
| [`docs/CI_CD_MONITORING_QUICK_REFERENCE.md`](./CI_CD_MONITORING_QUICK_REFERENCE.md) | Quick reference for monitoring and troubleshooting |
| [`docs/PRODUCTION_READINESS_CHECKLIST.md`](./PRODUCTION_READINESS_CHECKLIST.md) | Complete production readiness validation checklist |
| [`docs/database/MIGRATION_TROUBLESHOOTING.md`](../database/MIGRATION_TROUBLESHOOTING.md) | Comprehensive migration error troubleshooting |
| [`docs/database/MIGRATION_BEST_PRACTICES.md`](../database/MIGRATION_BEST_PRACTICES.md) | Best practices for creating and deploying migrations |
| [`scripts/verify-vercel-integration.ts`](../scripts/verify-vercel-integration.ts) | Automated Vercel verification script |
| [`scripts/validate-migration-system.ts`](../scripts/validate-migration-system.ts) | Automated migration system validation script |
| [`scripts/verify-ci-status-reporting.sh`](../scripts/verify-ci-status-reporting.sh) | Verify workflow status reporting |
| [`scripts/setup-monitoring.sh`](../scripts/setup-monitoring.sh) | Interactive monitoring setup script |
| [`scripts/migrate.ts`](../scripts/migrate.ts) | Migration runner script with validation and error handling |
| [`drizzle/`](../drizzle/) | Contains all migration SQL files |
| [`src/server/db/schema/`](../src/server/db/schema/) | TypeScript schema definitions |

---

## 📋 Migration Log Examples

### Example 1: Successful Single Migration

```
🔄 Starting database migrations...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Migration Context:
   Branch: develop
   Commit: a1b2c3d
   Environment: Preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Step 1: Validating environment...
✅ Environment validated
   Database: vgmarozegrghrpgopmbs.supabase.co

🔌 Step 2: Testing database connectivity...
✅ Database connection successful

📂 Step 3: Validating migration files...
   Total files: 5
   Valid: 5
   Invalid/Skipped: 0

🚀 Step 4: Executing migrations...
📊 Batch Migration Detection:
   Total migration files: 5
   Already applied: 4
   Pending migrations: 1

📦 Applying 1 pending migration...

✅ Successfully Applied Migrations:
   1. Hash: q7r8s9t0... (applied: 2024-01-15T10:00:20.000Z)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 1
   Migrations Skipped: 4
   Migrations Failed: 0
   Execution Time: 1234ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 2: Successful Batch Migration

```
📦 Applying 3 pending migrations in batch mode...

🛡️  Batch Execution Guarantees:
   ✓ Migrations execute in chronological order (by timestamp)
   ✓ Halt-on-failure: First failure stops subsequent migrations
   ✓ Partial success: Completed migrations remain applied

✅ Successfully Applied Migrations:
   1. Hash: a1b2c3d4... (applied: 2024-01-15T10:00:25.000Z)
   2. Hash: e5f6g7h8... (applied: 2024-01-15T10:00:26.000Z)
   3. Hash: i9j0k1l2... (applied: 2024-01-15T10:00:27.000Z)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 3
   Migrations Skipped: 5
   Migrations Failed: 0
   Execution Time: 2345ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 3: Failed Migration (Syntax Error)

```
❌ Migration execution failed:

🔄 Transaction Rollback:
   ✓ Failed migration changes have been rolled back
   ✓ Database returned to pre-migration state
   ✓ Tracking table NOT updated for failed migration
   ✓ No partial changes applied

Context: Migration execution
Error: syntax error at or near "CREAT"
SQL State: 42601
Position: 1

Troubleshooting:
- SQL syntax error. Review the migration SQL for syntax issues.

::error::Migration failed - see details above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ❌ Failed
   Migrations Applied: 0
   Migrations Skipped: 5
   Migrations Failed: 1
   Execution Time: 1567ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 4: Failed Migration (Constraint Violation)

```
❌ Migration execution failed:

🔄 Transaction Rollback:
   ✓ Failed migration changes have been rolled back
   ✓ Database returned to pre-migration state

Context: Migration execution
Error: duplicate key value violates unique constraint "users_email_key"
SQL State: 23505
Constraint: users_email_key
Table: users
Column: email

Troubleshooting:
- Unique constraint violation. Check for duplicate data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ❌ Failed
   Migrations Applied: 0
   Migrations Skipped: 5
   Migrations Failed: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 5: No Pending Migrations

```
🔍 Checking migration tracking table...
   Found 5 previously applied migration(s)

📊 Batch Migration Detection:
   Total migration files: 5
   Already applied: 5
   Pending migrations: 0

✅ No pending migrations to apply. Database is up to date.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 0
   Migrations Skipped: 5
   Migrations Failed: 0
   Execution Time: 567ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🆘 Getting Help

If you run into issues:

1. **Check the logs:**
   - GitHub Actions logs for migration errors
   - Vercel logs for deployment errors
   - Supabase logs for database errors

2. **Review documentation:**
   - [Migration Troubleshooting Guide](../database/MIGRATION_TROUBLESHOOTING.md) - Detailed error resolution
   - [Migration Best Practices](../database/MIGRATION_BEST_PRACTICES.md) - Best practices and patterns
   - [Error Code Reference](#error-code-reference) - Common error codes and solutions

3. **Common fixes:**
   - Re-run the workflow (sometimes network issues)
   - Verify secrets are set correctly
   - Check database connection strings
   - Ensure database user has proper permissions
   - Review migration SQL for syntax errors

4. **Ask for help:**
   - Share error messages from logs
   - Provide context (what you were trying to do)
   - Include relevant migration files
   - Share the migration SQL that failed

---

## ✅ Quick Reference Commands

```bash
# Development
bun run dev                    # Start local dev server
bun run db:generate           # Generate migration from schema changes
bun run db:push               # Push schema to database (dev)
bun run db:migrate            # Run migrations (prod)
bun run test                  # Run tests
bun run typecheck             # Type check

# Validation
bun run verify:vercel         # Verify Vercel integration
bun run validate:migration-system  # Validate migration system readiness

# Git workflow
git checkout develop          # Switch to develop branch
git pull origin develop       # Pull latest changes
git push origin develop       # Push to develop (triggers preview)
git push origin main          # Push to main (triggers production)

# GitHub CLI
gh pr create                  # Create pull request
gh pr merge                   # Merge pull request
gh secret list                # List secrets
gh run list                   # List workflow runs

# Vercel
vercel                        # Deploy current branch
vercel logs                   # View deployment logs
vercel rollback               # Rollback to previous deployment
```

---

**Happy Deploying! 🚀**
