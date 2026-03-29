/**
 * Integration tests for database migration runner
 * 
 * Tests end-to-end migration flows using PGlite (WASM-based PostgreSQL).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { randomUUID } from 'crypto';

// ============================================================================
// Test Database Setup
// ============================================================================

interface TestDbContext {
  client: PGlite;
  db: ReturnType<typeof drizzle>;
  cleanup: () => Promise<void>;
}

async function createTestDatabase(): Promise<TestDbContext> {
  const client = new PGlite();
  await client.waitReady;
  
  const db = drizzle(client);

  const cleanup = async () => {
    await client.close();
  };

  return { client, db, cleanup };
}

// ============================================================================
// Test Fixtures
// ============================================================================

interface MigrationFile {
  filename: string;
  content: string;
}

const createMigrationFixture = (timestamp: number, name: string, sql: string): MigrationFile => ({
  filename: `${String(timestamp).padStart(4, '0')}_${name}.sql`,
  content: sql,
});

// Valid migration fixtures
const VALID_MIGRATIONS: MigrationFile[] = [
  createMigrationFixture(1, 'create_users', `
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT now()
    );
  `),
  createMigrationFixture(2, 'create_posts', `
    CREATE TABLE posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `),
  createMigrationFixture(3, 'add_users_index', `
    CREATE INDEX idx_users_email ON users(email);
  `),
];

// Invalid migration fixtures
const INVALID_MIGRATION = createMigrationFixture(4, 'invalid_syntax', `
  CREAT TABLE invalid (
    id UUID PRIMARY KEY
  );
`);


// ============================================================================
// Helper Functions
// ============================================================================

async function applyMigration(client: PGlite, migration: MigrationFile): Promise<void> {
  await client.exec(migration.content);
}

async function createTrackingTable(client: PGlite): Promise<void> {
  await client.exec(`
    CREATE SCHEMA IF NOT EXISTS drizzle;
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);
}

async function getAppliedMigrations(client: PGlite): Promise<Array<{ hash: string; created_at: string }>> {
  try {
    const result = await client.query(`
      SELECT hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at ASC
    `);
    return result.rows as Array<{ hash: string; created_at: string }>;
  } catch {
    return [];
  }
}

async function recordMigration(client: PGlite, hash: string): Promise<void> {
  await client.exec(`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('${hash}', ${Date.now()})
  `);
}

function generateMigrationHash(content: string): string {
  // Simple hash for testing (in real implementation, Drizzle uses a proper hash)
  return Buffer.from(content).toString('base64').substring(0, 32);
}

async function tableExists(client: PGlite, tableName: string): Promise<boolean> {
  try {
    await client.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function getTableCount(client: PGlite): Promise<number> {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  return result.rows.length;
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Migration Runner - Integration Tests', () => {
  let testDb: TestDbContext;

  beforeEach(async () => {
    testDb = await createTestDatabase();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('Happy Path - Multiple migrations execute successfully', () => {
    test('should apply all pending migrations in order', async () => {
      // Setup: Create tracking table
      await createTrackingTable(testDb.client);

      // Execute: Apply migrations in order
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
      }

      // Verify: All migrations are tracked
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(VALID_MIGRATIONS.length);

      // Verify: Tables were created
      expect(await tableExists(testDb.client, 'users')).toBe(true);
      expect(await tableExists(testDb.client, 'posts')).toBe(true);

      // Verify: Foreign key relationship works
      const userId = randomUUID();
      await testDb.client.exec(`
        INSERT INTO users (id, email) VALUES ('${userId}', 'test@example.com');
        INSERT INTO posts (user_id, title) VALUES ('${userId}', 'Test Post');
      `);

      const posts = await testDb.client.query('SELECT * FROM posts');
      expect(posts.rows.length).toBe(1);
    });

    test('should execute migrations in chronological order by timestamp', async () => {
      await createTrackingTable(testDb.client);

      // Shuffle migrations to simulate different filesystem ordering
      const shuffled = [...VALID_MIGRATIONS].sort(() => Math.random() - 0.5);

      // Sort by timestamp (simulating migration system behavior)
      const sorted = [...shuffled].sort((a, b) => {
        const timestampA = parseInt(a.filename.match(/^(\d{4})_/)?.[1] || '0');
        const timestampB = parseInt(b.filename.match(/^(\d{4})_/)?.[1] || '0');
        return timestampA - timestampB;
      });

      // Apply in sorted order
      for (const migration of sorted) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
      }

      // Verify: Migrations were applied in correct order
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(VALID_MIGRATIONS.length);

      // Verify: Dependencies work (posts table depends on users table)
      expect(await tableExists(testDb.client, 'users')).toBe(true);
      expect(await tableExists(testDb.client, 'posts')).toBe(true);
    });

    test('should report correct count of applied migrations', async () => {
      await createTrackingTable(testDb.client);

      let appliedCount = 0;

      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
        appliedCount++;
      }

      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(appliedCount);
      expect(appliedCount).toBe(VALID_MIGRATIONS.length);
    });
  });

  describe('Partial Failure - First succeeds, second fails, third does not run', () => {
    test('should halt execution after first failure', async () => {
      await createTrackingTable(testDb.client);

      const migrations = [
        VALID_MIGRATIONS[0], // Should succeed
        INVALID_MIGRATION,   // Should fail
        VALID_MIGRATIONS[1], // Should not run
      ];

      let failedMigrationIndex = -1;

      // Execute migrations with halt-on-failure
      for (let i = 0; i < migrations.length; i++) {
        const migration = migrations[i];
        try {
          await applyMigration(testDb.client, migration);
          const hash = generateMigrationHash(migration.content);
          await recordMigration(testDb.client, hash);
        } catch {
          failedMigrationIndex = i;
          break; // Halt on failure
        }
      }

      // Verify: Failure occurred at expected index
      expect(failedMigrationIndex).toBe(1);

      // Verify: Only first migration was tracked
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(1);

      // Verify: First migration's table exists
      expect(await tableExists(testDb.client, 'users')).toBe(true);

      // Verify: Third migration's table does not exist
      expect(await tableExists(testDb.client, 'posts')).toBe(false);
    });

    test('should preserve successful migrations before failure', async () => {
      await createTrackingTable(testDb.client);

      // Apply first migration successfully
      await applyMigration(testDb.client, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.client, hash1);

      const beforeFailure = await getAppliedMigrations(testDb.client);
      expect(beforeFailure.length).toBe(1);

      // Try to apply invalid migration (should fail)
      let failed = false;
      try {
        await applyMigration(testDb.client, INVALID_MIGRATION);
      } catch {
        failed = true;
      }

      expect(failed).toBe(true);

      // Verify: First migration is still tracked
      const afterFailure = await getAppliedMigrations(testDb.client);
      expect(afterFailure.length).toBe(1);
      expect(afterFailure[0].hash).toBe(hash1);

      // Verify: First migration's changes are still present
      expect(await tableExists(testDb.client, 'users')).toBe(true);
    });
  });

  describe('Retry After Failure - Fix failed migration and re-run', () => {
    test('should successfully apply fixed migration on retry', async () => {
      await createTrackingTable(testDb.client);

      // First attempt: Apply valid migration
      await applyMigration(testDb.client, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.client, hash1);

      // First attempt: Try invalid migration (fails)
      let firstAttemptFailed = false;
      try {
        await applyMigration(testDb.client, INVALID_MIGRATION);
      } catch {
        firstAttemptFailed = true;
      }

      expect(firstAttemptFailed).toBe(true);

      // Fix the migration (corrected SQL)
      const fixedMigration = createMigrationFixture(4, 'fixed_migration', `
        CREATE TABLE fixed_table (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid()
        );
      `);

      // Retry: Apply fixed migration
      await applyMigration(testDb.client, fixedMigration);
      const hash2 = generateMigrationHash(fixedMigration.content);
      await recordMigration(testDb.client, hash2);

      // Verify: Both migrations are now tracked
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(2);

      // Verify: Both tables exist
      expect(await tableExists(testDb.client, 'users')).toBe(true);
      expect(await tableExists(testDb.client, 'fixed_table')).toBe(true);
    });

    test('should continue with remaining migrations after fix', async () => {
      await createTrackingTable(testDb.client);

      // Apply first migration
      await applyMigration(testDb.client, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.client, hash1);

      // Fail on second migration
      let failed = false;
      try {
        await applyMigration(testDb.client, INVALID_MIGRATION);
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);

      // Fix and apply
      const fixedMigration = createMigrationFixture(4, 'fixed', `
        CREATE TABLE temp (id UUID PRIMARY KEY);
      `);
      await applyMigration(testDb.client, fixedMigration);
      const hash2 = generateMigrationHash(fixedMigration.content);
      await recordMigration(testDb.client, hash2);

      // Continue with remaining migrations
      await applyMigration(testDb.client, VALID_MIGRATIONS[1]);
      const hash3 = generateMigrationHash(VALID_MIGRATIONS[1].content);
      await recordMigration(testDb.client, hash3);

      // Verify: All three migrations tracked
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(3);
    });
  });

  describe('Empty Migration Directory - No migrations to apply', () => {
    test('should handle empty migration directory gracefully', async () => {
      await createTrackingTable(testDb.client);

      const migrations: MigrationFile[] = [];

      // Execute with no migrations
      for (const migration of migrations) {
        await applyMigration(testDb.client, migration);
      }

      // Verify: No migrations tracked
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(0);

      // Verify: No tables created (except tracking table)
      const tableCount = await getTableCount(testDb.client);
      expect(tableCount).toBe(0); // Only tracking table (in drizzle schema, not public)
    });

    test('should report zero migrations applied', async () => {
      await createTrackingTable(testDb.client);

      const migrations: MigrationFile[] = [];
      let appliedCount = 0;

      for (const migration of migrations) {
        await applyMigration(testDb.client, migration);
        appliedCount++;
      }

      expect(appliedCount).toBe(0);

      const appliedMigrations = await getAppliedMigrations(testDb.client);
      expect(appliedMigrations.length).toBe(0);
    });
  });

  describe('All Migrations Applied - All in tracking table', () => {
    test('should skip all migrations when already applied', async () => {
      await createTrackingTable(testDb.client);

      // First run: Apply all migrations
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
      }

      const afterFirstRun = await getAppliedMigrations(testDb.client);
      expect(afterFirstRun.length).toBe(VALID_MIGRATIONS.length);

      // Second run: Check which migrations are pending
      const appliedHashes = new Set(afterFirstRun.map(m => m.hash));
      const pendingMigrations = VALID_MIGRATIONS.filter(migration => {
        const hash = generateMigrationHash(migration.content);
        return !appliedHashes.has(hash);
      });

      // Verify: No pending migrations
      expect(pendingMigrations.length).toBe(0);

      // Verify: Tracking table unchanged
      const afterSecondRun = await getAppliedMigrations(testDb.client);
      expect(afterSecondRun.length).toBe(afterFirstRun.length);
    });

    test('should report correct skipped count', async () => {
      await createTrackingTable(testDb.client);

      // Apply all migrations
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
      }

      // Simulate second run
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      const appliedHashes = new Set(appliedMigrations.map(m => m.hash));

      let skippedCount = 0;
      let appliedCount = 0;

      for (const migration of VALID_MIGRATIONS) {
        const hash = generateMigrationHash(migration.content);
        if (appliedHashes.has(hash)) {
          skippedCount++;
        } else {
          appliedCount++;
        }
      }

      // Verify: All migrations skipped, none applied
      expect(skippedCount).toBe(VALID_MIGRATIONS.length);
      expect(appliedCount).toBe(0);
    });

    test('should maintain idempotency across multiple runs', async () => {
      await createTrackingTable(testDb.client);

      // Run 1
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
      }

      const afterRun1 = await getAppliedMigrations(testDb.client);

      // Run 2 (should skip all)
      const appliedHashes2 = new Set(afterRun1.map(m => m.hash));
      const pending2 = VALID_MIGRATIONS.filter(m => 
        !appliedHashes2.has(generateMigrationHash(m.content))
      );
      expect(pending2.length).toBe(0);

      // Run 3 (should still skip all)
      const afterRun2 = await getAppliedMigrations(testDb.client);
      const appliedHashes3 = new Set(afterRun2.map(m => m.hash));
      const pending3 = VALID_MIGRATIONS.filter(m => 
        !appliedHashes3.has(generateMigrationHash(m.content))
      );
      expect(pending3.length).toBe(0);

      // Verify: Tracking table unchanged across runs
      expect(afterRun1.length).toBe(afterRun2.length);
      expect(afterRun1.length).toBe(VALID_MIGRATIONS.length);
    });
  });

  describe('Transaction Atomicity', () => {
    test('should rollback failed migration completely', async () => {
      await createTrackingTable(testDb.client);

      // Get initial table count
      const initialTableCount = await getTableCount(testDb.client);

      // Try to apply invalid migration
      let failed = false;
      try {
        await applyMigration(testDb.client, INVALID_MIGRATION);
      } catch {
        failed = true;
      }

      expect(failed).toBe(true);

      // Verify: Table count unchanged (no partial changes)
      const afterFailureTableCount = await getTableCount(testDb.client);
      expect(afterFailureTableCount).toBe(initialTableCount);

      // Verify: Migration not tracked
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      const invalidHash = generateMigrationHash(INVALID_MIGRATION.content);
      const tracked = appliedMigrations.find(m => m.hash === invalidHash);
      expect(tracked).toBeUndefined();
    });

    test('should not update tracking table on failure', async () => {
      await createTrackingTable(testDb.client);

      const beforeFailure = await getAppliedMigrations(testDb.client);

      // Try to apply invalid migration
      let failed = false;
      try {
        await applyMigration(testDb.client, INVALID_MIGRATION);
        // If it didn't fail, don't record it
      } catch {
        failed = true;
        // Don't record failed migration
      }

      expect(failed).toBe(true);

      // Verify: Tracking table unchanged
      const afterFailure = await getAppliedMigrations(testDb.client);
      expect(afterFailure.length).toBe(beforeFailure.length);
    });
  });

  describe('Batch Migration Consistency', () => {
    test('should detect multiple pending migrations', async () => {
      await createTrackingTable(testDb.client);

      // Simulate detecting pending migrations
      const appliedMigrations = await getAppliedMigrations(testDb.client);
      const appliedHashes = new Set(appliedMigrations.map(m => m.hash));

      const pendingMigrations = VALID_MIGRATIONS.filter(migration => {
        const hash = generateMigrationHash(migration.content);
        return !appliedHashes.has(hash);
      });

      // Verify: All migrations are pending
      expect(pendingMigrations.length).toBe(VALID_MIGRATIONS.length);
      expect(pendingMigrations.length).toBeGreaterThan(1);
    });

    test('should execute batch in chronological order', async () => {
      await createTrackingTable(testDb.client);

      const executionOrder: string[] = [];

      // Execute migrations and track order
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
        executionOrder.push(migration.filename);
      }

      // Verify: Execution order matches timestamp order
      const timestamps = executionOrder.map(filename => 
        parseInt(filename.match(/^(\d{4})_/)?.[1] || '0')
      );

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    test('should report accurate batch summary', async () => {
      await createTrackingTable(testDb.client);

      // Apply some migrations first
      await applyMigration(testDb.client, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.client, hash1);

      const alreadyApplied = await getAppliedMigrations(testDb.client);

      // Simulate batch run
      const appliedHashes = new Set(alreadyApplied.map(m => m.hash));
      const pending = VALID_MIGRATIONS.filter(m => 
        !appliedHashes.has(generateMigrationHash(m.content))
      );

      let newlyApplied = 0;
      for (const migration of pending) {
        await applyMigration(testDb.client, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.client, hash);
        newlyApplied++;
      }

      // Verify: Counts are accurate
      expect(alreadyApplied.length).toBe(1);
      expect(newlyApplied).toBe(VALID_MIGRATIONS.length - 1);

      const afterBatch = await getAppliedMigrations(testDb.client);
      expect(afterBatch.length).toBe(VALID_MIGRATIONS.length);
    });
  });
});
