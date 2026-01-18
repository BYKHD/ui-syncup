# Requirements Document: CLI Phase 1 – Self-Hosting Commands

## Introduction

The UI SyncUp CLI provides a streamlined experience for self-hosting the application. Phase 1 focuses on the essential lifecycle commands that enable developers to initialize, start, stop, reset, and fully purge a local development environment.

**Business Value:**
- Reduce self-hosting setup errors and GitHub support issues
- Make local development predictable and easy
- Support infrastructure automation and CI/CD workflows
- Provide safe defaults while maintaining flexibility

**Problem Statement:**
Currently, self-hosting requires manual execution of multiple scripts, environment file management, and coordination of Docker/Supabase services. This creates friction and increases the likelihood of misconfiguration.

**Scope:**
This specification covers the Phase 1 CLI commands: `init`, `up`, `down`, `reset`, and `purge`.

---

## Glossary

- **System**: The UI SyncUp CLI application
- **User**: A developer self-hosting UI SyncUp locally or in production
- **Local Stack**: The collection of services required to run UI SyncUp locally (database, storage, app server)
- **Docker**: Container runtime used to run local services
- **Supabase CLI**: Tool providing local PostgreSQL, Auth, and Storage services
- **Bun**: JavaScript runtime and package manager used by the project
- **Environment File**: Configuration file (`.env.local`, `.env.production`) containing service credentials
- **Safe Default**: A configuration value that works out-of-the-box without external dependencies

---

## Requirements

### Requirement 1: Project Initialization (`init`)

**User Story:** As a developer, I want to initialize a new UI SyncUp project with safe defaults, so that I can start local development without manual configuration.

#### Acceptance Criteria

1. WHEN the User executes `ui-syncup init` THEN the System SHALL detect system requirements (Bun runtime, Docker availability, port availability)
2. WHEN system requirements are not met THEN the System SHALL display a descriptive error message indicating which requirement failed
3. WHEN the User executes `ui-syncup init` THEN the System SHALL prompt for setup mode selection (local or production)
4. WHEN the User selects local mode THEN the System SHALL generate `.env.local` with safe defaults for local development
5. WHEN the User selects production mode THEN the System SHALL prompt for external service credentials (database URL, storage provider)
6. WHEN the System generates environment files THEN the System SHALL NOT overwrite existing environment files without confirmation
7. WHEN the User confirms overwriting existing files THEN the System SHALL create a backup of the original files with timestamp suffix
8. THE System SHALL create required storage directories (`storage/uploads`, `storage/avatars`) if they do not exist
9. THE System SHALL generate `docker-compose.override.yml` for local environment customization
10. WHEN initialization completes successfully THEN the System SHALL display a summary of created files and next steps
11. IF an error occurs during initialization THEN the System SHALL rollback any partially created files and display a descriptive error message

---

### Requirement 2: Stack Startup (`up`)

**User Story:** As a developer, I want to start the local development stack with a single command, so that I can begin development quickly.

#### Acceptance Criteria

1. WHEN the User executes `ui-syncup up` THEN the System SHALL start Docker services defined in docker-compose files
2. WHEN Docker is not running THEN the System SHALL display an error message instructing the User to start Docker
3. WHEN services are starting THEN the System SHALL wait for database readiness with a configurable timeout of 60 seconds
4. IF the database does not become ready within the timeout THEN the System SHALL display a timeout error with troubleshooting suggestions
5. WHEN the database is ready THEN the System SHALL run pending database migrations automatically
6. WHEN migrations fail THEN the System SHALL display the migration error and exit with non-zero status code
7. WHEN the stack is fully started THEN the System SHALL display service URLs (app, studio, API)
8. WHEN no admin user exists in the database THEN the System SHALL seed an admin user and display the generated credentials
9. WHEN an admin user already exists THEN the System SHALL skip admin seeding and display a message indicating the admin exists
10. THE System SHALL display the admin credentials in a clearly formatted output block
11. WHILE services are starting THEN the System SHALL display progress indicators for each service

---

### Requirement 3: Stack Shutdown (`down`)

**User Story:** As a developer, I want to stop all local services with a single command, so that I can free system resources when not developing.

#### Acceptance Criteria

1. WHEN the User executes `ui-syncup down` THEN the System SHALL stop all running Docker services
2. WHEN no services are running THEN the System SHALL display a message indicating no services to stop
3. WHEN services are stopped THEN the System SHALL display confirmation of stopped services
4. THE System SHALL NOT remove Docker volumes when stopping services (preserving data)
5. IF an error occurs while stopping services THEN the System SHALL display the error and attempt to stop remaining services

---

### Requirement 4: Environment Reset (`reset`)

**User Story:** As a developer, I want to reset my local environment to a clean state while preserving configuration, so that I can start fresh with test data.

#### Acceptance Criteria

1. WHEN the User executes `ui-syncup reset` THEN the System SHALL prompt for confirmation before proceeding
2. THE System SHALL NOT provide a `--force` flag to bypass confirmation for reset operations
3. WHEN the User confirms reset THEN the System SHALL stop all running services
4. WHEN services are stopped THEN the System SHALL delete the local database data
5. WHEN database is deleted THEN the System SHALL delete uploaded files from storage directories
6. WHEN data is deleted THEN the System SHALL remove Docker containers
7. THE System SHALL NOT delete Docker volumes during reset (only database data)
8. THE System SHALL NOT delete environment files (`.env.local`, `.env.production`) during reset
9. THE System SHALL NOT delete `docker-compose.override.yml` during reset
10. WHEN reset completes THEN the System SHALL display confirmation and instructions to start fresh with `ui-syncup up`
11. IF an error occurs during reset THEN the System SHALL display the error and indicate which step failed

---

### Requirement 5: Factory Purge (`purge`)

**User Story:** As a developer, I want to completely remove all traces of the local installation, so that I can start from absolute zero as if I never ran `init`.

#### Acceptance Criteria

1. WHEN the User executes `ui-syncup purge` THEN the System SHALL display a warning about the irreversible nature of the operation
2. THE System SHALL require the User to type a confirmation phrase ("purge ui-syncup") to proceed
3. WHEN the confirmation phrase does not match THEN the System SHALL abort the operation
4. WHEN running in a production environment (detected via environment variables or flags) THEN the System SHALL block the purge operation and display an error
5. WHEN the User confirms purge THEN the System SHALL stop all Docker containers
6. WHEN containers are stopped THEN the System SHALL remove Docker volumes
7. WHEN volumes are removed THEN the System SHALL remove Docker images related to the project
8. WHEN Docker resources are removed THEN the System SHALL delete all storage directories (`storage/*`)
9. WHEN storage is deleted THEN the System SHALL delete environment files (`.env.local`, `.env.production`)
10. WHEN environment files are deleted THEN the System SHALL delete `docker-compose.override.yml`
11. WHEN purge completes THEN the System SHALL display confirmation that factory reset is complete and instruct User to run `ui-syncup init` to start fresh
12. IF an error occurs during purge THEN the System SHALL continue with remaining cleanup steps and report all errors at the end

---

### Requirement 6: CLI Framework and User Experience

**User Story:** As a developer, I want a consistent and intuitive CLI experience, so that I can use the tool efficiently.

#### Acceptance Criteria

1. THE System SHALL support execution via `bunx ui-syncup <command>`
2. THE System SHALL display help text when executed with `--help` flag
3. THE System SHALL display version information when executed with `--version` flag
4. WHEN an unknown command is provided THEN the System SHALL display an error with available commands
5. THE System SHALL use colored output for success (green), warnings (yellow), and errors (red)
6. THE System SHALL support a `--no-color` flag to disable colored output for CI environments
7. WHEN commands require confirmation THEN the System SHALL accept input from stdin for automation
8. THE System SHALL exit with status code 0 on success and non-zero on failure
9. THE System SHALL log operations with appropriate verbosity levels (normal, verbose with `--verbose`)
10. WHEN running in CI environment (detected via `CI` environment variable) THEN the System SHALL use non-interactive mode by default

---

### Requirement 7: Error Handling and Recovery

**User Story:** As a developer, I want clear error messages and recovery guidance, so that I can resolve issues independently.

#### Acceptance Criteria

1. WHEN an error occurs THEN the System SHALL display a human-readable error message
2. WHEN an error is recoverable THEN the System SHALL suggest recovery steps
3. THE System SHALL NOT expose stack traces unless `--verbose` flag is provided
4. WHEN external commands fail THEN the System SHALL capture and display the relevant error output
5. THE System SHALL log all operations to enable debugging when `--verbose` is enabled
6. IF a partial operation fails THEN the System SHALL indicate what was completed and what failed
7. WHEN a network operation fails THEN the System SHALL retry up to 3 times with exponential backoff (1s, 2s, 4s)
8. WHEN offline and Docker images are required THEN the System SHALL use cached Docker images if available
9. IF all network retries fail THEN the System SHALL display a clear message indicating network issue and suggest checking connectivity

---

### Requirement 8: Versioning and Compatibility

**User Story:** As a developer, I want clear versioning and compatibility information, so that I can safely update my installation and understand breaking changes.

#### Acceptance Criteria

1. THE System SHALL follow Semantic Versioning (MAJOR.MINOR.PATCH)
2. THE System SHALL display deprecation warnings 2 minor versions before feature removal
3. WHEN a breaking change is introduced THEN the System SHALL increment the MAJOR version
4. THE System SHALL include a schema version field in generated configuration files
5. WHEN loading a configuration file with an older schema version THEN the System SHALL attempt automatic migration
6. IF automatic migration fails THEN the System SHALL display clear instructions for manual migration

---

### Requirement 9: Configuration File Support

**User Story:** As a developer, I want to save my preferences in a configuration file, so that I don't have to specify options repeatedly.

#### Acceptance Criteria

1. THE System SHALL support `ui-syncup.config.json` for project-level configuration
2. THE configuration file SHALL include a `version` field for schema versioning
3. THE configuration file MAY include default settings for `mode`, `ports`, and `verbose`
4. THE configuration precedence SHALL be: CLI flags > Environment variables > Config file > Built-in defaults
5. WHEN `ui-syncup init` completes THEN the System SHALL create a default `ui-syncup.config.json`
6. THE System SHALL validate the configuration file on load and display errors for invalid fields

---

## Non-Functional Requirements

### Performance

1. THE System SHALL complete the `init` command in less than 30 seconds on typical hardware
2. THE System SHALL complete the `down` command in less than 15 seconds
3. THE System SHALL provide progress feedback for any operation taking longer than 2 seconds

### Compatibility

1. THE System SHALL support macOS, Linux, and Windows (WSL2)
2. THE System SHALL require Bun version 1.0 or higher
3. THE System SHALL require Docker Engine version 20.0 or higher

### Security

1. THE System SHALL NOT log sensitive credentials to console output
2. THE System SHALL generate cryptographically secure passwords for seeded admin users
3. THE System SHALL set appropriate file permissions (600) on generated environment files

---

## Out of Scope (Phase 2 and beyond)

- `doctor` command for environment diagnostics
- `migrate` command for manual migration execution
- `version --check` command for update notifications
- `logs` command for service log tailing
- `backup` and `restore` commands
- `secrets` management command
- `export` configuration command
- Optional telemetry with opt-in
- Plugin/extension architecture

