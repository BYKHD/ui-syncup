# Database Migration Troubleshooting Guide

This guide provides detailed troubleshooting information for the automated Drizzle migration system.

---

## 📋 Table of Contents

- [Error Code Reference](#error-code-reference)
- [Common Error Scenarios](#common-error-scenarios)
- [Log Examples](#log-examples)
- [Recovery Procedures](#recovery-procedures)
- [Prevention Best Practices](#prevention-best-practices)

---

## 🔢 Error Code Reference

### PostgreSQL Error Codes (SQL State)

| Code | Name | Description | Common Causes |
|------|------|-------------|---------------|
| **42601** | Syntax Error | Invalid SQL syntax | Typos, missing keywords, incorrect SQL structure |
| **42P01** | Undefined Table | Table does not exist | Wrong migration order, missing previous migration |
| **42703** | Undefined Column | Column does not exist | Referencing non-existent column, typo in column name |
| **42P07** | Duplicate Table | Table already exists | Migration run twice, missing IF NOT EXISTS |
| **42710** | Duplicate Object | Object already exists | Index/constraint already exists |
| **23505** | Unique Violation | Duplicate key value | Duplicate data, conflicting unique constraint |
| **23503** | Foreign Key Violation | Referenced record missing | Parent record doesn't exist, wrong data order |
| **23502** | Not Null Violation | NULL value in NOT NULL column | Missing required data, incorrect default |
| **23514** | Check Violation | Check constraint failed | Data doesn't meet constraint requirements |
| **08006** | Connection Failure | Database connection lost | Network issue, database down, timeout |
| **28P01** | Invalid Password | Authentication failed | Wrong credentials, expired password |
| **3D000** | Invalid Database | Database does not exist | Wrong database name in connection string |

### Migration System Error Messages

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "DIRECT_URL environment variable is not set" | Missing database connection configuration | Set GitHub secret or .env.local variable |
| "Invalid database URL format" | Malformed connection string | Check URL format: `postgresql://user:pass@host:port/db` |
| "Database connection failed after 3 attempts" | Cannot connect to database | Check network, database status, credentials |
| "Migration file is empty" | No SQL content in migration file | Delete empty file or add SQL statements |
| "Migration file contains only comments" | Only comments, no executable SQL | Add SQL statements or delete file |
| "Invalid naming convention" | Wrong filename format | Rename to `{timestamp}_{description}.sql` |

---

## 🔍 Common Error Scenarios

### Scenario 1: Configuration Errors

#### Missing DIRECT_URL

**Error Log:**
```
❌ DIRECT_URL environment variable is not set. 
Please configure it in your environment or .env.local file.

Troubleshooting:
- Review the error details above and check the migration SQL.
- Ensure the database is accessible and has sufficient resources.
```

**Diagnosis:**
- Environment variable not configured in GitHub Secrets
- Wrong secret name (should be `DEV_DIRECT_URL` or `PROD_DIRECT_URL`)
- Secret not accessible to workflow

**Solution:**
```bash
# Check existing secrets
gh secret list

# Set the correct secret
gh secret set DEV_DIRECT_URL --body "postgresql://postgres:password@host:5432/db"
gh secret set PROD_DIRECT_URL --body "postgresql://postgres:password@host:5432/db"

# Verify in GitHub UI
# Settings → Secrets and variables → Actions
```

#### Invalid Database URL Format

**Error Log:**
```
❌ Invalid database URL format: Invalid URL

Context: Environment validation
Error: Invalid URL
```

**Diagnosis:**
- Missing protocol (`postgresql://`)
- Special characters not URL-encoded
- Missing required components (host, database name)

**Solution:**
```bash
# Correct format
postgresql://user:password@host.supabase.co:5432/postgres

# URL-encode special characters in password
# Example: p@ssw0rd! → p%40ssw0rd%21

# Use online URL encoder or:
python3 -c "import urllib.parse; print(urllib.parse.quote('p@ssw0rd!'))"
```

### Scenario 2: Connection Errors

#### Database Unreachable

**Error Log:**
```
🔌 Testing database connection (attempt 1/3)...
⚠️  Connection attempt 1 failed: connect ETIMEDOUT
⏳ Retrying in 2 seconds...
🔌 Testing database connection (attempt 2/3)...
⚠️  Connection attempt 2 failed: connect ETIMEDOUT
⏳ Retrying in 2 seconds...
🔌 Testing database connection (attempt 3/3)...
⚠️  Connection attempt 3 failed: connect ETIMEDOUT

❌ Database connection failed after 3 attempts: connect ETIMEDOUT

Troubleshooting:
- Connection timeout. Check network connectivity and database availability.
```

**Diagnosis:**
- Database is down or restarting
- Network connectivity issues
- Firewall blocking connection
- IP allowlist restrictions (Supabase)

**Solution:**
1. **Check database status** in Supabase dashboard
2. **Verify network connectivity** from GitHub Actions
3. **Check IP allowlist** (Supabase may block GitHub Actions IPs)
4. **Disable IP restrictions** or add GitHub Actions IP ranges
5. **Re-run workflow** (may be transient)

#### Authentication Failed

**Error Log:**
```
❌ Database connection failed: password authentication failed for user "postgres"

SQL State: 28P01

Troubleshooting:
- Authentication failed. Verify database credentials in DIRECT_URL.
```

**Diagnosis:**
- Wrong password in connection string
- User doesn't exist
- Password expired or changed

**Solution:**
```bash
# Get correct credentials from Supabase
# Project Settings → Database → Connection string

# Update GitHub secret with correct credentials
gh secret set PROD_DIRECT_URL --body "postgresql://correct_user:correct_pass@..."

# Test connection locally first
DIRECT_URL="postgresql://..." bun run db:migrate
```

### Scenario 3: SQL Syntax Errors

#### Syntax Error in Migration

**Error Log:**
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
```

**Diagnosis:**
- Typo in SQL keyword (`CREAT` instead of `CREATE`)
- Missing semicolon
- Incorrect SQL structure

**Solution:**
```bash
# 1. Find the problematic migration
cat drizzle/0005_*.sql

# 2. Fix the syntax error
# Change: CREAT TABLE users ...
# To:     CREATE TABLE users ...

# 3. Test locally
bun run db:push

# 4. Commit and push
git add drizzle/
git commit -m "fix: correct SQL syntax in migration"
git push
```

### Scenario 4: Constraint Violations

#### Unique Constraint Violation

**Error Log:**
```
❌ Migration execution failed:

Error: duplicate key value violates unique constraint "users_email_key"
SQL State: 23505
Constraint: users_email_key
Table: users
Column: email

Troubleshooting:
- Unique constraint violation. Check for duplicate data.
```

**Diagnosis:**
- Attempting to insert duplicate data
- Creating unique constraint on column with duplicates
- Migration run twice (shouldn't happen with tracking)

**Solution:**
```sql
-- Option 1: Clean up duplicates first
DELETE FROM users 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM users 
  GROUP BY email
);

-- Option 2: Use ON CONFLICT
INSERT INTO users (email, name) 
VALUES ('test@example.com', 'Test')
ON CONFLICT (email) DO NOTHING;

-- Option 3: Add IF NOT EXISTS for constraints
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx 
ON users(email);
```

#### Foreign Key Violation

**Error Log:**
```
❌ Migration execution failed:

Error: insert or update on table "posts" violates foreign key constraint "posts_user_id_fkey"
SQL State: 23503
Constraint: posts_user_id_fkey
Table: posts
Column: user_id

Troubleshooting:
- Foreign key constraint violation. Ensure referenced records exist.
```

**Diagnosis:**
- Referenced parent record doesn't exist
- Wrong migration order (child before parent)
- Data migration inserting invalid foreign keys

**Solution:**
```sql
-- Option 1: Ensure parent records exist first
INSERT INTO users (id, email) VALUES (1, 'user@example.com');
INSERT INTO posts (user_id, title) VALUES (1, 'Post Title');

-- Option 2: Use ON DELETE CASCADE
ALTER TABLE posts
ADD CONSTRAINT posts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- Option 3: Check migration order
-- Ensure users table migration runs before posts table migration
```

### Scenario 5: Migration File Issues

#### Empty Migration File

**Error Log:**
```
⚠️  0005_add_feature.sql: Skipping empty migration file

📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 0
   Migrations Skipped: 4
```

**Diagnosis:**
- Migration file has no content
- File was created but not populated
- Schema change didn't generate SQL

**Solution:**
```bash
# 1. Check the file
cat drizzle/0005_add_feature.sql

# 2. If truly empty, delete it
rm drizzle/0005_add_feature.sql

# 3. Regenerate migration
bun run db:generate

# 4. Verify it has content
cat drizzle/0005_*.sql
```

#### Comment-Only Migration

**Error Log:**
```
⚠️  0006_update_schema.sql: Skipping comment-only migration file

📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 0
   Migrations Skipped: 5
```

**Diagnosis:**
- File contains only SQL comments
- No executable SQL statements
- Schema change was reverted before generating

**Solution:**
```bash
# 1. Check the file
cat drizzle/0006_update_schema.sql

# Example of comment-only file:
# -- Migration: Update schema
# -- Generated: 2024-01-15
# (no actual SQL)

# 2. Delete the file
rm drizzle/0006_update_schema.sql

# 3. Make actual schema changes
# Edit src/server/db/schema/*.ts

# 4. Regenerate
bun run db:generate
```

### Scenario 6: Batch Migration Failures

#### First Migration Fails, Rest Skipped

**Error Log:**
```
📦 Applying 3 pending migrations in batch mode...

🛡️  Batch Execution Guarantees:
   ✓ Migrations execute in chronological order (by timestamp)
   ✓ Halt-on-failure: First failure stops subsequent migrations
   ✓ Partial success: Completed migrations remain applied
   ✓ Per-migration progress: Each migration logged individually

❌ Migration execution failed:

🛑 Batch Execution Halted:
   ✓ Subsequent migrations NOT executed (halt-on-failure)
   ✓ Previously successful migrations remain applied
   ✓ Fix the failed migration and re-run to continue

📊 Partial Success: 0 migration(s) completed before failure
```

**Diagnosis:**
- First migration in batch failed
- Remaining migrations were not attempted
- Database is partially updated

**Solution:**
```bash
# 1. Fix the failed migration
# Review error details and fix the SQL

# 2. Test locally
bun run db:push

# 3. Push fix
git add drizzle/
git commit -m "fix: resolve migration issue"
git push

# 4. Workflow will:
#    - Skip already-applied migrations (0 in this case)
#    - Apply the fixed migration
#    - Continue with remaining 2 migrations
```

#### Middle Migration Fails

**Error Log:**
```
📦 Applying 3 pending migrations in batch mode...

❌ Migration execution failed:

🛑 Batch Execution Halted:
   ✓ Subsequent migrations NOT executed (halt-on-failure)
   ✓ Previously successful migrations remain applied
   ✓ Fix the failed migration and re-run to continue

📊 Partial Success: 1 migration(s) completed before failure
```

**Diagnosis:**
- First migration succeeded
- Second migration failed
- Third migration was not attempted

**Solution:**
```bash
# 1. Fix the second migration
# The first migration is already applied and will be skipped

# 2. Test locally (will skip first, apply second and third)
bun run db:push

# 3. Push fix
git add drizzle/
git commit -m "fix: resolve second migration"
git push

# 4. Workflow will:
#    - Skip migration 1 (already applied)
#    - Apply fixed migration 2
#    - Apply migration 3
```

---

## 📝 Log Examples

### Successful Migration (Single)

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
🔌 Testing database connection (attempt 1/3)...
✅ Database connection successful

📂 Step 3: Validating migration files...
📂 Found 5 migration file(s) in ./drizzle
   Total files: 5
   Valid: 5
   Invalid/Skipped: 0

🚀 Step 4: Executing migrations...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Migration execution order (by timestamp):
   1. 0001_create_users.sql (timestamp: 1)
   2. 0002_create_projects.sql (timestamp: 2)
   3. 0003_add_indexes.sql (timestamp: 3)
   4. 0004_add_timestamps.sql (timestamp: 4)
   5. 0005_add_constraints.sql (timestamp: 5)

🔍 Checking migration tracking table...
   Found 4 previously applied migration(s)
   Already applied migrations:
   1. Hash: a1b2c3d4... (applied: 2024-01-15T10:00:00.000Z)
   2. Hash: e5f6g7h8... (applied: 2024-01-15T10:00:05.000Z)
   3. Hash: i9j0k1l2... (applied: 2024-01-15T10:00:10.000Z)
   4. Hash: m3n4o5p6... (applied: 2024-01-15T10:00:15.000Z)

📊 Batch Migration Detection:
   Total migration files: 5
   Already applied: 4
   Pending migrations: 1

📦 Applying 1 pending migration...

🔒 Transaction Atomicity Guarantees:
   ✓ Each migration runs in its own PostgreSQL transaction
   ✓ Success: Changes committed + tracking table updated
   ✓ Failure: Changes rolled back + tracking table unchanged
   ✓ No partial changes: All-or-nothing execution per migration

⚡ Executing migrations with transaction boundaries...

🔍 Verifying migration tracking table...
   Total applied migrations: 5
   Newly applied: 1
   Execution time: 234ms

✅ Successfully Applied Migrations:
   1. Hash: q7r8s9t0... (applied: 2024-01-15T10:00:20.000Z)

✅ Transaction Verification:
   ✓ All 1 migration(s) committed successfully
   ✓ Tracking table updated with 1 new entries
   ✓ Database state is consistent

✅ All migrations completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 1
   Migrations Skipped: 4
   Migrations Failed: 0
   Execution Time: 1234ms
   Environment: Preview
   Branch: develop
   Commit: a1b2c3d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Successful Migration (Batch)

```
📦 Applying 3 pending migrations in batch mode...

🔒 Transaction Atomicity Guarantees:
   ✓ Each migration runs in its own PostgreSQL transaction
   ✓ Success: Changes committed + tracking table updated
   ✓ Failure: Changes rolled back + tracking table unchanged
   ✓ No partial changes: All-or-nothing execution per migration

🛡️  Batch Execution Guarantees:
   ✓ Migrations execute in chronological order (by timestamp)
   ✓ Halt-on-failure: First failure stops subsequent migrations
   ✓ Partial success: Completed migrations remain applied
   ✓ Per-migration progress: Each migration logged individually

⚡ Executing migrations with transaction boundaries...

🔍 Verifying migration tracking table...
   Total applied migrations: 8
   Newly applied: 3
   Execution time: 456ms

✅ Successfully Applied Migrations:
   1. Hash: a1b2c3d4... (applied: 2024-01-15T10:00:25.000Z)
   2. Hash: e5f6g7h8... (applied: 2024-01-15T10:00:26.000Z)
   3. Hash: i9j0k1l2... (applied: 2024-01-15T10:00:27.000Z)

✅ Transaction Verification:
   ✓ All 3 migration(s) committed successfully
   ✓ Tracking table updated with 3 new entries
   ✓ Database state is consistent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ✅ Success
   Migrations Applied: 3
   Migrations Skipped: 5
   Migrations Failed: 0
   Execution Time: 2345ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Failed Migration (Syntax Error)

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
- Review the error details above and check the migration SQL.
- Ensure the database is accessible and has sufficient resources.

::error::Migration failed - see details above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ❌ Failed
   Migrations Applied: 0
   Migrations Skipped: 5
   Migrations Failed: 1
   Execution Time: 1567ms
   Environment: Preview
   Branch: develop
   Commit: a1b2c3d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Failed Migration (Constraint Violation)

```
❌ Migration execution failed:

🔄 Transaction Rollback:
   ✓ Failed migration changes have been rolled back
   ✓ Database returned to pre-migration state
   ✓ Tracking table NOT updated for failed migration
   ✓ No partial changes applied

Context: Migration execution
Error: duplicate key value violates unique constraint "users_email_key"
SQL State: 23505
Constraint: users_email_key
Table: users
Column: email

Troubleshooting:
- Unique constraint violation. Check for duplicate data.
- Review the error details above and check the migration SQL.
- Ensure the database is accessible and has sufficient resources.

::error::Migration failed - see details above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Summary:
   Status: ❌ Failed
   Migrations Applied: 0
   Migrations Skipped: 5
   Migrations Failed: 1
   Execution Time: 1234ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### No Pending Migrations

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

---

## 🔧 Recovery Procedures

### Procedure 1: Fix Failed Migration

```bash
# 1. Identify the failed migration from logs
# Look for the error message and migration file name

# 2. Review the migration file
cat drizzle/XXXX_failed_migration.sql

# 3. Fix the issue
# - Correct SQL syntax
# - Add missing IF NOT EXISTS clauses
# - Fix constraint violations
# - Adjust migration logic

# 4. Test locally
bun run db:push

# 5. Verify the fix
bun run db:studio
# Check that changes are correct

# 6. Commit and push
git add drizzle/
git commit -m "fix: resolve migration issue"
git push

# 7. Monitor workflow
gh run watch
```

### Procedure 2: Rollback Migration

```bash
# Option A: Revert the commit
git log --oneline
git revert <commit-hash>
git push

# Option B: Create rollback migration
cat > drizzle/$(date +%s)_rollback_feature.sql << 'EOF'
-- Rollback: Remove feature table
DROP TABLE IF EXISTS feature_table CASCADE;
DROP INDEX IF EXISTS feature_index;
EOF

git add drizzle/
git commit -m "rollback: remove feature table"
git push

# Option C: Manual database fix + skip migration
# 1. Fix database manually via Supabase SQL Editor
# 2. Add migration to tracking table to skip it
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('migration_hash', EXTRACT(EPOCH FROM NOW()) * 1000);
```

### Procedure 3: Reset and Reapply

```bash
# CAUTION: This destroys all data!
# Only use in development environments

# 1. Backup data if needed
# Via Supabase dashboard: Database → Backups

# 2. Reset database
bun run db:reset

# 3. Reapply all migrations
bun run db:migrate

# 4. Verify schema
bun run db:studio

# 5. Reseed data if needed
bun run db:seed
```

### Procedure 4: Manual Migration Application

```bash
# If automated migration fails repeatedly

# 1. Get the SQL from migration file
cat drizzle/XXXX_migration.sql

# 2. Apply manually via Supabase SQL Editor
# https://supabase.com/dashboard/project/PROJECT_ID/sql/new

# 3. Add to tracking table
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES (
  'hash_from_meta_journal',
  EXTRACT(EPOCH FROM NOW()) * 1000
);

# 4. Verify
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC;
```

---

## 🛡️ Prevention Best Practices

### Before Creating Migrations

✅ **DO:**
- Review schema changes carefully
- Test changes in local development first
- Use meaningful migration names
- Add comments for complex migrations
- Check for breaking changes
- Coordinate with team on schema changes

❌ **DON'T:**
- Make schema changes without migrations
- Skip local testing
- Create migrations for temporary changes
- Modify existing migration files
- Rush migrations to production

### During Migration Creation

✅ **DO:**
- Use `IF NOT EXISTS` for CREATE statements
- Use `IF EXISTS` for DROP statements
- Add default values for new NOT NULL columns
- Create indexes concurrently for large tables
- Test with realistic data volumes
- Review generated SQL before committing

❌ **DON'T:**
- Drop tables or columns without team approval
- Create NOT NULL columns without defaults
- Ignore migration warnings
- Skip SQL review
- Commit untested migrations

### After Migration Creation

✅ **DO:**
- Test migration locally with `bun run db:push`
- Verify schema in Drizzle Studio
- Check migration order and dependencies
- Commit migration files with code changes
- Monitor deployment in GitHub Actions
- Verify production after deployment

❌ **DON'T:**
- Push without local testing
- Ignore validation warnings
- Deploy during peak hours (production)
- Skip monitoring after deployment
- Assume success without verification

### Monitoring and Maintenance

✅ **DO:**
- Monitor GitHub Actions logs
- Check migration tracking table regularly
- Keep migration files organized
- Document complex migrations
- Maintain rollback procedures
- Review failed migrations promptly

❌ **DON'T:**
- Ignore failed migrations
- Let migration files accumulate without review
- Skip documentation for complex changes
- Disable migration validation
- Ignore warning messages

---

## 📚 Additional Resources

- [CI/CD Setup Guide](../ci-cd/CI_CD_SETUP.md) - Complete deployment workflow
- [Drizzle Commands Explained](./DRIZZLE_COMMANDS_EXPLAINED.md) - Drizzle CLI reference
- [Migration System Architecture](./MIGRATION_SYSTEM.md) - System design and architecture
- [Supabase Documentation](https://supabase.com/docs) - Database platform docs
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html) - Complete error code reference

---

**Need Help?**

If you encounter an issue not covered in this guide:
1. Check GitHub Actions logs for detailed error messages
2. Review the migration SQL file for issues
3. Test the migration locally with `bun run db:push`
4. Consult the PostgreSQL error code reference
5. Ask for help with specific error details and context
