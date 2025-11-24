# 🚀 CI/CD Setup - Complete Guide

This guide explains your complete CI/CD setup for automated database migrations and deployments.

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

❌ **DON'T:**
- Modify existing migration files (create new ones instead)
- Drop tables or columns without team approval
- Skip testing migrations locally
- Deploy migrations without reviewing SQL
- Make breaking changes without coordination

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

## 📚 File Reference

| File | Purpose |
|------|---------|
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Main CI/CD workflow - runs migrations and deploys |
| [`.github/DEPLOYMENT_CHECKLIST.md`](../.github/DEPLOYMENT_CHECKLIST.md) | Pre-deployment checklist |
| [`.github/GITHUB_SECRETS_SETUP.md`](../.github/GITHUB_SECRETS_SETUP.md) | How to configure GitHub secrets |
| [`docs/VERCEL_QUICK_START.md`](./VERCEL_QUICK_START.md) | Quick Vercel integration verification guide |
| [`docs/VERCEL_INTEGRATION_CHECKLIST.md`](./VERCEL_INTEGRATION_CHECKLIST.md) | Detailed Vercel verification checklist |
| [`scripts/verify-vercel-integration.ts`](../scripts/verify-vercel-integration.ts) | Automated Vercel verification script |
| [`drizzle/`](../drizzle/) | Contains all migration SQL files |
| [`src/server/db/schema/`](../src/server/db/schema/) | TypeScript schema definitions |

---

## 🆘 Getting Help

If you run into issues:

1. **Check the logs:**
   - GitHub Actions logs for migration errors
   - Vercel logs for deployment errors
   - Supabase logs for database errors

2. **Common fixes:**
   - Re-run the workflow (sometimes network issues)
   - Verify secrets are set correctly
   - Check database connection strings
   - Ensure database user has proper permissions

3. **Ask for help:**
   - Share error messages from logs
   - Provide context (what you were trying to do)
   - Include relevant migration files

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
bun run verify:vercel         # Verify Vercel integration

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
