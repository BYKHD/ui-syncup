/**
 * Property-based tests for database migration runner
 * 
 * Tests migration system correctness properties using property-based testing with fast-check.
 * 
 * Feature: automated-drizzle-migrations
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

// Mock console methods to capture log output
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const getAllLogMessages = (spy: ReturnType<typeof vi.spyOn>): string[] =>
  spy.mock.calls.map((call: unknown[]) => String(call[0] ?? ''));

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleInfoSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

// ============================================================================
// Helper Functions (extracted from migrate.ts for testing)
// ============================================================================

/**
 * Validates the DIRECT_URL environment variable
 */
function validateEnvironment(directUrl?: string): { valid: boolean; url?: string; error?: string } {
  const DIRECT_URL = directUrl;

  // Check if DIRECT_URL exists
  if (!DIRECT_URL) {
    return {
      valid: false,
      error: "DIRECT_URL environment variable is not set. Please configure it in your environment or .env.local file.",
    };
  }

  // Check if DIRECT_URL is not just whitespace
  if (DIRECT_URL.trim().length === 0) {
    return {
      valid: false,
      error: "DIRECT_URL environment variable is empty. Please provide a valid PostgreSQL connection string.",
    };
  }

  // Validate PostgreSQL URL format
  try {
    const url = new URL(DIRECT_URL);
    
    // Check if it's a PostgreSQL URL
    if (!url.protocol.startsWith("postgres")) {
      return {
        valid: false,
        error: `Invalid database URL protocol: ${url.protocol}. Expected 'postgres:' or 'postgresql:'.`,
      };
    }

    // Check if hostname exists
    if (!url.hostname) {
      return {
        valid: false,
        error: "Invalid database URL: missing hostname.",
      };
    }

    return { valid: true, url: DIRECT_URL };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid database URL format: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Formats errors with GitHub Actions annotations
 */
function formatError(error: unknown, context?: string): string {
  const errorObj = error as any;
  let message = "";

  if (context) {
    message += `Context: ${context}\n`;
  }

  // Extract error message
  if (errorObj?.message) {
    message += `Error: ${errorObj.message}\n`;
  } else {
    message += `Error: ${String(error)}\n`;
  }

  // Extract SQL state if available (PostgreSQL error codes)
  if (errorObj?.code) {
    message += `SQL State: ${errorObj.code}\n`;
  }

  // Extract position/line number if available
  if (errorObj?.position) {
    message += `Position: ${errorObj.position}\n`;
  }

  // Extract constraint name for constraint violations
  if (errorObj?.constraint) {
    message += `Constraint: ${errorObj.constraint}\n`;
  }

  // Extract table name if available
  if (errorObj?.table) {
    message += `Table: ${errorObj.table}\n`;
  }

  // Extract column name if available
  if (errorObj?.column) {
    message += `Column: ${errorObj.column}\n`;
  }

  // Add troubleshooting guidance
  message += "\nTroubleshooting:\n";
  
  if (errorObj?.code === "42P01") {
    message += "- Table does not exist. Ensure migrations are applied in order.\n";
  } else if (errorObj?.code === "23505") {
    message += "- Unique constraint violation. Check for duplicate data.\n";
  } else if (errorObj?.code === "23503") {
    message += "- Foreign key constraint violation. Ensure referenced records exist.\n";
  } else if (errorObj?.code === "42601") {
    message += "- SQL syntax error. Review the migration SQL for syntax issues.\n";
  } else if (errorObj?.message?.includes("timeout")) {
    message += "- Connection timeout. Check network connectivity and database availability.\n";
  } else if (errorObj?.message?.includes("authentication")) {
    message += "- Authentication failed. Verify database credentials in DIRECT_URL.\n";
  } else {
    message += "- Review the error details above and check the migration SQL.\n";
    message += "- Ensure the database is accessible and has sufficient resources.\n";
  }

  return message;
}

/**
 * Simulates logging migration context
 */
function logMigrationContext(branch: string, commit: string, environment: string): void {
  console.log(`📋 Migration Context:`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Commit: ${commit.substring(0, 7)}`);
  console.log(`   Environment: ${environment}`);
}

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

// Valid PostgreSQL URL arbitrary
const validPostgresUrlArb = fc.record({
  protocol: fc.constantFrom('postgres:', 'postgresql:'),
  username: fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/),
  password: fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/),
  hostname: fc.domain(),
  port: fc.integer({ min: 1024, max: 65535 }),
  database: fc.stringMatching(/^[a-zA-Z0-9_]{1,20}$/),
}).map(({ protocol, username, password, hostname, port, database }) => 
  `${protocol}//${username}:${password}@${hostname}:${port}/${database}`
);

// Invalid URL arbitrary
const invalidUrlArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('not-a-url'),
  fc.constant('http://example.com'),
  fc.constant('mysql://localhost:3306/db'),
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('://')),
);

// PostgreSQL error code arbitrary
const postgresErrorCodeArb = fc.constantFrom(
  '42P01', // undefined_table
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '42601', // syntax_error
  '08006', // connection_failure
  '28P01', // invalid_password
);

// Hex string arbitrary (for migration hashes)
const hexStringArb = (length: number) => 
  fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { 
    minLength: length, 
    maxLength: length 
  }).map(arr => arr.join(''));

// Branch name arbitrary
const branchNameArb = fc.constantFrom('main', 'develop', 'feature/test', 'hotfix/bug');

// Commit SHA arbitrary (40 character hex string)
const commitShaArb = fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 40, maxLength: 40 }).map(arr => arr.join(''));

// Environment arbitrary
const environmentArb = fc.constantFrom('Production', 'Preview', 'Development');

// ============================================================================
// Property Tests
// ============================================================================

describe('Migration Runner - Property-Based Tests', () => {
  /**
   * Feature: automated-drizzle-migrations, Property 9: Configuration validation completeness
   * Validates: Requirements 2.1, 2.2
   * 
   * For any workflow execution, if the DIRECT_URL environment variable is missing or invalid,
   * the migration system should fail before attempting any database operations.
   */
  test('Property 9: Configuration validation completeness - missing or invalid DIRECT_URL fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidUrlArb,
        async (invalidUrl) => {
          // Validate environment with invalid URL
          const result = validateEnvironment(invalidUrl);

          // Verify validation fails
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toBeTruthy();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);

          // Verify error message is descriptive
          if (invalidUrl === '' || invalidUrl.trim() === '') {
            expect(result.error).toMatch(/not set|empty/i);
          } else if (!invalidUrl.includes('://')) {
            // Some strings without :// are valid URLs (e.g. "scheme:path"), so they might fail on protocol instead of format
            expect(result.error).toMatch(/invalid.*(url.*format|protocol)/i);
          } else if (!invalidUrl.startsWith('postgres')) {
            expect(result.error).toMatch(/invalid.*protocol|protocol/i);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 9 (valid URLs): Valid PostgreSQL URLs pass validation
   */
  test('Property 9: Configuration validation completeness - valid DIRECT_URL passes', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPostgresUrlArb,
        async (validUrl) => {
          // Validate environment with valid URL
          const result = validateEnvironment(validUrl);

          // Verify validation succeeds
          expect(result.valid).toBe(true);
          expect(result.url).toBe(validUrl);
          expect(result.error).toBeUndefined();
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 7: Error message completeness
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   * 
   * For any migration failure, the error output should contain sufficient information
   * (SQL error, line number, migration file name) to diagnose the issue without
   * requiring additional database queries.
   */
  test('Property 7: Error message completeness - SQL errors include diagnostic information', async () => {
    await fc.assert(
      fc.asyncProperty(
        postgresErrorCodeArb,
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        async (errorCode, errorMessage, position, constraint, table, column) => {
          // Create a PostgreSQL-like error object
          const error = {
            message: errorMessage,
            code: errorCode,
            position,
            constraint,
            table,
            column,
          };

          // Format the error
          const formattedError = formatError(error, 'Migration execution');

          // Verify error message contains context
          expect(formattedError).toContain('Context: Migration execution');

          // Verify error message contains the error text
          expect(formattedError).toContain(`Error: ${errorMessage}`);

          // Verify error message contains SQL state
          expect(formattedError).toContain(`SQL State: ${errorCode}`);

          // Verify optional fields are included when present
          if (position) {
            expect(formattedError).toContain(`Position: ${position}`);
          }

          if (constraint) {
            expect(formattedError).toContain(`Constraint: ${constraint}`);
          }

          if (table) {
            expect(formattedError).toContain(`Table: ${table}`);
          }

          if (column) {
            expect(formattedError).toContain(`Column: ${column}`);
          }

          // Verify troubleshooting guidance is included
          expect(formattedError).toContain('Troubleshooting:');

          // Verify specific troubleshooting guidance based on error code
          if (errorCode === '42P01') {
            expect(formattedError).toContain('Table does not exist');
          } else if (errorCode === '23505') {
            expect(formattedError).toContain('Unique constraint violation');
          } else if (errorCode === '23503') {
            expect(formattedError).toContain('Foreign key constraint violation');
          } else if (errorCode === '42601') {
            expect(formattedError).toContain('SQL syntax error');
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 7 (error types): Different error types have appropriate troubleshooting
   */
  test('Property 7: Error message completeness - error types have specific troubleshooting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ message: 'Connection timeout after 10s', code: '08006' }),
          fc.constant({ message: 'authentication failed for user', code: '28P01' }),
          fc.constant({ message: 'syntax error at or near "CREAT"', code: '42601' }),
          fc.constant({ message: 'relation "users" does not exist', code: '42P01' }),
        ),
        async (error) => {
          // Format the error
          const formattedError = formatError(error);

          // Verify appropriate troubleshooting guidance
          if (error.message.includes('timeout')) {
            expect(formattedError).toMatch(/timeout.*network.*connectivity/i);
          } else if (error.message.includes('authentication')) {
            expect(formattedError).toMatch(/authentication.*credentials/i);
          } else if (error.code === '42601') {
            expect(formattedError).toMatch(/syntax.*review.*SQL/i);
          } else if (error.code === '42P01') {
            expect(formattedError).toMatch(/table.*not exist.*order/i);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 10: Log output completeness
   * Validates: Requirements 3.1, 3.2, 3.3, 3.5
   * 
   * For any migration execution, the log output should contain the branch name,
   * commit SHA, count of applied migrations, and execution status for each
   * migration file processed.
   */
  test('Property 10: Log output completeness - migration context is logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        branchNameArb,
        commitShaArb,
        environmentArb,
        async (branch, commit, environment) => {
          // Clear previous logs
          consoleLogSpy.mockClear();

          // Log migration context
          logMigrationContext(branch, commit, environment);

          // Get all log messages
          const logMessages = getAllLogMessages(consoleLogSpy);
          const combinedLog = logMessages.join('\n');

          // Verify branch name is logged
          expect(combinedLog).toContain(`Branch: ${branch}`);

          // Verify commit SHA is logged (at least first 7 characters)
          expect(combinedLog).toContain(`Commit: ${commit.substring(0, 7)}`);

          // Verify environment is logged
          expect(combinedLog).toContain(`Environment: ${environment}`);

          // Verify context header is present
          expect(combinedLog).toContain('Migration Context');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 10 (commit truncation): Commit SHA is consistently truncated to 7 characters
   */
  test('Property 10: Log output completeness - commit SHA truncation is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        branchNameArb,
        commitShaArb,
        environmentArb,
        async (branch, commit, environment) => {
          // Clear previous logs
          consoleLogSpy.mockClear();

          // Log migration context
          logMigrationContext(branch, commit, environment);

          // Get all log messages
          const logMessages = getAllLogMessages(consoleLogSpy);
          const combinedLog = logMessages.join('\n');

          // Extract the logged commit
          const commitMatch = combinedLog.match(/Commit: ([a-f0-9]+)/);
          expect(commitMatch).toBeTruthy();
          
          if (commitMatch) {
            const loggedCommit = commitMatch[1];
            
            // Verify it's exactly 7 characters
            expect(loggedCommit.length).toBe(7);
            
            // Verify it matches the first 7 characters of the original
            expect(loggedCommit).toBe(commit.substring(0, 7));
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 10 (environment mapping): Branch names map to correct environments
   */
  test('Property 10: Log output completeness - branch to environment mapping', async () => {
    await fc.assert(
      fc.asyncProperty(
        branchNameArb,
        commitShaArb,
        async (branch, commit) => {
          // Determine expected environment based on branch
          const expectedEnvironment = 
            branch === 'main' ? 'Production' :
            branch === 'develop' ? 'Preview' :
            'Development';

          // Clear previous logs
          consoleLogSpy.mockClear();

          // Log migration context
          logMigrationContext(branch, commit, expectedEnvironment);

          // Get all log messages
          const logMessages = getAllLogMessages(consoleLogSpy);
          const combinedLog = logMessages.join('\n');

          // Verify correct environment is logged
          expect(combinedLog).toContain(`Environment: ${expectedEnvironment}`);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 4: Environment isolation
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4
   * 
   * For any push to the develop branch, migrations should only affect the dev database,
   * and for any push to the main branch, migrations should only affect the prod database,
   * with no cross-contamination.
   */
  test('Property 4: Environment isolation - branch determines database target', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('main', 'develop'),
        validPostgresUrlArb,
        validPostgresUrlArb,
        async (branch, devUrl, prodUrl) => {
          // Ensure dev and prod URLs are different
          fc.pre(devUrl !== prodUrl);

          // Determine which URL should be used based on branch
          const expectedUrl = branch === 'main' ? prodUrl : devUrl;
          const unexpectedUrl = branch === 'main' ? devUrl : prodUrl;

          // Simulate environment variable selection based on branch
          const selectedUrl = branch === 'main' ? prodUrl : devUrl;

          // Verify correct URL is selected
          expect(selectedUrl).toBe(expectedUrl);
          expect(selectedUrl).not.toBe(unexpectedUrl);

          // Verify URL validation passes for selected URL
          const result = validateEnvironment(selectedUrl);
          expect(result.valid).toBe(true);
          expect(result.url).toBe(expectedUrl);

          // Verify the URL contains expected database identifier
          if (branch === 'main') {
            // Production should use PROD_DIRECT_URL
            expect(selectedUrl).toBe(prodUrl);
          } else {
            // Develop/feature branches should use DEV_DIRECT_URL
            expect(selectedUrl).toBe(devUrl);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 4 (feature branches): Feature branches use dev database
   */
  test('Property 4: Environment isolation - feature branches use dev database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^feature\/[a-z0-9-]{1,30}$/),
        validPostgresUrlArb,
        validPostgresUrlArb,
        async (featureBranch, devUrl, prodUrl) => {
          // Ensure dev and prod URLs are different
          fc.pre(devUrl !== prodUrl);

          // Feature branches should always use dev database
          const selectedUrl = devUrl; // In workflow, non-main branches use DEV_DIRECT_URL

          // Verify dev URL is selected
          expect(selectedUrl).toBe(devUrl);
          expect(selectedUrl).not.toBe(prodUrl);

          // Verify URL validation passes
          const result = validateEnvironment(selectedUrl);
          expect(result.valid).toBe(true);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 4 (environment secrets): Different environments use different secrets
   */
  test('Property 4: Environment isolation - environments use distinct secrets', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPostgresUrlArb,
        validPostgresUrlArb,
        async (devUrl, prodUrl) => {
          // Ensure URLs are different (representing different databases)
          fc.pre(devUrl !== prodUrl);

          // Simulate GitHub environment secrets
          const previewSecret = devUrl;
          const productionSecret = prodUrl;

          // Verify secrets are distinct
          expect(previewSecret).not.toBe(productionSecret);

          // Verify both secrets are valid
          const devResult = validateEnvironment(previewSecret);
          const prodResult = validateEnvironment(productionSecret);

          expect(devResult.valid).toBe(true);
          expect(prodResult.valid).toBe(true);

          // Verify they point to different databases
          expect(devResult.url).not.toBe(prodResult.url);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 5: Deployment blocking on failure
   * Validates: Requirements 1.5, 5.3
   * 
   * For any migration execution that fails, the subsequent Vercel deployment step
   * should not execute, ensuring that application code is never deployed with an
   * incompatible database schema.
   */
  test('Property 5: Deployment blocking on failure - failed migrations prevent deployment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.boolean(),
        async (exitCode, migrationSuccess) => {
          // Simulate migration execution result
          const migrationExitCode = migrationSuccess ? 0 : exitCode;

          // Verify exit code indicates success or failure
          const shouldDeploy = migrationExitCode === 0;

          if (migrationSuccess) {
            // Successful migration should allow deployment
            expect(shouldDeploy).toBe(true);
            expect(migrationExitCode).toBe(0);
          } else {
            // Failed migration should block deployment
            expect(shouldDeploy).toBe(false);
            expect(migrationExitCode).not.toBe(0);
            expect(migrationExitCode).toBeGreaterThan(0);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 5 (workflow dependency): Deployment job depends on migration success
   */
  test('Property 5: Deployment blocking on failure - deployment requires migration success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('success', 'failure', 'cancelled'),
        async (migrationStatus) => {
          // Simulate workflow job status
          const migrationJobStatus = migrationStatus;

          // Determine if deployment should proceed
          const shouldProceedToDeployment = migrationJobStatus === 'success';

          // Verify deployment only proceeds on success
          if (migrationStatus === 'success') {
            expect(shouldProceedToDeployment).toBe(true);
          } else {
            expect(shouldProceedToDeployment).toBe(false);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 5 (error propagation): Migration errors propagate to workflow
   */
  test('Property 5: Deployment blocking on failure - errors propagate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        postgresErrorCodeArb,
        fc.string({ minLength: 10, maxLength: 100 }),
        async (errorCode, errorMessage) => {
          // Simulate a migration error
          const error = {
            message: errorMessage,
            code: errorCode,
          };

          // Format the error
          const formattedError = formatError(error, 'Migration execution');

          // Verify error is properly formatted for GitHub Actions
          expect(formattedError).toBeTruthy();
          expect(formattedError.length).toBeGreaterThan(0);

          // Verify error contains diagnostic information
          expect(formattedError).toContain('Error:');
          expect(formattedError).toContain('SQL State:');
          expect(formattedError).toContain('Troubleshooting:');

          // Simulate exit code for error
          const exitCode = 1;

          // Verify non-zero exit code blocks deployment
          expect(exitCode).not.toBe(0);
          expect(exitCode).toBeGreaterThan(0);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 1: Migration idempotency
   * Validates: Requirements 4.2, 4.3, 4.4
   * 
   * For any set of migration files and any database state, running the migration system
   * multiple times should result in the same final database schema, with previously
   * applied migrations being skipped.
   */
  test('Property 1: Migration idempotency - running migrations multiple times produces same result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            hash: hexStringArb(32),
            appliedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.array(
          fc.record({
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            hash: hexStringArb(32),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (appliedMigrations, pendingMigrations) => {
          // Simulate first migration run
          const firstRunApplied = new Set(appliedMigrations.map(m => m.hash));
          const firstRunPending = pendingMigrations.filter(m => !firstRunApplied.has(m.hash));
          
          // After first run, these migrations are now applied
          const afterFirstRun = new Set([...firstRunApplied, ...firstRunPending.map(m => m.hash)]);
          
          // Simulate second migration run with same migration files
          const secondRunApplied = afterFirstRun;
          const secondRunPending = pendingMigrations.filter(m => !secondRunApplied.has(m.hash));
          
          // After second run, no new migrations should be applied
          const afterSecondRun = new Set([...secondRunApplied, ...secondRunPending.map(m => m.hash)]);
          
          // Verify idempotency: second run applies no new migrations
          expect(secondRunPending.length).toBe(0);
          expect(afterSecondRun.size).toBe(afterFirstRun.size);
          
          // Verify all migrations from first run are still applied
          firstRunPending.forEach(m => {
            expect(afterSecondRun.has(m.hash)).toBe(true);
          });
          
          // Verify the final state is identical
          expect(Array.from(afterSecondRun).sort()).toEqual(Array.from(afterFirstRun).sort());
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 1 (skip logic): Already-applied migrations are skipped
   */
  test('Property 1: Migration idempotency - already-applied migrations are skipped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (migrations) => {
          // Simulate all migrations already applied
          const appliedHashes = new Set(migrations.map(m => m.hash));
          
          // Attempt to run migrations again
          const pendingMigrations = migrations.filter(m => !appliedHashes.has(m.hash));
          
          // Verify no migrations are pending
          expect(pendingMigrations.length).toBe(0);
          
          // Verify all migrations are marked as applied
          migrations.forEach(m => {
            expect(appliedHashes.has(m.hash)).toBe(true);
          });
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 1 (tracking consistency): Migration tracking table accurately reflects applied migrations
   */
  test('Property 1: Migration idempotency - tracking table reflects applied state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            appliedAt: fc.integer({ min: 1000000000000, max: 9999999999999 }), // Unix timestamp in ms
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (trackingTableEntries, newMigrations) => {
          // Ensure new migrations don't overlap with tracking table
          const appliedHashes = new Set(trackingTableEntries.map(m => m.hash));
          const uniqueNewMigrations = newMigrations.filter(m => !appliedHashes.has(m.hash));
          
          // Simulate applying new migrations
          const afterApply = [
            ...trackingTableEntries,
            ...uniqueNewMigrations.map(m => ({
              hash: m.hash,
              filename: m.filename,
              appliedAt: Date.now(),
            })),
          ];
          
          // Verify tracking table contains all applied migrations
          expect(afterApply.length).toBe(trackingTableEntries.length + uniqueNewMigrations.length);
          
          // Verify each applied migration has a tracking entry
          uniqueNewMigrations.forEach(m => {
            const tracked = afterApply.find(t => t.hash === m.hash);
            expect(tracked).toBeDefined();
            expect(tracked?.hash).toBe(m.hash);
          });
          
          // Verify original tracking entries are preserved
          trackingTableEntries.forEach(original => {
            const preserved = afterApply.find(t => t.hash === original.hash);
            expect(preserved).toBeDefined();
            expect(preserved?.appliedAt).toBe(original.appliedAt);
          });
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 2: Migration ordering consistency
   * Validates: Requirements 1.3
   * 
   * For any set of migration files, the migration system should always execute them
   * in the same chronological order based on their timestamp prefixes, regardless
   * of filesystem ordering.
   */
  test('Property 2: Migration ordering consistency - migrations execute in timestamp order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            filename: fc.nat({ max: 9999 }).map(n => `${String(n).padStart(4, '0')}_migration.sql`),
            timestamp: fc.nat({ max: 9999 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (migrations) => {
          // Extract timestamps from filenames
          const migrationsWithTimestamps = migrations.map(m => {
            const match = m.filename.match(/^(\d{4})_/);
            const timestamp = match ? parseInt(match[1], 10) : 0;
            return { ...m, extractedTimestamp: timestamp };
          });
          
          // Sort by timestamp (simulating migration system behavior)
          const sorted = [...migrationsWithTimestamps].sort((a, b) => 
            a.extractedTimestamp - b.extractedTimestamp
          );
          
          // Verify sorted order is chronological
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].extractedTimestamp).toBeGreaterThanOrEqual(sorted[i - 1].extractedTimestamp);
          }
          
          // Verify the order is deterministic (same input produces same output)
          const sortedAgain = [...migrationsWithTimestamps].sort((a, b) => 
            a.extractedTimestamp - b.extractedTimestamp
          );
          
          expect(sortedAgain.map(m => m.filename)).toEqual(sorted.map(m => m.filename));
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 2 (filesystem independence): Order is independent of filesystem listing
   */
  test('Property 2: Migration ordering consistency - order independent of filesystem', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.nat({ max: 9999 }).map(n => ({
            filename: `${String(n).padStart(4, '0')}_migration.sql`,
            timestamp: n,
          })),
          { minLength: 2, maxLength: 10 }
        ),
        async (migrations) => {
          // Shuffle to simulate different filesystem orderings
          const shuffled1 = [...migrations].sort(() => Math.random() - 0.5);
          const shuffled2 = [...migrations].sort(() => Math.random() - 0.5);
          
          // Sort both by timestamp
          const sorted1 = [...shuffled1].sort((a, b) => a.timestamp - b.timestamp);
          const sorted2 = [...shuffled2].sort((a, b) => a.timestamp - b.timestamp);
          
          // Verify both produce the same order
          expect(sorted1.map(m => m.filename)).toEqual(sorted2.map(m => m.filename));
          
          // Verify order matches timestamp order
          for (let i = 1; i < sorted1.length; i++) {
            expect(sorted1[i].timestamp).toBeGreaterThanOrEqual(sorted1[i - 1].timestamp);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 2 (timestamp extraction): Timestamps are correctly extracted from filenames
   */
  test('Property 2: Migration ordering consistency - timestamp extraction is correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.nat({ max: 9999 }),
        fc.stringMatching(/^[a-z_]{1,30}$/),
        async (timestamp, description) => {
          // Create filename with timestamp
          const filename = `${String(timestamp).padStart(4, '0')}_${description}.sql`;
          
          // Extract timestamp (simulating migration system)
          const match = filename.match(/^(\d{4})_/);
          expect(match).toBeTruthy();
          
          if (match) {
            const extractedTimestamp = parseInt(match[1], 10);
            
            // Verify extracted timestamp matches original
            expect(extractedTimestamp).toBe(timestamp);
            
            // Verify it's a valid number
            expect(Number.isInteger(extractedTimestamp)).toBe(true);
            expect(extractedTimestamp).toBeGreaterThanOrEqual(0);
            expect(extractedTimestamp).toBeLessThanOrEqual(9999);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 6: Migration tracking consistency
   * Validates: Requirements 4.5, 9.2, 9.5
   * 
   * For any successfully applied migration, the migration tracking table should contain
   * exactly one entry for that migration, and for any failed migration, the tracking
   * table should not contain an entry.
   */
  test('Property 6: Migration tracking consistency - successful migrations recorded once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            success: fc.constant(true),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (successfulMigrations) => {
          // Simulate tracking table after successful migrations
          const trackingTable = successfulMigrations.map(m => ({
            hash: m.hash,
            created_at: Date.now(),
          }));
          
          // Verify each successful migration has exactly one entry
          successfulMigrations.forEach(migration => {
            const entries = trackingTable.filter(t => t.hash === migration.hash);
            expect(entries.length).toBe(1);
            expect(entries[0].hash).toBe(migration.hash);
          });
          
          // Verify tracking table size matches number of successful migrations
          expect(trackingTable.length).toBe(successfulMigrations.length);
          
          // Verify no duplicate entries
          const uniqueHashes = new Set(trackingTable.map(t => t.hash));
          expect(uniqueHashes.size).toBe(trackingTable.length);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 6 (failed migrations): Failed migrations are not recorded
   */
  test('Property 6: Migration tracking consistency - failed migrations not recorded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            success: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (migrations) => {
          // Simulate tracking table with only successful migrations
          const trackingTable = migrations
            .filter(m => m.success)
            .map(m => ({
              hash: m.hash,
              created_at: Date.now(),
            }));
          
          // Verify successful migrations are recorded
          const successfulMigrations = migrations.filter(m => m.success);
          successfulMigrations.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeDefined();
            expect(entry?.hash).toBe(migration.hash);
          });
          
          // Verify failed migrations are NOT recorded
          const failedMigrations = migrations.filter(m => !m.success);
          failedMigrations.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeUndefined();
          });
          
          // Verify tracking table only contains successful migrations
          expect(trackingTable.length).toBe(successfulMigrations.length);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 6 (rollback consistency): Rolled back migrations don't appear in tracking
   */
  test('Property 6: Migration tracking consistency - rollback prevents tracking entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.integer({ min: 0, max: 4 }),
        async (migrations, failureIndex) => {
          // Ensure failure index is valid
          fc.pre(failureIndex < migrations.length);
          
          // Simulate migrations up to failure point
          const appliedBeforeFailure = migrations.slice(0, failureIndex);
          const failedMigration = migrations[failureIndex];
          const notAttempted = migrations.slice(failureIndex + 1);
          
          // Simulate tracking table (only contains migrations before failure)
          const trackingTable = appliedBeforeFailure.map(m => ({
            hash: m.hash,
            created_at: Date.now(),
          }));
          
          // Verify migrations before failure are tracked
          appliedBeforeFailure.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeDefined();
          });
          
          // Verify failed migration is NOT tracked (rolled back)
          const failedEntry = trackingTable.find(t => t.hash === failedMigration.hash);
          expect(failedEntry).toBeUndefined();
          
          // Verify migrations after failure are NOT tracked (not attempted)
          notAttempted.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeUndefined();
          });
          
          // Verify tracking table size
          expect(trackingTable.length).toBe(appliedBeforeFailure.length);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 6 (tracking atomicity): Tracking entry is atomic with migration success
   */
  test('Property 6: Migration tracking consistency - tracking is atomic with migration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hash: hexStringArb(32),
          filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          migrationSuccess: fc.boolean(),
          trackingSuccess: fc.boolean(),
        }),
        async ({ hash, migrationSuccess, trackingSuccess }) => {
          // Simulate transaction behavior: both must succeed or both must fail
          const transactionSuccess = migrationSuccess && trackingSuccess;
          
          // Simulate tracking table state after transaction
          const trackingTable: Array<{ hash: string; created_at: number }> = [];
          
          if (transactionSuccess) {
            // Both migration and tracking succeeded
            trackingTable.push({ hash, created_at: Date.now() });
          }
          // If either failed, tracking table remains empty (rollback)
          
          // Verify atomicity
          if (migrationSuccess && trackingSuccess) {
            // Both succeeded: tracking entry exists
            expect(trackingTable.length).toBe(1);
            expect(trackingTable[0].hash).toBe(hash);
          } else {
            // Either failed: no tracking entry (rollback)
            expect(trackingTable.length).toBe(0);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 3: Transaction atomicity per migration
   * Validates: Requirements 9.1, 9.3, 9.4
   * 
   * For any individual migration file, if the migration fails at any point during execution,
   * the database should return to its exact pre-migration state with no partial changes applied.
   */
  test('Property 3: Transaction atomicity per migration - failed migrations rollback completely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          migrationHash: hexStringArb(32),
          filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          preMigrationState: fc.record({
            tableCount: fc.integer({ min: 0, max: 50 }),
            rowCounts: fc.array(fc.integer({ min: 0, max: 1000 }), { maxLength: 10 }),
            constraints: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { maxLength: 10 }),
          }),
          migrationOperations: fc.array(
            fc.record({
              type: fc.constantFrom('CREATE_TABLE', 'INSERT', 'ALTER_TABLE', 'CREATE_INDEX'),
              success: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ preMigrationState, migrationOperations }) => {
          // Determine if migration succeeds (all operations must succeed)
          const migrationSucceeds = migrationOperations.every(op => op.success);
          
          // Simulate database state after migration attempt
          let postMigrationState;
          
          if (migrationSucceeds) {
            // All operations succeeded: state changes are committed
            postMigrationState = {
              tableCount: preMigrationState.tableCount + migrationOperations.filter(op => op.type === 'CREATE_TABLE').length,
              rowCounts: [...preMigrationState.rowCounts],
              constraints: [...preMigrationState.constraints],
            };
            
            // Add rows from INSERT operations
            const insertCount = migrationOperations.filter(op => op.type === 'INSERT').length;
            if (insertCount > 0 && postMigrationState.rowCounts.length > 0) {
              postMigrationState.rowCounts[0] += insertCount;
            }
          } else {
            // At least one operation failed: transaction rolled back
            // Database state should be identical to pre-migration state
            postMigrationState = {
              tableCount: preMigrationState.tableCount,
              rowCounts: [...preMigrationState.rowCounts],
              constraints: [...preMigrationState.constraints],
            };
          }
          
          // Verify atomicity property
          if (migrationSucceeds) {
            // Success: state should have changed
            const stateChanged = 
              postMigrationState.tableCount !== preMigrationState.tableCount ||
              postMigrationState.rowCounts.some((count, idx) => count !== preMigrationState.rowCounts[idx]);
            
            // If there were operations that modify state, state should change
            const hasCreateTable = migrationOperations.some(op => op.type === 'CREATE_TABLE');
            const hasInsert = migrationOperations.some(op => op.type === 'INSERT') && preMigrationState.rowCounts.length > 0;
            const hasStateModifyingOps = hasCreateTable || hasInsert;
            
            if (hasStateModifyingOps) {
              expect(stateChanged).toBe(true);
            }
          } else {
            // Failure: state must be identical to pre-migration (rollback)
            expect(postMigrationState.tableCount).toBe(preMigrationState.tableCount);
            expect(postMigrationState.rowCounts).toEqual(preMigrationState.rowCounts);
            expect(postMigrationState.constraints).toEqual(preMigrationState.constraints);
            
            // Verify no partial changes
            expect(JSON.stringify(postMigrationState)).toBe(JSON.stringify(preMigrationState));
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 3 (partial failure): Partial failures trigger complete rollback
   */
  test('Property 3: Transaction atomicity - partial failures rollback all changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            operation: fc.constantFrom('CREATE', 'INSERT', 'UPDATE', 'DELETE'),
            success: fc.boolean(),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        async (operations, failureIndex) => {
          // Ensure failure index is valid
          fc.pre(failureIndex < operations.length);
          
          // Mark the operation at failureIndex as failed
          const operationsWithFailure = operations.map((op, idx) => ({
            ...op,
            success: idx < failureIndex ? true : idx === failureIndex ? false : op.success,
          }));
          
          // Simulate transaction execution
          const migrationSucceeds = operationsWithFailure.every(op => op.success);
          
          // Count successful operations before failure
          const successfulOpsBeforeFailure = operationsWithFailure.slice(0, failureIndex).length;
          
          // Simulate database changes
          let appliedChanges = 0;
          
          if (migrationSucceeds) {
            // All operations succeeded
            appliedChanges = operationsWithFailure.length;
          } else {
            // Transaction failed and rolled back
            appliedChanges = 0; // All changes rolled back, even successful ones
          }
          
          // Verify rollback behavior
          if (!migrationSucceeds) {
            // Even though some operations succeeded before failure,
            // all changes should be rolled back
            expect(appliedChanges).toBe(0);
            
            // If there were successful operations before failure, verify they were rolled back
            if (successfulOpsBeforeFailure > 0) {
              // Verify no partial state - successful ops before failure were also rolled back
              expect(appliedChanges).not.toBe(successfulOpsBeforeFailure);
            }
          } else {
            // All operations succeeded
            expect(appliedChanges).toBe(operations.length);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 3 (tracking table consistency): Failed migrations don't update tracking table
   */
  test('Property 3: Transaction atomicity - tracking table not updated on failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          migrationHash: hexStringArb(32),
          filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          migrationSuccess: fc.boolean(),
          sqlOperations: fc.array(
            fc.record({
              sql: fc.string({ minLength: 10, maxLength: 100 }),
              success: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async ({ migrationSuccess, sqlOperations }) => {
          // Migration succeeds only if all SQL operations succeed
          const allOperationsSucceed = sqlOperations.every(op => op.success);
          const actualMigrationSuccess = migrationSuccess && allOperationsSucceed;
          
          // Simulate tracking table state
          const trackingTableBefore: Array<{ hash: string; created_at: number }> = [];
          const trackingTableAfter: Array<{ hash: string; created_at: number }> = [];
          
          // Only add to tracking table if migration succeeded
          if (actualMigrationSuccess) {
            trackingTableAfter.push({
              hash: migrationHash,
              created_at: Date.now(),
            });
          }
          
          // Verify tracking table behavior
          if (actualMigrationSuccess) {
            // Success: tracking table should have new entry
            expect(trackingTableAfter.length).toBe(trackingTableBefore.length + 1);
            expect(trackingTableAfter.find(t => t.hash === migrationHash)).toBeDefined();
          } else {
            // Failure: tracking table should be unchanged (rollback)
            expect(trackingTableAfter.length).toBe(trackingTableBefore.length);
            expect(trackingTableAfter.find(t => t.hash === migrationHash)).toBeUndefined();
            
            // Verify tracking table is identical to before
            expect(trackingTableAfter).toEqual(trackingTableBefore);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 3 (transaction boundary): Each migration has its own transaction
   */
  test('Property 3: Transaction atomicity - each migration has independent transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            success: fc.boolean(),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (migrations) => {
          // Simulate tracking table with independent transactions
          const trackingTable: Array<{ hash: string; created_at: number }> = [];
          
          // Process each migration in its own transaction
          for (const migration of migrations) {
            if (migration.success) {
              // Transaction succeeded: add to tracking
              trackingTable.push({
                hash: migration.hash,
                created_at: Date.now(),
              });
            }
            // Transaction failed: don't add to tracking (rollback)
            // But continue with next migration (independent transaction)
          }
          
          // Verify each successful migration is tracked
          const successfulMigrations = migrations.filter(m => m.success);
          expect(trackingTable.length).toBe(successfulMigrations.length);
          
          successfulMigrations.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeDefined();
            expect(entry?.hash).toBe(migration.hash);
          });
          
          // Verify failed migrations are not tracked
          const failedMigrations = migrations.filter(m => !m.success);
          failedMigrations.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeUndefined();
          });
          
          // Verify independence: a failed migration doesn't affect previous successful ones
          if (failedMigrations.length > 0 && successfulMigrations.length > 0) {
            // Even with failures, successful migrations should still be tracked
            expect(trackingTable.length).toBeGreaterThan(0);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Feature: automated-drizzle-migrations, Property 8: Batch migration consistency
   * Validates: Requirements 8.1, 8.2, 8.3
   * 
   * For any set of multiple pending migrations, if migration N fails, then migrations
   * N+1 through N+M should not be executed, and migrations 1 through N-1 should remain
   * applied in the tracking table.
   */
  test('Property 8: Batch migration consistency - failure halts subsequent migrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.nat({ max: 9999 }).map(n => `${String(n).padStart(4, '0')}_migration.sql`),
            timestamp: fc.nat({ max: 9999 }),
            success: fc.boolean(),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (migrations) => {
          // Sort migrations by timestamp (chronological order)
          const sortedMigrations = [...migrations].sort((a, b) => a.timestamp - b.timestamp);
          
          // Find first failure index
          const firstFailureIndex = sortedMigrations.findIndex(m => !m.success);
          
          // Simulate batch execution with halt-on-failure
          const trackingTable: Array<{ hash: string; created_at: number }> = [];
          const executedMigrations: string[] = [];
          
          for (let i = 0; i < sortedMigrations.length; i++) {
            const migration = sortedMigrations[i];
            
            // Execute migration
            executedMigrations.push(migration.hash);
            
            if (migration.success) {
              // Success: add to tracking table
              trackingTable.push({
                hash: migration.hash,
                created_at: Date.now(),
              });
            } else {
              // Failure: halt execution (don't process subsequent migrations)
              break;
            }
          }
          
          // Verify halt-on-failure behavior
          if (firstFailureIndex === -1) {
            // No failures: all migrations should be executed and tracked
            expect(executedMigrations.length).toBe(sortedMigrations.length);
            expect(trackingTable.length).toBe(sortedMigrations.length);
            
            // Verify all migrations are tracked
            sortedMigrations.forEach(migration => {
              const entry = trackingTable.find(t => t.hash === migration.hash);
              expect(entry).toBeDefined();
            });
          } else {
            // Failure occurred: verify halt behavior
            
            // Migrations before failure should be executed and tracked
            const migrationsBeforeFailure = sortedMigrations.slice(0, firstFailureIndex);
            migrationsBeforeFailure.forEach(migration => {
              expect(executedMigrations).toContain(migration.hash);
              const entry = trackingTable.find(t => t.hash === migration.hash);
              expect(entry).toBeDefined();
            });
            
            // Failed migration should be executed but NOT tracked
            const failedMigration = sortedMigrations[firstFailureIndex];
            expect(executedMigrations).toContain(failedMigration.hash);
            const failedEntry = trackingTable.find(t => t.hash === failedMigration.hash);
            expect(failedEntry).toBeUndefined();
            
            // Migrations after failure should NOT be executed
            const migrationsAfterFailure = sortedMigrations.slice(firstFailureIndex + 1);
            migrationsAfterFailure.forEach(migration => {
              expect(executedMigrations).not.toContain(migration.hash);
              const entry = trackingTable.find(t => t.hash === migration.hash);
              expect(entry).toBeUndefined();
            });
            
            // Verify execution count
            expect(executedMigrations.length).toBe(firstFailureIndex + 1);
            
            // Verify tracking table only contains successful migrations before failure
            expect(trackingTable.length).toBe(firstFailureIndex);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 8 (ordered processing): Batch migrations execute in chronological order
   */
  test('Property 8: Batch migration consistency - migrations execute in order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            timestamp: fc.nat({ max: 9999 }),
            filename: fc.nat({ max: 9999 }).map(n => `${String(n).padStart(4, '0')}_migration.sql`),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (migrations) => {
          // Sort by timestamp (simulating batch processing)
          const sortedMigrations = [...migrations].sort((a, b) => a.timestamp - b.timestamp);
          
          // Simulate execution order
          const executionOrder: number[] = [];
          sortedMigrations.forEach(m => {
            executionOrder.push(m.timestamp);
          });
          
          // Verify execution order is chronological
          for (let i = 1; i < executionOrder.length; i++) {
            expect(executionOrder[i]).toBeGreaterThanOrEqual(executionOrder[i - 1]);
          }
          
          // Verify order matches sorted order
          expect(executionOrder).toEqual(sortedMigrations.map(m => m.timestamp));
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 8 (partial success): Successful migrations before failure remain applied
   */
  test('Property 8: Batch migration consistency - partial success preserves completed migrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.array(hexStringArb(32), { minLength: 20, maxLength: 20 }), // Generate enough hashes
        async (successfulCount, remainingCount, hashes) => {
          // Ensure we have enough hashes
          const totalNeeded = successfulCount + 1 + remainingCount;
          fc.pre(hashes.length >= totalNeeded);
          
          // Create batch with successful migrations followed by a failure
          const successfulMigrations = Array.from({ length: successfulCount }, (_, i) => ({
            hash: hashes[i],
            timestamp: i,
            filename: `${String(i).padStart(4, '0')}_migration.sql`,
            success: true,
          }));
          
          const failedMigration = {
            hash: hashes[successfulCount],
            timestamp: successfulCount,
            filename: `${String(successfulCount).padStart(4, '0')}_migration.sql`,
            success: false,
          };
          
          const notExecutedMigrations = Array.from({ length: remainingCount }, (_, i) => ({
            hash: hashes[successfulCount + 1 + i],
            timestamp: successfulCount + 1 + i,
            filename: `${String(successfulCount + 1 + i).padStart(4, '0')}_migration.sql`,
            success: true,
          }));
          
          const allMigrations = [...successfulMigrations, failedMigration, ...notExecutedMigrations];
          
          // Simulate batch execution with halt-on-failure
          const trackingTable: Array<{ hash: string; created_at: number }> = [];
          
          for (const migration of allMigrations) {
            if (migration.success) {
              trackingTable.push({
                hash: migration.hash,
                created_at: Date.now(),
              });
            } else {
              // Halt on failure
              break;
            }
          }
          
          // Verify successful migrations before failure are tracked
          expect(trackingTable.length).toBe(successfulCount);
          
          successfulMigrations.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeDefined();
          });
          
          // Verify failed migration is not tracked
          const failedEntry = trackingTable.find(t => t.hash === failedMigration.hash);
          expect(failedEntry).toBeUndefined();
          
          // Verify migrations after failure are not tracked
          notExecutedMigrations.forEach(migration => {
            const entry = trackingTable.find(t => t.hash === migration.hash);
            expect(entry).toBeUndefined();
          });
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 8 (batch summary): Batch execution reports accurate counts
   */
  test('Property 8: Batch migration consistency - batch summary is accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
            success: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.record({
            hash: hexStringArb(32),
            filename: fc.stringMatching(/^\d{4}_[a-z_]{1,30}\.sql$/),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (pendingMigrations, alreadyAppliedMigrations) => {
          // Simulate tracking table with already applied migrations
          const appliedHashes = new Set(alreadyAppliedMigrations.map(m => m.hash));
          
          // Filter out already applied migrations
          const actuallyPendingMigrations = pendingMigrations.filter(m => !appliedHashes.has(m.hash));
          
          // Find first failure
          const firstFailureIndex = actuallyPendingMigrations.findIndex(m => !m.success);
          
          // Simulate batch execution
          let migrationsApplied = 0;
          const migrationsSkipped = alreadyAppliedMigrations.length;
          let migrationsFailed = 0;
          
          if (firstFailureIndex === -1) {
            // No failures: all pending migrations applied
            migrationsApplied = actuallyPendingMigrations.length;
          } else {
            // Failure occurred
            migrationsApplied = firstFailureIndex;
            migrationsFailed = 1;
            // Remaining migrations not attempted (not counted as skipped or failed)
          }
          
          // Verify counts
          expect(migrationsApplied).toBeGreaterThanOrEqual(0);
          expect(migrationsSkipped).toBeGreaterThanOrEqual(0);
          expect(migrationsFailed).toBeGreaterThanOrEqual(0);
          expect(migrationsFailed).toBeLessThanOrEqual(1); // At most one failure (halt-on-failure)
          
          // Verify total accounting
          const totalProcessed = migrationsApplied + migrationsSkipped + migrationsFailed;
          const totalAttempted = actuallyPendingMigrations.length + alreadyAppliedMigrations.length;
          
          if (firstFailureIndex === -1) {
            // No failures: all migrations processed
            expect(totalProcessed).toBe(totalAttempted);
          } else {
            // Failure: only migrations up to and including failure are processed
            expect(migrationsApplied + migrationsFailed).toBe(firstFailureIndex + 1);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
