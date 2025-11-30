# Requirements Document

## Introduction

This specification defines an enhanced automated CI/CD pipeline system that automatically applies Drizzle ORM database migrations to remote Supabase databases when code is pushed to the `develop` or `main` branches. The system ensures database schema changes are safely and reliably deployed alongside application code, with proper validation, error handling, and rollback capabilities.

## Glossary

- **CI/CD Pipeline**: Continuous Integration/Continuous Deployment automated workflow system
- **Drizzle ORM**: TypeScript ORM (Object-Relational Mapping) library used for database schema management
- **Migration**: A versioned database schema change file that can be applied to update database structure
- **GitHub Actions**: GitHub's CI/CD automation platform that executes workflows
- **Supabase**: PostgreSQL database hosting platform with development and production environments
- **Preview Environment**: Development/staging environment connected to the dev Supabase database
- **Production Environment**: Live production environment connected to the prod Supabase database
- **Migration Runner**: The automated script that executes pending database migrations
- **Migration Tracking Table**: Database table (`drizzle.__drizzle_migrations`) that records applied migrations
- **DIRECT_URL**: PostgreSQL connection string environment variable for database access
- **Rollback**: The process of reverting a failed migration to restore previous database state

## Requirements

### Requirement 1

**User Story:** As a developer, I want database migrations to run automatically when I push code to develop or main branches, so that database schema changes are deployed without manual intervention.

#### Acceptance Criteria

1. WHEN a developer pushes code to the develop branch THEN the Migration Runner SHALL execute all pending migrations against the dev Supabase database
2. WHEN a developer pushes code to the main branch THEN the Migration Runner SHALL execute all pending migrations against the prod Supabase database
3. WHEN migrations are executed THEN the Migration Runner SHALL apply migrations in chronological order based on migration file timestamps
4. WHEN all migrations complete successfully THEN the GitHub Actions workflow SHALL proceed to the Vercel deployment step
5. WHEN any migration fails THEN the GitHub Actions workflow SHALL halt and prevent deployment

### Requirement 2

**User Story:** As a developer, I want the migration system to validate database connectivity before running migrations, so that I receive clear error messages if configuration is incorrect.

#### Acceptance Criteria

1. WHEN the Migration Runner starts THEN the system SHALL verify that the DIRECT_URL environment variable is configured
2. WHEN the DIRECT_URL is missing or empty THEN the system SHALL fail with a clear error message indicating the missing configuration
3. WHEN the Migration Runner attempts database connection THEN the system SHALL verify connectivity before executing migrations
4. WHEN database connection fails THEN the system SHALL report the connection error with diagnostic information
5. WHEN database credentials are invalid THEN the system SHALL fail with an authentication error message

### Requirement 3

**User Story:** As a developer, I want to see detailed migration execution logs in GitHub Actions, so that I can understand what changes were applied and troubleshoot failures.

#### Acceptance Criteria

1. WHEN migrations execute THEN the Migration Runner SHALL log the branch name and commit SHA
2. WHEN each migration file is processed THEN the system SHALL log the migration filename and execution status
3. WHEN a migration succeeds THEN the system SHALL log a success message with the migration name
4. WHEN a migration fails THEN the system SHALL log the complete error message and stack trace
5. WHEN all migrations complete THEN the system SHALL generate a summary report in the GitHub Actions step summary

### Requirement 4

**User Story:** As a developer, I want the system to detect and skip already-applied migrations, so that migrations are idempotent and safe to re-run.

#### Acceptance Criteria

1. WHEN the Migration Runner starts THEN the system SHALL query the Migration Tracking Table for applied migrations
2. WHEN a migration file exists in the drizzle directory THEN the system SHALL check if it has been applied previously
3. WHEN a migration has been applied previously THEN the system SHALL skip that migration
4. WHEN a migration has not been applied THEN the system SHALL execute that migration
5. WHEN a migration completes successfully THEN the system SHALL record the migration in the Migration Tracking Table

### Requirement 5

**User Story:** As a developer, I want migrations to run before application deployment, so that the database schema is updated before new code that depends on it goes live.

#### Acceptance Criteria

1. WHEN code is pushed to develop or main THEN the migration job SHALL execute before the Vercel deployment
2. WHEN migrations succeed THEN the Vercel deployment SHALL proceed automatically
3. WHEN migrations fail THEN the Vercel deployment SHALL not occur
4. WHEN the migration job is running THEN the GitHub Actions workflow SHALL display the migration status
5. WHEN migrations complete THEN the workflow SHALL transition to the deployment phase

### Requirement 6

**User Story:** As a developer, I want different database targets for develop and main branches, so that development changes don't affect production data.

#### Acceptance Criteria

1. WHEN code is pushed to the develop branch THEN the Migration Runner SHALL use the DEV_DIRECT_URL secret
2. WHEN code is pushed to the main branch THEN the Migration Runner SHALL use the PROD_DIRECT_URL secret
3. WHEN the develop branch workflow runs THEN migrations SHALL apply to the dev Supabase database (vgmarozegrghrpgopmbs)
4. WHEN the main branch workflow runs THEN migrations SHALL apply to the prod Supabase database (nkkwmkrzhilpcxrjqxrb)
5. WHEN environment secrets are accessed THEN the system SHALL use GitHub Environment protection rules (Preview for develop, Production for main)

### Requirement 7

**User Story:** As a developer, I want clear error messages when migrations fail, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. WHEN a migration SQL syntax error occurs THEN the system SHALL display the SQL error message and line number
2. WHEN a migration constraint violation occurs THEN the system SHALL display the constraint name and violation details
3. WHEN a migration timeout occurs THEN the system SHALL display a timeout error with duration information
4. WHEN a migration fails THEN the system SHALL annotate the GitHub Actions log with an error annotation
5. WHEN a migration fails THEN the system SHALL include troubleshooting guidance in the error output

### Requirement 8

**User Story:** As a developer, I want the migration system to handle multiple pending migrations in a single push, so that I can deploy multiple schema changes together.

#### Acceptance Criteria

1. WHEN multiple migration files exist in the drizzle directory THEN the Migration Runner SHALL detect all pending migrations
2. WHEN multiple migrations are pending THEN the system SHALL execute them in chronological order
3. WHEN one migration in a batch fails THEN the system SHALL stop processing subsequent migrations
4. WHEN migrations are executed in batch THEN the system SHALL log progress for each migration
5. WHEN all migrations in a batch succeed THEN the system SHALL report the total count of applied migrations

### Requirement 9

**User Story:** As a developer, I want migration execution to be atomic per migration file, so that partial failures don't leave the database in an inconsistent state.

#### Acceptance Criteria

1. WHEN a migration file is executed THEN the Migration Runner SHALL wrap the migration in a database transaction
2. WHEN a migration succeeds THEN the system SHALL commit the transaction and update the Migration Tracking Table
3. WHEN a migration fails THEN the system SHALL rollback the transaction
4. WHEN a transaction rollback occurs THEN the database SHALL return to its pre-migration state
5. WHEN a migration is rolled back THEN the Migration Tracking Table SHALL not record that migration as applied

### Requirement 10

**User Story:** As a developer, I want the migration system to validate migration file integrity, so that corrupted or malformed migrations are detected before execution.

#### Acceptance Criteria

1. WHEN the Migration Runner scans the drizzle directory THEN the system SHALL verify all migration files have valid SQL syntax
2. WHEN a migration file is empty THEN the system SHALL skip that file with a warning
3. WHEN a migration file contains only comments THEN the system SHALL skip that file with a warning
4. WHEN migration files are detected THEN the system SHALL verify they follow the naming convention (timestamp_description.sql)
5. WHEN migration file validation fails THEN the system SHALL report the validation error before attempting execution
