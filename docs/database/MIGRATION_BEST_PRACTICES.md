# Database Migration Best Practices

This guide provides best practices for creating, testing, and deploying database migrations safely and effectively.

---

## 📋 Table of Contents

- [Migration Creation](#migration-creation)
- [SQL Best Practices](#sql-best-practices)
- [Testing Strategies](#testing-strategies)
- [Deployment Guidelines](#deployment-guidelines)
- [Common Patterns](#common-patterns)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## 🎯 Migration Creation

### Naming Conventions

**Follow the timestamp-description format:**
```
✅ Good:
0001_create_users_table.sql
0002_add_email_index.sql
0003_add_user_bio_column.sql

❌ Bad:
create_users.sql (missing timestamp)
1_users.sql (timestamp too short)
migration.sql (not descriptive)
```

**Naming Guidelines:**
- Use lowercase with underscores
- Be descriptive but concise
- Indicate the action (create, add, remove, update)
- Include the affected table/feature
- Keep under 50 characters

### Migration Scope

**One logical change per migration:**
```sql
✅ Good: Single focused change
-- 0005_add_user_bio.sql
ALTER TABLE users ADD COLUMN bio TEXT;
CREATE INDEX users_bio_idx ON users(bio);

❌ Bad: Multiple unrelated changes
-- 0005_various_updates.sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE projects ADD COLUMN archived BOOLEAN;
CREATE TABLE comments (...);
```

**Why?**
- Easier to review and understand
- Simpler to rollback if needed
- Clearer git history
- Better error isolation

### Migration Order

**Respect dependencies:**
```sql
✅ Good: Parent tables first
-- 0001_create_users.sql
CREATE TABLE users (...);

-- 0002_create_projects.sql
CREATE TABLE projects (
  user_id UUID REFERENCES users(id)
);

❌ Bad: Child before parent
-- 0001_create_projects.sql
CREATE TABLE projects (
  user_id UUID REFERENCES users(id)  -- users doesn't exist yet!
);
```

---

## 📝 SQL Best Practices

### Use Defensive SQL

**Always use IF NOT EXISTS / IF EXISTS:**
```sql
✅ Good: Idempotent operations
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
ALTER TABLE users DROP COLUMN IF EXISTS old_column;

❌ Bad: Will fail if run twice
CREATE TABLE users (...);
CREATE INDEX users_email_idx ON users(email);
```

### Handle NULL Constraints Carefully

**Provide defaults for new NOT NULL columns:**
```sql
✅ Good: Add column with default
ALTER TABLE users 
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Then optionally remove default if not needed
ALTER TABLE users 
ALTER COLUMN status DROP DEFAULT;

❌ Bad: NOT NULL without default on existing table
ALTER TABLE users 
ADD COLUMN status VARCHAR(20) NOT NULL;  -- Fails if table has rows!
```

### Use Transactions Implicitly

**Drizzle wraps each migration in a transaction automatically:**
```sql
-- No need to add BEGIN/COMMIT
-- Drizzle handles this for you

-- Just write your SQL
CREATE TABLE users (...);
CREATE INDEX users_email_idx ON users(email);

-- If any statement fails, entire migration rolls back
```

### Create Indexes Efficiently

**For large tables, consider concurrent index creation:**
```sql
✅ Good: Non-blocking index creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_idx 
ON users(email);

⚠️  Note: CONCURRENT indexes cannot be in a transaction
-- For production, may need to apply manually
```

**For small tables, regular indexes are fine:**
```sql
✅ Good: Regular index for small tables
CREATE INDEX IF NOT EXISTS projects_name_idx 
ON projects(name);
```

### Handle Data Migrations

**Separate schema and data migrations:**
```sql
✅ Good: Schema migration
-- 0010_add_user_role.sql
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'member';

-- Then data migration if needed
-- 0011_set_admin_roles.sql
UPDATE users 
SET role = 'admin' 
WHERE email IN ('admin@example.com');
```

**Use safe UPDATE patterns:**
```sql
✅ Good: Safe updates with WHERE clause
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@example.com';

❌ Bad: Dangerous update without WHERE
UPDATE users SET role = 'admin';  -- Updates ALL rows!
```

---

## 🧪 Testing Strategies

### Local Testing Workflow

**Always test locally before pushing:**
```bash
# 1. Make schema changes
# Edit src/server/db/schema/*.ts

# 2. Generate migration
bun run db:generate

# 3. Review generated SQL
cat drizzle/XXXX_*.sql

# 4. Apply to local database
bun run db:push

# 5. Verify in Drizzle Studio
bun run db:studio

# 6. Test application functionality
bun run dev
# Test features that use the new schema

# 7. Run tests
bun run test

# 8. Commit if all looks good
git add .
git commit -m "feat: add user bio field"
```

### Test with Realistic Data

**Create test data that matches production:**
```sql
-- Test migration with various scenarios
INSERT INTO users (email, name) VALUES 
  ('test1@example.com', 'Test User 1'),
  ('test2@example.com', 'Test User 2'),
  ('test3@example.com', NULL);  -- Test NULL handling

-- Run migration
bun run db:push

-- Verify results
SELECT * FROM users;
```

### Test Rollback Scenarios

**Ensure you can rollback if needed:**
```bash
# 1. Apply migration
bun run db:push

# 2. Test rollback migration
cat > drizzle/rollback_test.sql << 'EOF'
ALTER TABLE users DROP COLUMN IF EXISTS bio;
EOF

# 3. Apply rollback
bun run db:push

# 4. Verify rollback worked
bun run db:studio
```

---

## 🚀 Deployment Guidelines

### Pre-Deployment Checklist

Before pushing to develop or main:

- [ ] Migration tested locally
- [ ] SQL reviewed for syntax errors
- [ ] Defensive SQL used (IF NOT EXISTS, etc.)
- [ ] No breaking changes without coordination
- [ ] Rollback plan documented
- [ ] Team notified of schema changes
- [ ] Tests passing locally
- [ ] Migration file committed with code changes

### Deployment Timing

**Choose appropriate times:**
```
✅ Good times to deploy:
- During low-traffic periods
- After team coordination
- When you can monitor the deployment
- During business hours (for quick response)

❌ Bad times to deploy:
- During peak traffic
- Right before leaving for the day
- Without team awareness
- During holidays/weekends (production)
```

### Monitor Deployments

**Watch the deployment process:**
```bash
# Monitor GitHub Actions
gh run watch

# Check logs in real-time
gh run view --log

# Verify in Supabase after deployment
# Check migration tracking table
SELECT * FROM drizzle.__drizzle_migrations 
ORDER BY created_at DESC LIMIT 5;
```

### Post-Deployment Verification

**Verify the migration succeeded:**
```sql
-- Check table structure
\d table_name

-- Verify data integrity
SELECT COUNT(*) FROM users WHERE bio IS NULL;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- Verify constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;
```

---

## 🎨 Common Patterns

### Pattern 1: Adding a New Table

```sql
-- 0010_create_comments.sql
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at DESC);
```

### Pattern 2: Adding a Column

```sql
-- 0011_add_user_bio.sql
-- Add column with default for existing rows
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Optionally remove default after adding
ALTER TABLE users 
ALTER COLUMN bio DROP DEFAULT;

-- Add index if needed for searches
CREATE INDEX IF NOT EXISTS users_bio_idx ON users USING gin(to_tsvector('english', bio));
```

### Pattern 3: Modifying a Column

```sql
-- 0012_make_email_required.sql
-- First, ensure no NULL values exist
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE users 
ALTER COLUMN email SET NOT NULL;

-- Add unique constraint if needed
ALTER TABLE users 
ADD CONSTRAINT users_email_unique UNIQUE (email);
```

### Pattern 4: Renaming a Column

```sql
-- 0013_rename_user_name.sql
-- Rename column (safe operation)
ALTER TABLE users 
RENAME COLUMN name TO full_name;

-- Update any dependent indexes
DROP INDEX IF EXISTS users_name_idx;
CREATE INDEX IF NOT EXISTS users_full_name_idx ON users(full_name);
```

### Pattern 5: Adding an Enum Type

```sql
-- 0014_add_user_status_enum.sql
-- Create enum type
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add column using enum
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active' NOT NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
```

### Pattern 6: Adding a Foreign Key

```sql
-- 0015_add_project_owner.sql
-- Add column first
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Set default values for existing rows
UPDATE projects 
SET owner_id = (SELECT id FROM users LIMIT 1)
WHERE owner_id IS NULL;

-- Make NOT NULL after setting values
ALTER TABLE projects 
ALTER COLUMN owner_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE projects 
ADD CONSTRAINT projects_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
```

### Pattern 7: Removing a Column

```sql
-- 0016_remove_old_field.sql
-- Drop column (safe with IF EXISTS)
ALTER TABLE users 
DROP COLUMN IF EXISTS old_field CASCADE;

-- CASCADE will also drop dependent objects (indexes, constraints)
```

### Pattern 8: Creating a Junction Table

```sql
-- 0017_create_project_members.sql
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

-- Add indexes for both directions of lookup
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id);
```

---

## 🚫 Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying Existing Migrations

```sql
❌ Bad: Editing already-applied migration
-- drizzle/0005_create_users.sql (already applied)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),  -- Changed from VARCHAR(200)
  ...
);

✅ Good: Create new migration
-- drizzle/0010_update_email_length.sql
ALTER TABLE users 
ALTER COLUMN email TYPE VARCHAR(255);
```

### Anti-Pattern 2: Dropping Data Without Backup

```sql
❌ Bad: Dropping column without backup
ALTER TABLE users DROP COLUMN important_data;

✅ Good: Backup first, then drop
-- 1. Create backup table
CREATE TABLE users_backup AS SELECT * FROM users;

-- 2. Drop column
ALTER TABLE users DROP COLUMN important_data;

-- 3. Keep backup for a while, then drop
-- DROP TABLE users_backup;  -- After verification period
```

### Anti-Pattern 3: Breaking Changes Without Coordination

```sql
❌ Bad: Removing required column
ALTER TABLE users DROP COLUMN email;  -- App will break!

✅ Good: Multi-step migration
-- Step 1: Make column nullable (deploy app that handles NULL)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Step 2: Deploy app that doesn't use email

-- Step 3: Remove column
ALTER TABLE users DROP COLUMN email;
```

### Anti-Pattern 4: Ignoring Performance

```sql
❌ Bad: No indexes on foreign keys
CREATE TABLE posts (
  user_id UUID REFERENCES users(id)
  -- No index! Queries will be slow
);

✅ Good: Always index foreign keys
CREATE TABLE posts (
  user_id UUID REFERENCES users(id)
);
CREATE INDEX posts_user_id_idx ON posts(user_id);
```

### Anti-Pattern 5: Hardcoding Values

```sql
❌ Bad: Hardcoded IDs
UPDATE users SET role = 'admin' WHERE id = '123e4567-e89b-12d3-a456-426614174000';

✅ Good: Use identifiable criteria
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### Anti-Pattern 6: Complex Logic in Migrations

```sql
❌ Bad: Complex business logic
-- Migrations should be simple schema changes
CREATE OR REPLACE FUNCTION complex_calculation() ...
-- Multiple triggers, procedures, etc.

✅ Good: Keep migrations simple
-- Complex logic belongs in application code
-- Migrations should focus on schema structure
ALTER TABLE users ADD COLUMN calculated_field INTEGER;
-- Let application code handle calculations
```

---

## 📚 Additional Resources

- [Migration Troubleshooting Guide](./MIGRATION_TROUBLESHOOTING.md) - Error resolution
- [CI/CD Setup Guide](../ci-cd/CI_CD_SETUP.md) - Deployment workflow
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview) - ORM reference
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Database reference

---

## ✅ Quick Reference Checklist

**Before Creating Migration:**
- [ ] Schema changes tested locally
- [ ] Migration name is descriptive
- [ ] Dependencies identified
- [ ] Rollback plan considered

**During Migration Creation:**
- [ ] Used IF NOT EXISTS / IF EXISTS
- [ ] Added defaults for NOT NULL columns
- [ ] Created indexes for foreign keys
- [ ] Reviewed generated SQL
- [ ] Added comments for complex changes

**Before Deployment:**
- [ ] Tested locally with realistic data
- [ ] Verified rollback procedure
- [ ] Team notified of changes
- [ ] Tests passing
- [ ] Deployment timing appropriate

**After Deployment:**
- [ ] Monitored GitHub Actions logs
- [ ] Verified migration in tracking table
- [ ] Checked application functionality
- [ ] Confirmed no errors in production
- [ ] Documented any issues

---

**Remember:** Migrations are permanent changes to your database schema. Take time to review, test, and deploy them carefully. When in doubt, ask for a second opinion!
