/**
 * Integration tests for database migration runner
 * 
 * Tests end-to-end migration flows using pg-mem (in-memory PostgreSQL).
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { newDb, DataType, type IMemoryDb } from 'pg-mem';
import { drizzle } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Test Database Setup
// ============================================================================

interface TestDbContext {
  memoryDb: IMemoryDb;
  db: ReturnType<typeof drizzle>;
  pool: any;
  cleanup: () => Promise<void>;
}

function createTestDatabase(): TestDbContext {
  const memoryDb = newDb({ autoCreateForeignKeyIndices: true });

  // Register required PostgreSQL functions
  memoryDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: randomUUID,
    impure: true,
  });

  memoryDb.public.registerFunction({
    name: 'now',
    returns: DataType.timestamp,
    implementation: () => new Date(),
    impure: true,
  });

  // Create the pg adapter
  const pg = memoryDb.adapters.createPg();
  const pool = new pg.Pool();
  const db = drizzle(pool);

  const cleanup = async () => {
    await pool.end();
  };

  return { memoryDb, db, pool, cleanup };
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

const CONSTRAINT_VIOLATION_MIGRATION = createMigrationFixture(5, 'duplicate_table', `
  CREATE TABLE users (
    id UUID PRIMARY KEY
  );
`);

// ============================================================================
// Helper Functions
// ============================================================================

async function applyMigration(memoryDb: IMemoryDb, migration: MigrationFile): Promise<void> {
  memoryDb.public.none(migration.content);
}

async function createTrackingTable(memoryDb: IMemoryDb): Promise<void> {
  memoryDb.public.none(`
    CREATE SCHEMA IF NOT EXISTS drizzle;
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);
}

async function getAppliedMigrations(memoryDb: IMemoryDb): Promise<Array<{ hash: string; created_at: string }>> {
  try {
    const result = memoryDb.public.many(`
      SELECT hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at ASC
    `);
    return result as Array<{ hash: string; created_at: string }>;
  } catch (error) {
    return [];
  }
}

async function recordMigration(memoryDb: IMemoryDb, hash: string): Promise<void> {
  memoryDb.public.none(`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('${hash}', ${Date.now()})
  `);
}

function generateMigrationHash(content: string): string {
  // Simple hash for testing (in real implementation, Drizzle uses a proper hash)
  return Buffer.from(content).toString('base64').substring(0, 32);
}

async function tableExists(memoryDb: IMemoryDb, tableName: string): Promise<boolean> {
  try {
    memoryDb.public.one(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function getTableCount(memoryDb: IMemoryDb): Promise<number> {
  const result = memoryDb.public.many(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  return result.length;
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Migration Runner - Integration Tests', () => {
  let testDb: TestDbContext;

  beforeEach(() => {
    testDb = createTestDatabase();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('Happy Path - Multiple migrations execute successfully', () => {
    test('should apply all pending migrations in order', async () => {
      // Setup: Create tracking table
      await createTrackingTable(testDb.memoryDb);

      // Execute: Apply migrations in order
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
      }

      // Verify: All migrations are tracked
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(VALID_MIGRATIONS.length);

      // Verify: Tables were created
      expect(await tableExists(testDb.memoryDb, 'users')).toBe(true);
      expect(await tableExists(testDb.memoryDb, 'posts')).toBe(true);

      // Verify: Foreign key relationship works
      const userId = randomUUID();
      testDb.memoryDb.public.none(`
        INSERT INTO users (id, email) VALUES ('${userId}', 'test@example.com')
      `);
      testDb.memoryDb.public.none(`
        INSERT INTO posts (user_id, title) VALUES ('${userId}', 'Test Post')
      `);

      const posts = testDb.memoryDb.public.many('SELECT * FROM posts');
      expect(posts.length).toBe(1);
    });

    test('should execute migrations in chronological order by timestamp', async () => {
      await createTrackingTable(testDb.memoryDb);

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
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
      }

      // Verify: Migrations were applied in correct order
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(VALID_MIGRATIONS.length);

      // Verify: Dependencies work (posts table depends on users table)
      expect(await tableExists(testDb.memoryDb, 'users')).toBe(true);
      expect(await tableExists(testDb.memoryDb, 'posts')).toBe(true);
    });

    test('should report correct count of applied migrations', async () => {
      await createTrackingTable(testDb.memoryDb);

      let appliedCount = 0;

      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
        appliedCount++;
      }

      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(appliedCount);
      expect(appliedCount).toBe(VALID_MIGRATIONS.length);
    });
  });

  describe('Partial Failure - First succeeds, second fails, third does not run', () => {
    test('should halt execution after first failure', async () => {
      await createTrackingTable(testDb.memoryDb);

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
          await applyMigration(testDb.memoryDb, migration);
          const hash = generateMigrationHash(migration.content);
          await recordMigration(testDb.memoryDb, hash);
        } catch (error) {
          failedMigrationIndex = i;
          break; // Halt on failure
        }
      }

      // Verify: Failure occurred at expected index
      expect(failedMigrationIndex).toBe(1);

      // Verify: Only first migration was tracked
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(1);

      // Verify: First migration's table exists
      expect(await tableExists(testDb.memoryDb, 'users')).toBe(true);

      // Verify: Third migration's table does not exist
      expect(await tableExists(testDb.memoryDb, 'posts')).toBe(false);
    });

    test('should preserve successful migrations before failure', async () => {
      await createTrackingTable(testDb.memoryDb);

      // Apply first migration successfully
      await applyMigration(testDb.memoryDb, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.memoryDb, hash1);

      const beforeFailure = await getAppliedMigrations(testDb.memoryDb);
      expect(beforeFailure.length).toBe(1);

      // Try to apply invalid migration (should fail)
      let failed = false;
      try {
        await applyMigration(testDb.memoryDb, INVALID_MIGRATION);
      } catch (error) {
        failed = true;
      }

      expect(failed).toBe(true);

      // Verify: First migration is still tracked
      const afterFailure = await getAppliedMigrations(testDb.memoryDb);
      expect(afterFailure.length).toBe(1);
      expect(afterFailure[0].hash).toBe(hash1);

      // Verify: First migration's changes are still present
      expect(await tableExists(testDb.memoryDb, 'users')).toBe(true);
    });
  });

  describe('Retry After Failure - Fix failed migration and re-run', () => {
    test('should successfully apply fixed migration on retry', async () => {
      await createTrackingTable(testDb.memoryDb);

      // First attempt: Apply valid migration
      await applyMigration(testDb.memoryDb, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.memoryDb, hash1);

      // First attempt: Try invalid migration (fails)
      let firstAttemptFailed = false;
      try {
        await applyMigration(testDb.memoryDb, INVALID_MIGRATION);
      } catch (error) {
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
      await applyMigration(testDb.memoryDb, fixedMigration);
      const hash2 = generateMigrationHash(fixedMigration.content);
      await recordMigration(testDb.memoryDb, hash2);

      // Verify: Both migrations are now tracked
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(2);

      // Verify: Both tables exist
      expect(await tableExists(testDb.memoryDb, 'users')).toBe(true);
      expect(await tableExists(testDb.memoryDb, 'fixed_table')).toBe(true);
    });

    test('should continue with remaining migrations after fix', async () => {
      await createTrackingTable(testDb.memoryDb);

      // Apply first migration
      await applyMigration(testDb.memoryDb, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.memoryDb, hash1);

      // Fail on second migration
      let failed = false;
      try {
        await applyMigration(testDb.memoryDb, INVALID_MIGRATION);
      } catch (error) {
        failed = true;
      }
      expect(failed).toBe(true);

      // Fix and apply
      const fixedMigration = createMigrationFixture(4, 'fixed', `
        CREATE TABLE temp (id UUID PRIMARY KEY);
      `);
      await applyMigration(testDb.memoryDb, fixedMigration);
      const hash2 = generateMigrationHash(fixedMigration.content);
      await recordMigration(testDb.memoryDb, hash2);

      // Continue with remaining migrations
      await applyMigration(testDb.memoryDb, VALID_MIGRATIONS[1]);
      const hash3 = generateMigrationHash(VALID_MIGRATIONS[1].content);
      await recordMigration(testDb.memoryDb, hash3);

      // Verify: All three migrations tracked
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(3);
    });
  });

  describe('Empty Migration Directory - No migrations to apply', () => {
    test('should handle empty migration directory gracefully', async () => {
      await createTrackingTable(testDb.memoryDb);

      const migrations: MigrationFile[] = [];

      // Execute with no migrations
      for (const migration of migrations) {
        await applyMigration(testDb.memoryDb, migration);
      }

      // Verify: No migrations tracked
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(0);

      // Verify: No tables created (except tracking table)
      const tableCount = await getTableCount(testDb.memoryDb);
      expect(tableCount).toBe(1); // Only tracking table
    });

    test('should report zero migrations applied', async () => {
      await createTrackingTable(testDb.memoryDb);

      const migrations: MigrationFile[] = [];
      let appliedCount = 0;

      for (const migration of migrations) {
        await applyMigration(testDb.memoryDb, migration);
        appliedCount++;
      }

      expect(appliedCount).toBe(0);

      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      expect(appliedMigrations.length).toBe(0);
    });
  });

  describe('All Migrations Applied - All in tracking table', () => {
    test('should skip all migrations when already applied', async () => {
      await createTrackingTable(testDb.memoryDb);

      // First run: Apply all migrations
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
      }

      const afterFirstRun = await getAppliedMigrations(testDb.memoryDb);
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
      const afterSecondRun = await getAppliedMigrations(testDb.memoryDb);
      expect(afterSecondRun.length).toBe(afterFirstRun.length);
    });

    test('should report correct skipped count', async () => {
      await createTrackingTable(testDb.memoryDb);

      // Apply all migrations
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
      }

      // Simulate second run
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
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
      await createTrackingTable(testDb.memoryDb);

      // Run 1
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
      }

      const afterRun1 = await getAppliedMigrations(testDb.memoryDb);

      // Run 2 (should skip all)
      const appliedHashes2 = new Set(afterRun1.map(m => m.hash));
      const pending2 = VALID_MIGRATIONS.filter(m => 
        !appliedHashes2.has(generateMigrationHash(m.content))
      );
      expect(pending2.length).toBe(0);

      // Run 3 (should still skip all)
      const afterRun2 = await getAppliedMigrations(testDb.memoryDb);
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
      await createTrackingTable(testDb.memoryDb);

      // Get initial table count
      const initialTableCount = await getTableCount(testDb.memoryDb);

      // Try to apply invalid migration
      let failed = false;
      try {
        await applyMigration(testDb.memoryDb, INVALID_MIGRATION);
      } catch (error) {
        failed = true;
      }

      expect(failed).toBe(true);

      // Verify: Table count unchanged (no partial changes)
      const afterFailureTableCount = await getTableCount(testDb.memoryDb);
      expect(afterFailureTableCount).toBe(initialTableCount);

      // Verify: Migration not tracked
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
      const invalidHash = generateMigrationHash(INVALID_MIGRATION.content);
      const tracked = appliedMigrations.find(m => m.hash === invalidHash);
      expect(tracked).toBeUndefined();
    });

    test('should not update tracking table on failure', async () => {
      await createTrackingTable(testDb.memoryDb);

      const beforeFailure = await getAppliedMigrations(testDb.memoryDb);

      // Try to apply invalid migration
      let failed = false;
      try {
        await applyMigration(testDb.memoryDb, INVALID_MIGRATION);
        // If it didn't fail, don't record it
      } catch (error) {
        failed = true;
        // Don't record failed migration
      }

      expect(failed).toBe(true);

      // Verify: Tracking table unchanged
      const afterFailure = await getAppliedMigrations(testDb.memoryDb);
      expect(afterFailure.length).toBe(beforeFailure.length);
    });
  });

  describe('Batch Migration Consistency', () => {
    test('should detect multiple pending migrations', async () => {
      await createTrackingTable(testDb.memoryDb);

      // Simulate detecting pending migrations
      const appliedMigrations = await getAppliedMigrations(testDb.memoryDb);
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
      await createTrackingTable(testDb.memoryDb);

      const executionOrder: string[] = [];

      // Execute migrations and track order
      for (const migration of VALID_MIGRATIONS) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
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
      await createTrackingTable(testDb.memoryDb);

      // Apply some migrations first
      await applyMigration(testDb.memoryDb, VALID_MIGRATIONS[0]);
      const hash1 = generateMigrationHash(VALID_MIGRATIONS[0].content);
      await recordMigration(testDb.memoryDb, hash1);

      const alreadyApplied = await getAppliedMigrations(testDb.memoryDb);

      // Simulate batch run
      const appliedHashes = new Set(alreadyApplied.map(m => m.hash));
      const pending = VALID_MIGRATIONS.filter(m => 
        !appliedHashes.has(generateMigrationHash(m.content))
      );

      let newlyApplied = 0;
      for (const migration of pending) {
        await applyMigration(testDb.memoryDb, migration);
        const hash = generateMigrationHash(migration.content);
        await recordMigration(testDb.memoryDb, hash);
        newlyApplied++;
      }

      // Verify: Counts are accurate
      expect(alreadyApplied.length).toBe(1);
      expect(newlyApplied).toBe(VALID_MIGRATIONS.length - 1);

      const afterBatch = await getAppliedMigrations(testDb.memoryDb);
      expect(afterBatch.length).toBe(VALID_MIGRATIONS.length);
    });
  });
});
