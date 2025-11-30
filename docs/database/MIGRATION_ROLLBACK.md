# Database Migration Rollback Guide

This guide provides comprehensive procedures for rolling back database migrations safely and effectively.

---

## 📋 Table of Contents

- [Understanding Rollbacks](#understanding-rollbacks)
- [Rollback Strategies](#rollback-strategies)
- [Manual Rollback Procedures](#manual-rollback-procedures)
- [Rollback Migration Templates](#rollback-migration-templates)
- [Common Rollback Scenarios](#common-rollback-scenarios)
- [Database Backup and Restore](#database-backup-and-restore)
- [Emergency Procedures](#emergency-procedures)

---

## 🎯 Understanding Rollbacks

### What is a Rollback?

A rollback is the process of reverting database schema changes to a previous state. This is necessary when:
- A migration causes application errors
- Data integrity issues are discovered
- Performance problems arise
- Business requirements change

### Automatic vs Manual Rollbacks

**Automatic Rollback (Per-Migration Transaction):**
- Drizzle ORM wraps each migration in a PostgreSQL transaction
- If a migration fails, changes are automatically rolled back
- Database returns to pre-migration state
- Tracking table is NOT updated for failed migration
- **Scope:** Single migration only

**Manual Rollback (Reverting Applied Migrations):**
- Required when a migration succeeds but causes problems later
- Must be performed manually by creating a new "rollback migration"
- Can revert one or multiple migrations
- **Scope:** Any previously applied migration(s)

### Important Principles

1. **Never edit applied migrations** - They're already in the tracking table
2. **Always create forward migrations** - Even for rollbacks
3. **Test rollbacks locally first** - Before applying to production
4. **Coordinate with team** - Rollbacks may affect other developers
5. **Document the reason** - Why the rollback was necessary

---

## 🔄 Rollback Strategies

### Strategy 1: Rollback Migration (Recommended)

Create a new migration that undoes the changes:

**Pros:**
- Maintains migration history
- Can be reviewed and tested
- Works with CI/CD pipeline
- Trackable in version control

**Cons:**
- Requires creating new migration file
- Takes time to deploy through CI/CD

**When to use:**
- Non-urgent rollbacks
- When you want to maintain history
- When changes need review

### Strategy 2: Manual Database Fix + Skip Migration

Fix the database manually and mark migration as applied:

**Pros:**
- Immediate fix
- Useful for emergency situations
- Can fix complex issues

**Cons:**
- Bypasses version control
- Not reproducible
- Can cause inconsistencies across environments

**When to use:**
- Emergency production issues
- Complex data fixes
- One-off corrections

### Strategy 3: Git Revert + Redeploy

Revert the commit and redeploy:

**Pros:**
- Clean git history
- Removes problematic code
- Automatic through CI/CD

**Cons:**
- Migration may already be applied
- Doesn't remove database changes
- May require additional cleanup

**When to use:**
- Migration hasn't been applied yet
- Code and migration both need reverting
- Early in deployment process

---

## 🛠️ Manual Rollback Procedures

### Procedure 1: Simple Rollback Migration

**Use case:** Revert a single, straightforward migration

**Steps:**

1. **Identify the migration to rollback**
   ```bash
   # List recent migrations
   ls -la drizzle/ | tail -5
   
   # View the migration content
   cat drizzle/0010_add_user_bio.sql
   ```

2. **Create rollback migration**
   ```bash
   # Generate timestamp
   TIMESTAMP=$(date +%s)
   
   # Create rollback file
   cat > drizzle/${TIMESTAMP}_rollback_user_bio.sql << 'EOF'
   -- Rollback: Remove user bio column
   -- Reverts: 0010_add_user_bio.sql
   
   ALTER TABLE users DROP COLUMN IF EXISTS bio;
   DROP INDEX IF EXISTS users_bio_idx;
   EOF
   ```

3. **Test locally**
   ```bash
   # Apply rollback
   bun run db:migrate
   
   # Verify in Drizzle Studio
   bun run db:studio
   
   # Check table structure
   # Verify bio column is removed
   ```

4. **Deploy**
   ```bash
   git add drizzle/
   git commit -m "rollback: remove user bio column"
   git push
   ```

### Procedure 2: Multi-Step Rollback

**Use case:** Rollback requires multiple steps or data migration

**Steps:**

1. **Plan the rollback**
   ```
   Original migration added:
   - New column: users.bio
   - Index: users_bio_idx
   - Data: Populated bio from profile table
   
   Rollback needs to:
   - Remove index
   - Remove column
   - (Data is lost, acceptable)
   ```

2. **Create rollback migration**
   ```bash
   TIMESTAMP=$(date +%s)
   cat > drizzle/${TIMESTAMP}_rollback_user_bio_complete.sql << 'EOF'
   -- Rollback: Complete removal of user bio feature
   -- Reverts: 0010_add_user_bio.sql, 0011_populate_user_bio.sql
   
   -- Step 1: Remove index
   DROP INDEX IF EXISTS users_bio_idx;
   
   -- Step 2: Remove column (data will be lost)
   ALTER TABLE users DROP COLUMN IF EXISTS bio;
   
   -- Note: Original data from profile table is preserved
   EOF
   ```

3. **Test and deploy** (same as Procedure 1)

### Procedure 3: Rollback with Data Preservation

**Use case:** Need to rollback but preserve data

**Steps:**

1. **Create backup table**
   ```sql
   -- Create backup before rollback
   CREATE TABLE users_bio_backup AS 
   SELECT id, bio, updated_at 
   FROM users 
   WHERE bio IS NOT NULL;
   ```

2. **Create rollback migration**
   ```bash
   TIMESTAMP=$(date +%s)
   cat > drizzle/${TIMESTAMP}_rollback_user_bio_with_backup.sql << 'EOF'
   -- Rollback: Remove user bio with data backup
   -- Reverts: 0010_add_user_bio.sql
   
   -- Step 1: Backup existing data
   CREATE TABLE IF NOT EXISTS users_bio_backup AS 
   SELECT id, bio, updated_at 
   FROM users 
   WHERE bio IS NOT NULL;
   
   -- Step 2: Remove index
   DROP INDEX IF EXISTS users_bio_idx;
   
   -- Step 3: Remove column
   ALTER TABLE users DROP COLUMN IF EXISTS bio;
   
   -- Note: Data preserved in users_bio_backup table
   -- Can be restored later if needed
   EOF
   ```

3. **Document backup location**
   ```bash
   # Add comment to commit
   git commit -m "rollback: remove user bio (data backed up to users_bio_backup)"
   ```

### Procedure 4: Emergency Manual Rollback

**Use case:** Production is broken, need immediate fix

**Steps:**

1. **Access Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/PROJECT_ID/sql/new
   ```

2. **Execute rollback SQL**
   ```sql
   -- Emergency rollback: Remove problematic column
   BEGIN;
   
   -- Remove index
   DROP INDEX IF EXISTS users_bio_idx;
   
   -- Remove column
   ALTER TABLE users DROP COLUMN IF EXISTS bio;
   
   -- Verify
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'users';
   
   COMMIT;
   ```

3. **Mark migration as "rolled back" in tracking**
   ```sql
   -- Add comment to tracking table
   COMMENT ON TABLE drizzle.__drizzle_migrations IS 
   'Migration 0010_add_user_bio manually rolled back on 2024-01-15';
   ```

4. **Create rollback migration for other environments**
   ```bash
   # Still create migration file for dev/staging
   TIMESTAMP=$(date +%s)
   cat > drizzle/${TIMESTAMP}_rollback_user_bio.sql << 'EOF'
   -- Rollback: Remove user bio column
   -- Already applied manually to production on 2024-01-15
   
   ALTER TABLE users DROP COLUMN IF EXISTS bio;
   DROP INDEX IF EXISTS users_bio_idx;
   EOF
   ```

5. **Document the emergency action**
   ```bash
   # Create incident report
   cat > docs/incidents/2024-01-15-bio-rollback.md << 'EOF'
   # Emergency Rollback: User Bio Column
   
   **Date:** 2024-01-15
   **Environment:** Production
   **Action:** Manual rollback via SQL Editor
   
   ## Issue
   User bio column causing application errors
   
   ## Action Taken
   - Manually dropped bio column and index
   - Created rollback migration for other environments
   
   ## Follow-up
   - [ ] Apply rollback migration to dev/staging
   - [ ] Investigate root cause
   - [ ] Update tests to catch similar issues
   EOF
   ```

---

## 📝 Rollback Migration Templates

### Template 1: Drop Column

```sql
-- Rollback: Remove [column_name] column
-- Reverts: [original_migration_file]
-- Reason: [why rollback is needed]

-- Remove any indexes on the column
DROP INDEX IF EXISTS [table]_[column]_idx;

-- Remove the column
ALTER TABLE [table] DROP COLUMN IF EXISTS [column];

-- Verify
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = '[table]';
```

**Example:**
```sql
-- Rollback: Remove user bio column
-- Reverts: 0010_add_user_bio.sql
-- Reason: Performance issues with full-text search

DROP INDEX IF EXISTS users_bio_idx;
ALTER TABLE users DROP COLUMN IF EXISTS bio;
```

### Template 2: Drop Table

```sql
-- Rollback: Remove [table_name] table
-- Reverts: [original_migration_file]
-- Reason: [why rollback is needed]
-- WARNING: This will delete all data in the table

-- Remove dependent foreign keys first (if any)
ALTER TABLE [dependent_table] 
DROP CONSTRAINT IF EXISTS [fk_constraint_name];

-- Drop indexes
DROP INDEX IF EXISTS [table]_[column]_idx;

-- Drop the table
DROP TABLE IF EXISTS [table] CASCADE;

-- Verify
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public';
```

**Example:**
```sql
-- Rollback: Remove comments table
-- Reverts: 0015_create_comments.sql
-- Reason: Feature postponed to next sprint
-- WARNING: This will delete all comment data

DROP INDEX IF EXISTS comments_user_id_idx;
DROP INDEX IF EXISTS comments_post_id_idx;
DROP TABLE IF EXISTS comments CASCADE;
```

### Template 3: Revert Column Modification

```sql
-- Rollback: Revert [column_name] changes
-- Reverts: [original_migration_file]
-- Reason: [why rollback is needed]

-- Revert data type change
ALTER TABLE [table] 
ALTER COLUMN [column] TYPE [original_type];

-- Revert constraint changes
ALTER TABLE [table] 
ALTER COLUMN [column] DROP NOT NULL;  -- or SET NOT NULL

-- Revert default value
ALTER TABLE [table] 
ALTER COLUMN [column] SET DEFAULT [original_default];  -- or DROP DEFAULT

-- Verify
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = '[table]' AND column_name = '[column]';
```

**Example:**
```sql
-- Rollback: Revert email column changes
-- Reverts: 0012_make_email_required.sql
-- Reason: Breaks existing user import process

ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_email_unique;
```

### Template 4: Remove Foreign Key

```sql
-- Rollback: Remove foreign key constraint
-- Reverts: [original_migration_file]
-- Reason: [why rollback is needed]

-- Remove foreign key constraint
ALTER TABLE [table] 
DROP CONSTRAINT IF EXISTS [fk_constraint_name];

-- Remove index on foreign key column
DROP INDEX IF EXISTS [table]_[column]_idx;

-- Optionally remove the column
-- ALTER TABLE [table] DROP COLUMN IF EXISTS [column];

-- Verify
-- SELECT conname, contype 
-- FROM pg_constraint 
-- WHERE conrelid = '[table]'::regclass;
```

**Example:**
```sql
-- Rollback: Remove project owner foreign key
-- Reverts: 0015_add_project_owner.sql
-- Reason: Owner relationship needs redesign

ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;

DROP INDEX IF EXISTS projects_owner_id_idx;

-- Keep column but make nullable
ALTER TABLE projects 
ALTER COLUMN owner_id DROP NOT NULL;
```

### Template 5: Remove Enum Type

```sql
-- Rollback: Remove enum type
-- Reverts: [original_migration_file]
-- Reason: [why rollback is needed]

-- First, remove column using the enum
ALTER TABLE [table] DROP COLUMN IF EXISTS [column];

-- Then drop the enum type
DROP TYPE IF EXISTS [enum_name];

-- Verify
-- SELECT typname FROM pg_type WHERE typtype = 'e';
```

**Example:**
```sql
-- Rollback: Remove user status enum
-- Reverts: 0014_add_user_status_enum.sql
-- Reason: Status model needs to be more flexible

DROP INDEX IF EXISTS users_status_idx;
ALTER TABLE users DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS user_status;
```

### Template 6: Rollback with Data Backup

```sql
-- Rollback: Remove [feature] with data backup
-- Reverts: [original_migration_file]
-- Reason: [why rollback is needed]
-- Note: Data backed up to [backup_table]

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS [backup_table] AS 
SELECT [columns]
FROM [table]
WHERE [condition];

-- Step 2: Remove indexes
DROP INDEX IF EXISTS [table]_[column]_idx;

-- Step 3: Remove column/table
ALTER TABLE [table] DROP COLUMN IF EXISTS [column];
-- OR: DROP TABLE IF EXISTS [table];

-- Step 4: Add comment for future reference
COMMENT ON TABLE [backup_table] IS 
'Backup created during rollback on [date]. Contains data from [table].[column]';

-- Verify backup
-- SELECT COUNT(*) FROM [backup_table];
```

**Example:**
```sql
-- Rollback: Remove user preferences with backup
-- Reverts: 0020_add_user_preferences.sql
-- Reason: Preferences system being redesigned
-- Note: Data backed up to user_preferences_backup

CREATE TABLE IF NOT EXISTS user_preferences_backup AS 
SELECT user_id, preferences, updated_at
FROM users
WHERE preferences IS NOT NULL;

DROP INDEX IF EXISTS users_preferences_idx;
ALTER TABLE users DROP COLUMN IF EXISTS preferences;

COMMENT ON TABLE user_preferences_backup IS 
'Backup created during rollback on 2024-01-15. Contains user preferences data.';
```

---

## 🎯 Common Rollback Scenarios

### Scenario 1: Rollback Column Addition

**Original Migration:**
```sql
-- 0010_add_user_bio.sql
ALTER TABLE users ADD COLUMN bio TEXT;
CREATE INDEX users_bio_idx ON users(bio);
```

**Rollback Migration:**
```sql
-- 0011_rollback_user_bio.sql
DROP INDEX IF EXISTS users_bio_idx;
ALTER TABLE users DROP COLUMN IF EXISTS bio;
```

**Testing:**
```bash
# Apply original
bun run db:migrate

# Verify column exists
bun run db:studio

# Apply rollback
bun run db:migrate

# Verify column removed
bun run db:studio
```

### Scenario 2: Rollback Table Creation

**Original Migration:**
```sql
-- 0015_create_comments.sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX comments_user_id_idx ON comments(user_id);
```

**Rollback Migration:**
```sql
-- 0016_rollback_comments.sql
DROP INDEX IF EXISTS comments_user_id_idx;
DROP TABLE IF EXISTS comments CASCADE;
```

### Scenario 3: Rollback Column Type Change

**Original Migration:**
```sql
-- 0020_change_email_length.sql
ALTER TABLE users 
ALTER COLUMN email TYPE VARCHAR(500);
```

**Rollback Migration:**
```sql
-- 0021_rollback_email_length.sql
-- Revert email column to original length
-- Note: Will fail if any emails exceed 255 characters

-- Check for long emails first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users WHERE LENGTH(email) > 255
  ) THEN
    RAISE EXCEPTION 'Cannot rollback: Some emails exceed 255 characters';
  END IF;
END $$;

-- Revert type change
ALTER TABLE users 
ALTER COLUMN email TYPE VARCHAR(255);
```

### Scenario 4: Rollback NOT NULL Constraint

**Original Migration:**
```sql
-- 0025_make_bio_required.sql
UPDATE users SET bio = '' WHERE bio IS NULL;
ALTER TABLE users ALTER COLUMN bio SET NOT NULL;
```

**Rollback Migration:**
```sql
-- 0026_rollback_bio_required.sql
ALTER TABLE users ALTER COLUMN bio DROP NOT NULL;
```

### Scenario 5: Rollback Foreign Key Addition

**Original Migration:**
```sql
-- 0030_add_project_owner.sql
ALTER TABLE projects ADD COLUMN owner_id UUID;
UPDATE projects SET owner_id = (SELECT id FROM users LIMIT 1);
ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE projects 
ADD CONSTRAINT projects_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(id);
CREATE INDEX projects_owner_id_idx ON projects(owner_id);
```

**Rollback Migration:**
```sql
-- 0031_rollback_project_owner.sql
DROP INDEX IF EXISTS projects_owner_id_idx;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE projects DROP COLUMN IF EXISTS owner_id;
```

### Scenario 6: Rollback with Data Migration

**Original Migration:**
```sql
-- 0035_split_user_name.sql
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

UPDATE users 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SPLIT_PART(name, ' ', 2)
WHERE name IS NOT NULL;

ALTER TABLE users DROP COLUMN name;
```

**Rollback Migration:**
```sql
-- 0036_rollback_split_user_name.sql
-- Restore original name column from split names

ALTER TABLE users ADD COLUMN name VARCHAR(200);

UPDATE users 
SET name = CONCAT(first_name, ' ', last_name)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;
```

### Scenario 7: Rollback Index Addition

**Original Migration:**
```sql
-- 0040_add_search_indexes.sql
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_name_idx ON users(name);
CREATE INDEX projects_name_idx ON projects(name);
```

**Rollback Migration:**
```sql
-- 0041_rollback_search_indexes.sql
DROP INDEX IF EXISTS users_email_idx;
DROP INDEX IF EXISTS users_name_idx;
DROP INDEX IF EXISTS projects_name_idx;
```

### Scenario 8: Rollback Enum Addition

**Original Migration:**
```sql
-- 0045_add_priority_enum.sql
CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'urgent');

ALTER TABLE issues 
ADD COLUMN priority issue_priority DEFAULT 'medium' NOT NULL;

CREATE INDEX issues_priority_idx ON issues(priority);
```

**Rollback Migration:**
```sql
-- 0046_rollback_priority_enum.sql
DROP INDEX IF EXISTS issues_priority_idx;
ALTER TABLE issues DROP COLUMN IF EXISTS priority;
DROP TYPE IF EXISTS issue_priority;
```

---

## 💾 Database Backup and Restore

### Backup Strategies

#### Strategy 1: Supabase Dashboard Backup

**Use case:** Regular backups, point-in-time recovery

**Steps:**
1. Navigate to Supabase Dashboard
2. Go to Database → Backups
3. Click "Create Backup"
4. Wait for backup to complete
5. Download backup if needed

**Pros:**
- Easy to use
- Automatic daily backups (Pro plan)
- Point-in-time recovery available
- No CLI required

**Cons:**
- Requires dashboard access
- May take time for large databases
- Limited to Supabase features

#### Strategy 2: pg_dump Backup

**Use case:** Manual backups, migration between environments

**Full Database Backup:**
```bash
# Backup entire database
pg_dump "$DIRECT_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
pg_dump "$DIRECT_URL" | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup specific schema
pg_dump "$DIRECT_URL" --schema=public > backup_public_$(date +%Y%m%d_%H%M%S).sql
```

**Table-Specific Backup:**
```bash
# Backup single table
pg_dump "$DIRECT_URL" --table=users > backup_users_$(date +%Y%m%d_%H%M%S).sql

# Backup multiple tables
pg_dump "$DIRECT_URL" --table=users --table=projects > backup_tables_$(date +%Y%m%d_%H%M%S).sql

# Backup data only (no schema)
pg_dump "$DIRECT_URL" --data-only --table=users > backup_users_data_$(date +%Y%m%d_%H%M%S).sql
```

**Schema-Only Backup:**
```bash
# Backup schema structure only
pg_dump "$DIRECT_URL" --schema-only > backup_schema_$(date +%Y%m%d_%H%M%S).sql
```

#### Strategy 3: Selective Data Backup

**Use case:** Backup specific data before risky migration

**SQL Backup:**
```sql
-- Create backup table
CREATE TABLE users_backup_20240115 AS 
SELECT * FROM users;

-- Backup with timestamp
CREATE TABLE users_backup AS 
SELECT *, NOW() as backup_created_at 
FROM users;

-- Backup specific columns
CREATE TABLE users_email_backup AS 
SELECT id, email, updated_at 
FROM users;

-- Backup with condition
CREATE TABLE users_active_backup AS 
SELECT * FROM users 
WHERE status = 'active';
```

### Restore Procedures

#### Restore from pg_dump

**Full Database Restore:**
```bash
# Restore from uncompressed backup
psql "$DIRECT_URL" < backup_20240115_120000.sql

# Restore from compressed backup
gunzip -c backup_20240115_120000.sql.gz | psql "$DIRECT_URL"

# Restore with transaction (safer)
psql "$DIRECT_URL" --single-transaction < backup_20240115_120000.sql
```

**Table-Specific Restore:**
```bash
# Restore single table
psql "$DIRECT_URL" < backup_users_20240115_120000.sql

# Restore with drop existing table
psql "$DIRECT_URL" << 'EOF'
DROP TABLE IF EXISTS users CASCADE;
\i backup_users_20240115_120000.sql
EOF
```

#### Restore from Backup Table

**SQL Restore:**
```sql
-- Restore from backup table
BEGIN;

-- Drop current table
DROP TABLE users CASCADE;

-- Recreate from backup
CREATE TABLE users AS 
SELECT * FROM users_backup_20240115;

-- Recreate constraints and indexes
ALTER TABLE users ADD PRIMARY KEY (id);
CREATE INDEX users_email_idx ON users(email);
-- ... other constraints

COMMIT;
```

**Selective Restore:**
```sql
-- Restore specific rows
BEGIN;

-- Restore deleted users
INSERT INTO users 
SELECT * FROM users_backup_20240115 
WHERE id NOT IN (SELECT id FROM users);

COMMIT;
```

#### Restore from Supabase Backup

**Steps:**
1. Navigate to Supabase Dashboard
2. Go to Database → Backups
3. Find the backup to restore
4. Click "Restore"
5. Confirm restoration
6. Wait for process to complete

**Note:** This will replace the entire database!

### Backup Best Practices

**Before Risky Migrations:**
```bash
# 1. Create backup
pg_dump "$DIRECT_URL" | gzip > pre_migration_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Verify backup
gunzip -c pre_migration_backup_*.sql.gz | head -n 20

# 3. Store backup securely
# Upload to S3, Google Drive, or secure storage

# 4. Run migration
bun run db:migrate

# 5. Verify migration
bun run db:studio

# 6. Keep backup for 30 days
```

**Automated Backup Script:**
```bash
#!/bin/bash
# scripts/backup-db.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup..."
pg_dump "$DIRECT_URL" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created: $BACKUP_FILE ($SIZE)"
else
  echo "❌ Backup failed"
  exit 1
fi

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

echo "✅ Backup complete"
```

---

## 🚨 Emergency Procedures

### Emergency Rollback Checklist

**When production is broken:**

1. **Assess the situation** (2 minutes)
   - [ ] Identify the problematic migration
   - [ ] Determine impact (users affected, data at risk)
   - [ ] Check if automatic rollback occurred
   - [ ] Review error logs

2. **Communicate** (1 minute)
   - [ ] Notify team in Slack/Discord
   - [ ] Update status page if applicable
   - [ ] Assign incident commander

3. **Execute emergency rollback** (5-10 minutes)
   - [ ] Access Supabase SQL Editor
   - [ ] Execute rollback SQL
   - [ ] Verify changes
   - [ ] Test critical functionality

4. **Verify fix** (2 minutes)
   - [ ] Check application is working
   - [ ] Verify no data loss
   - [ ] Monitor error rates

5. **Document** (5 minutes)
   - [ ] Create incident report
   - [ ] Document actions taken
   - [ ] Create rollback migration for other environments

6. **Follow-up** (next day)
   - [ ] Root cause analysis
   - [ ] Update tests
   - [ ] Improve migration process

### Emergency Rollback SQL Template

```sql
-- EMERGENCY ROLLBACK
-- Date: [YYYY-MM-DD HH:MM]
-- Incident: [Brief description]
-- Migration: [migration file name]
-- Executed by: [Your name]

BEGIN;

-- Backup current state (if possible)
CREATE TABLE emergency_backup_[timestamp] AS 
SELECT * FROM [affected_table];

-- Execute rollback
[ROLLBACK SQL HERE]

-- Verify
SELECT COUNT(*) FROM [affected_table];

-- If everything looks good, commit
COMMIT;
-- If something is wrong, ROLLBACK;
```

### Emergency Contacts

**Before emergency:**
- Document who has production database access
- Set up alerting for migration failures
- Create runbook for common issues
- Test emergency procedures

**During emergency:**
- Follow the checklist above
- Don't panic - transactions protect you
- Document everything
- Communicate clearly

**After emergency:**
- Conduct blameless postmortem
- Update procedures
- Improve monitoring
- Add tests to prevent recurrence

---

## 📚 Additional Resources

- [Migration Troubleshooting Guide](./MIGRATION_TROUBLESHOOTING.md) - Error resolution
- [Migration Best Practices](./MIGRATION_BEST_PRACTICES.md) - Prevention strategies
- [CI/CD Setup Guide](../ci-cd/CI_CD_SETUP.md) - Deployment workflow
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html) - Official backup guide

---

## ✅ Rollback Checklist

**Before Rollback:**
- [ ] Identify migration to rollback
- [ ] Understand what changes were made
- [ ] Create backup of current state
- [ ] Test rollback locally
- [ ] Notify team of planned rollback
- [ ] Document reason for rollback

**During Rollback:**
- [ ] Execute rollback migration
- [ ] Monitor for errors
- [ ] Verify database state
- [ ] Test application functionality
- [ ] Check for data integrity issues

**After Rollback:**
- [ ] Verify rollback success
- [ ] Update other environments
- [ ] Document the incident
- [ ] Analyze root cause
- [ ] Update tests/procedures
- [ ] Communicate resolution

---

**Remember:** Rollbacks are a normal part of database management. Having clear procedures and practicing them regularly will make emergency situations much less stressful!
