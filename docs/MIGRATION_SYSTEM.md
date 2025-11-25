# Database Migration System

## Overview

This project uses Drizzle ORM for database migrations with proper tracking to ensure migrations are idempotent and safe for production deployments.

## Migration Commands

```bash
# Generate new migration from schema changes
bun run db:generate

# Apply migrations (production-safe, tracks applied migrations)
bun run db:migrate

# Sync tracking table (one-time fix for existing databases)
bun run db:migrate:sync

# Open Drizzle Studio (database GUI)
bun run db:studio

# Push schema directly (dev only, skips migrations)
bun run db:push
```

## How It Works

### Migration Tracking

- Migrations are tracked in the `drizzle.__drizzle_migrations` table
- Each migration file gets a SHA-256 hash stored in the tracking table
- When you run `bun run db:migrate`, it only applies migrations that haven't been tracked yet
- This makes migrations **idempotent** - safe to run multiple times

### Migration Files

Migration files are stored in `./drizzle/` with sequential naming:
- `0000_strange_reaper.sql` - Initial schema
- `0001_wonderful_triathlon.sql` - Second migration
- etc.

The `drizzle/meta/_journal.json` file tracks metadata about each migration.

## Development Workflow

### Creating a New Migration

1. Update your schema in `src/server/db/schema/`
2. Generate migration:
   ```bash
   bun run db:generate
   ```
3. Review the generated SQL in `drizzle/XXXX_*.sql`
4. Apply locally:
   ```bash
   bun run db:migrate
   ```
5. Test your changes
6. Commit both schema and migration files

### Local Development

For rapid iteration, you can use `db:push` which applies schema changes directly without creating migration files:

```bash
bun run db:push
```

⚠️ **Never use `db:push` in production!** It doesn't track changes and can cause data loss.

## CI/CD Integration

The GitHub Actions workflow automatically:

1. **Syncs tracking table** (if migrations were previously applied without tracking)
2. **Applies new migrations** (only unapplied ones)
3. **Fails deployment** if migrations fail

### Preview Environment (develop, feature branches)

- Uses `DEV_DIRECT_URL` secret
- Runs on every push to non-main branches
- Safe to experiment with schema changes

### Production Environment (main branch)

- Uses `PROD_DIRECT_URL` secret
- Runs only on pushes to `main`
- Requires manual approval in GitHub

## Troubleshooting

### "relation already exists" Error

This happens when migrations were applied using `drizzle-kit migrate` (old method) which doesn't track migrations.

**Fix:**
```bash
bun run db:migrate:sync
```

This script:
1. Checks which tables exist
2. Computes hashes for all migration files
3. Inserts missing records into the tracking table
4. Makes future migrations work correctly

### Migration Fails in CI

1. Check the GitHub Actions logs for the specific error
2. The migration output is captured in `migration-output.txt`
3. Common issues:
   - Missing environment variable (`DIRECT_URL`)
   - Database connection timeout
   - SQL syntax error in migration
   - Conflicting schema changes

### Rolling Back a Migration

Drizzle doesn't support automatic rollbacks. To revert:

1. Create a new migration that undoes the changes:
   ```bash
   # Manually edit schema to revert changes
   bun run db:generate
   ```
2. Or manually write a rollback SQL file and apply it

## Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations locally** before pushing
3. **Keep migrations small** - one logical change per migration
4. **Never edit applied migrations** - create a new one instead
5. **Backup production** before running migrations
6. **Use transactions** - Drizzle wraps migrations in transactions automatically

## Migration Scripts

### `scripts/migrate.ts`

Production-safe migration runner that:
- Uses Drizzle ORM's `migrate()` function
- Tracks applied migrations in `__drizzle_migrations` table
- Provides clear error messages
- Exits with proper status codes for CI

### `scripts/sync-migration-tracking.ts`

One-time sync script that:
- Reads all migration files
- Computes SHA-256 hashes
- Checks which tables exist
- Populates tracking table with already-applied migrations
- Safe to run multiple times (idempotent)

## Environment Variables

- `DIRECT_URL` - Direct PostgreSQL connection string (required for migrations)
- Format: `postgresql://user:password@host:port/database`

## References

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)
