# Design Document

## Overview

This design document describes an enhanced automated CI/CD pipeline system that executes Drizzle ORM database migrations on remote Supabase databases when code is pushed to `develop` or `main` branches. The system builds upon the existing GitHub Actions workflows and migration scripts to provide robust, production-safe database schema deployment with comprehensive error handling, logging, and validation.

The solution leverages GitHub Actions for orchestration, Drizzle ORM's built-in migration tracking for idempotency, and PostgreSQL transactions for atomicity. The design ensures that database schema changes are deployed safely before application code, with different database targets for development and production environments.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Developer Workflow                                                 │
│  - Edit schema files (src/server/db/schema/*.ts)                   │
│  - Generate migrations (bun run db:generate)                        │
│  - Commit migration files (drizzle/*.sql)                           │
│  - Push to develop or main branch                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow Trigger                                    │
│  - Detects push to develop or main                                  │
│  - Determines target environment (Preview/Production)               │
│  - Loads appropriate secrets (DEV_DIRECT_URL/PROD_DIRECT_URL)      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Migration Runner (scripts/migrate.ts)                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 1. Validate Environment                                        │ │
│  │    - Check DIRECT_URL exists                                   │ │
│  │    - Verify database connectivity                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 2. Scan Migration Files                                        │ │
│  │    - Read drizzle/*.sql files                                  │ │
│  │    - Sort by timestamp                                         │ │
│  │    - Validate file integrity                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 3. Query Applied Migrations                                    │ │
│  │    - Read drizzle.__drizzle_migrations table                   │ │
│  │    - Build list of applied migration hashes                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 4. Execute Pending Migrations                                  │ │
│  │    - For each unapplied migration:                             │ │
│  │      • Begin transaction                                       │ │
│  │      • Execute SQL                                             │ │
│  │      • Record in tracking table                                │ │
│  │      • Commit transaction                                      │ │
│  │    - On error: rollback and halt                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 5. Report Results                                              │ │
│  │    - Log migration summary                                     │ │
│  │    - Generate GitHub Actions summary                           │ │
│  │    - Exit with appropriate code                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Deployment Phase (Vercel)                                          │
│  - Only proceeds if migrations succeed                              │
│  - Deploys application code to matching environment                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   GitHub     │      │   GitHub     │      │  Migration   │
│   Push       │─────▶│   Actions    │─────▶│   Runner     │
│              │      │   Workflow   │      │   Script     │
└──────────────┘      └──────────────┘      └──────────────┘
                             │                      │
                             │                      ▼
                             │              ┌──────────────┐
                             │              │   Drizzle    │
                             │              │     ORM      │
                             │              └──────────────┘
                             │                      │
                             │                      ▼
                             │              ┌──────────────┐
                             │              │  Supabase    │
                             │              │  PostgreSQL  │
                             │              └──────────────┘
                             ▼
                      ┌──────────────┐
                      │    Vercel    │
                      │  Deployment  │
                      └──────────────┘
```

## Components and Interfaces

### 1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Purpose**: Orchestrates the migration and deployment process based on branch.

**Responsibilities**:
- Detect push events to develop or main branches
- Set up Node.js/Bun environment
- Install dependencies
- Load environment-specific secrets
- Execute migration runner script
- Generate workflow summary
- Trigger Vercel deployment on success

**Interface**:
```yaml
# Inputs (from GitHub context)
- github.ref: Branch reference
- github.sha: Commit SHA
- secrets.DEV_DIRECT_URL: Dev database connection string
- secrets.PROD_DIRECT_URL: Prod database connection string

# Outputs
- Migration success/failure status
- GitHub Actions step summary
- Exit code (0 = success, 1 = failure)
```

**Jobs**:
- `migrate-preview`: Runs for develop and feature branches
- `migrate-production`: Runs for main branch only

### 2. Migration Runner Script (`scripts/migrate.ts`)

**Purpose**: Executes database migrations using Drizzle ORM.

**Responsibilities**:
- Validate environment configuration
- Establish database connection
- Read migration files from drizzle directory
- Query applied migrations from tracking table
- Execute pending migrations in order
- Handle errors and rollbacks
- Log execution details
- Report results

**Interface**:
```typescript
// Environment Variables (Input)
interface MigrationEnvironment {
  DIRECT_URL: string;  // PostgreSQL connection string
}

// Exit Codes (Output)
enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1
}

// Console Output
interface MigrationLog {
  level: 'info' | 'error' | 'success';
  message: string;
  timestamp: Date;
}
```

**Dependencies**:
- `drizzle-orm/postgres-js`: ORM and migration functions
- `postgres`: PostgreSQL client
- `dotenv`: Environment variable loading

### 3. Drizzle ORM Migration System

**Purpose**: Provides migration execution and tracking functionality.

**Responsibilities**:
- Read SQL migration files
- Track applied migrations in database
- Execute migrations within transactions
- Handle migration ordering
- Provide idempotency guarantees

**Interface**:
```typescript
// Drizzle migrate() function
async function migrate(
  db: PostgresJsDatabase,
  config: { migrationsFolder: string }
): Promise<void>

// Migration tracking table schema
interface DrizzleMigration {
  id: number;
  hash: string;
  created_at: number;
}
```

### 4. Migration Files (`drizzle/*.sql`)

**Purpose**: Contain versioned database schema changes.

**Format**:
```
drizzle/
├── 0000_initial_schema.sql
├── 0001_add_users_table.sql
├── 0002_add_projects_table.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

**Naming Convention**: `{timestamp}_{description}.sql`

**Content Structure**:
```sql
-- Migration: Add users table
-- Generated: 2024-01-15T10:30:00Z

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "users_email_idx" ON "users" ("email");
```

### 5. Supabase PostgreSQL Database

**Purpose**: Target database for migration execution.

**Environments**:
- **Dev**: `vgmarozegrghrpgopmbs.supabase.co`
- **Prod**: `nkkwmkrzhilpcxrjqxrb.supabase.co`

**Migration Tracking Table**:
```sql
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
```

## Data Models

### Migration File Model

```typescript
interface MigrationFile {
  filename: string;        // e.g., "0001_add_users.sql"
  filepath: string;        // Full path to file
  timestamp: number;       // Extracted from filename
  description: string;     // Human-readable description
  sql: string;            // SQL content
  hash: string;           // Content hash for tracking
}
```

### Migration Execution Result

```typescript
interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  migrationsSkipped: number;
  executionTime: number;  // milliseconds
  errors: MigrationError[];
}

interface MigrationError {
  migrationFile: string;
  errorMessage: string;
  sqlState?: string;
  lineNumber?: number;
  stackTrace?: string;
}
```

### Workflow Context

```typescript
interface WorkflowContext {
  branch: string;          // develop or main
  commitSha: string;       // Git commit hash
  environment: 'Preview' | 'Production';
  databaseUrl: string;     // Connection string
  timestamp: Date;         // Workflow start time
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Migration idempotency

*For any* set of migration files and any database state, running the migration system multiple times should result in the same final database schema, with previously applied migrations being skipped.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 2: Migration ordering consistency

*For any* set of migration files, the migration system should always execute them in the same chronological order based on their timestamp prefixes, regardless of filesystem ordering.

**Validates: Requirements 1.3**

### Property 3: Transaction atomicity per migration

*For any* individual migration file, if the migration fails at any point during execution, the database should return to its exact pre-migration state with no partial changes applied.

**Validates: Requirements 9.1, 9.3, 9.4**

### Property 4: Environment isolation

*For any* push to the develop branch, migrations should only affect the dev database, and *for any* push to the main branch, migrations should only affect the prod database, with no cross-contamination.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 5: Deployment blocking on failure

*For any* migration execution that fails, the subsequent Vercel deployment step should not execute, ensuring that application code is never deployed with an incompatible database schema.

**Validates: Requirements 1.5, 5.3**

### Property 6: Migration tracking consistency

*For any* successfully applied migration, the migration tracking table should contain exactly one entry for that migration, and *for any* failed migration, the tracking table should not contain an entry.

**Validates: Requirements 4.5, 9.2, 9.5**

### Property 7: Error message completeness

*For any* migration failure, the error output should contain sufficient information (SQL error, line number, migration file name) to diagnose the issue without requiring additional database queries.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: Batch migration consistency

*For any* set of multiple pending migrations, if migration N fails, then migrations N+1 through N+M should not be executed, and migrations 1 through N-1 should remain applied in the tracking table.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 9: Configuration validation completeness

*For any* workflow execution, if the DIRECT_URL environment variable is missing or invalid, the migration system should fail before attempting any database operations.

**Validates: Requirements 2.1, 2.2**

### Property 10: Log output completeness

*For any* migration execution, the log output should contain the branch name, commit SHA, count of applied migrations, and execution status for each migration file processed.

**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

## Error Handling

### Error Categories

#### 1. Configuration Errors
- **Missing DIRECT_URL**: Exit immediately with clear error message
- **Invalid database URL format**: Fail with URL parsing error
- **Missing GitHub secrets**: Fail workflow with secret configuration guidance

**Handling Strategy**: Fail fast before any database operations

#### 2. Connection Errors
- **Database unreachable**: Retry with exponential backoff (3 attempts)
- **Authentication failure**: Fail with credential error message
- **Network timeout**: Fail with timeout duration and retry suggestion

**Handling Strategy**: Retry transient errors, fail on persistent errors

#### 3. Migration Execution Errors
- **SQL syntax error**: Rollback transaction, log SQL error with line number
- **Constraint violation**: Rollback transaction, log constraint details
- **Foreign key violation**: Rollback transaction, log referenced table/column
- **Timeout during execution**: Rollback transaction, log timeout duration

**Handling Strategy**: Rollback current migration, halt subsequent migrations

#### 4. File System Errors
- **Migration directory not found**: Fail with directory path error
- **Migration file unreadable**: Skip file with warning, continue
- **Malformed migration filename**: Skip file with warning, continue

**Handling Strategy**: Fail on critical errors, warn on non-critical

### Error Recovery Procedures

#### Automatic Recovery
1. **Transient connection errors**: Retry with backoff
2. **Lock timeout**: Retry after delay
3. **Empty migration file**: Skip and continue

#### Manual Recovery Required
1. **SQL syntax error**: Developer fixes SQL and re-pushes
2. **Constraint violation**: Developer adjusts migration logic
3. **Data migration failure**: Developer creates rollback migration

### Error Logging Format

```typescript
interface ErrorLog {
  timestamp: string;
  level: 'ERROR';
  context: {
    branch: string;
    commit: string;
    environment: string;
    migrationFile?: string;
  };
  error: {
    type: string;
    message: string;
    sqlState?: string;
    lineNumber?: number;
    stackTrace: string;
  };
  troubleshooting: string[];
}
```

### GitHub Actions Error Annotations

```typescript
// Error annotation format
console.error(`::error file=${migrationFile},line=${lineNumber}::${errorMessage}`);

// Warning annotation format
console.warn(`::warning file=${migrationFile}::${warningMessage}`);
```

## Testing Strategy

### Unit Testing

**Test Framework**: Vitest with pg-mem (in-memory PostgreSQL)

**Test Coverage**:
1. **Migration Runner Script**
   - Environment validation logic
   - Database connection handling
   - Error message formatting
   - Exit code generation

2. **Migration File Parsing**
   - Filename parsing and validation
   - Timestamp extraction
   - SQL content reading

3. **Error Handling**
   - Configuration error detection
   - SQL error parsing
   - Rollback logic

**Example Unit Tests**:
```typescript
describe('Migration Runner', () => {
  it('should fail when DIRECT_URL is missing', () => {
    delete process.env.DIRECT_URL;
    expect(() => runMigrations()).toThrow('DIRECT_URL environment variable is not set');
  });

  it('should parse migration filename correctly', () => {
    const filename = '0001_add_users_table.sql';
    const parsed = parseMigrationFilename(filename);
    expect(parsed.timestamp).toBe(1);
    expect(parsed.description).toBe('add_users_table');
  });

  it('should format SQL error with line number', () => {
    const error = new Error('syntax error at or near "CREAT"');
    const formatted = formatSQLError(error, 'migration.sql', 5);
    expect(formatted).toContain('migration.sql');
    expect(formatted).toContain('line 5');
  });
});
```

### Property-Based Testing

**Test Framework**: fast-check

**Property Tests**:
1. Migration idempotency property
2. Migration ordering property
3. Transaction atomicity property
4. Environment isolation property

**Example Property Test**:
```typescript
import fc from 'fast-check';

describe('Migration Properties', () => {
  it('should be idempotent - running twice produces same result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          filename: fc.string(),
          sql: fc.string()
        })),
        async (migrations) => {
          const db = createTestDatabase();
          
          // Run migrations first time
          const result1 = await runMigrations(db, migrations);
          
          // Run migrations second time
          const result2 = await runMigrations(db, migrations);
          
          // Second run should skip all migrations
          expect(result2.migrationsApplied).toBe(0);
          expect(result2.migrationsSkipped).toBe(migrations.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Test Environment**: Local Supabase instance via `supabase start`

**Test Scenarios**:
1. **Happy Path**: Multiple migrations execute successfully
2. **Partial Failure**: First migration succeeds, second fails, third doesn't run
3. **Retry After Failure**: Fix failed migration and re-run successfully
4. **Empty Migration Directory**: No migrations to apply
5. **All Migrations Applied**: All migrations already in tracking table

**Example Integration Test**:
```typescript
describe('Migration Integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('should apply multiple migrations in order', async () => {
    // Create test migrations
    await createMigrationFile('0001_create_users.sql', 'CREATE TABLE users...');
    await createMigrationFile('0002_create_projects.sql', 'CREATE TABLE projects...');
    
    // Run migrations
    const result = await runMigrations();
    
    // Verify
    expect(result.success).toBe(true);
    expect(result.migrationsApplied).toBe(2);
    
    // Verify tables exist
    const tables = await queryTables();
    expect(tables).toContain('users');
    expect(tables).toContain('projects');
  });

  it('should rollback failed migration', async () => {
    await createMigrationFile('0001_invalid.sql', 'INVALID SQL SYNTAX');
    
    const result = await runMigrations();
    
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    
    // Verify no partial changes
    const tables = await queryTables();
    expect(tables).toHaveLength(0);
  });
});
```

### End-to-End Testing

**Test Environment**: GitHub Actions with test database

**Test Scenarios**:
1. **Develop Branch Push**: Migrations run on dev database
2. **Main Branch Push**: Migrations run on prod database
3. **Migration Failure**: Workflow fails and deployment is blocked
4. **Multiple Commits**: Sequential pushes apply migrations correctly

**Test Approach**:
- Use GitHub Actions workflow dispatch for manual testing
- Create test branches with known migration files
- Verify workflow logs and database state
- Clean up test data after verification

### Manual Testing Checklist

Before production deployment:
- [ ] Test migration on local database
- [ ] Test migration on dev Supabase database
- [ ] Verify migration rollback works
- [ ] Check GitHub Actions logs are clear
- [ ] Verify error messages are helpful
- [ ] Test with multiple pending migrations
- [ ] Test with no pending migrations
- [ ] Test with invalid SQL syntax
- [ ] Test with missing environment variables
- [ ] Verify Vercel deployment blocks on failure
