# Design Document: GitHub Actions CI/CD Pipeline

## Overview

This document describes the design of a GitHub Actions-based CI/CD pipeline for UI SyncUp that automates code quality checks, database migrations, and deployments to Vercel. The pipeline supports two environments (preview and production) with separate Supabase database instances, ensuring safe and reliable deployments with proper rollback capabilities.

The design leverages GitHub Actions for orchestration, Vercel's Git integration for deployments, and Drizzle ORM for database migrations. The system enforces quality gates, environment isolation, and audit trails while maintaining fast feedback loops for developers.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer Workflow                                             │
│  1. Push code to branch (dev, feature/*, main)                 │
│  2. GitHub Actions triggered automatically                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions: Quality Checks (All Branches)                  │
│  - TypeScript type checking (tsc --noEmit)                      │
│  - ESLint linting                                               │
│  - Vitest unit tests                                            │
│  - Next.js production build                                     │
│  Duration: ~3-5 minutes                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼────────┐  ┌──────▼──────────┐
         │  Preview Path     │  │  Production Path│
         │  (dev, feature/*) │  │  (main branch)  │
         └──────────┬────────┘  └──────┬──────────┘
                    │                   │
         ┌──────────▼────────┐  ┌──────▼──────────┐
         │  Run Migrations   │  │  Run Migrations │
         │  on Dev Supabase  │  │  on Prod Supabase│
         │  (DEV_DIRECT_URL) │  │  (PROD_DIRECT_URL)│
         │  Duration: ~1-2min│  │  Duration: ~1-2min│
         └──────────┬────────┘  └──────┬──────────┘
                    │                   │
         ┌──────────▼────────┐  ┌──────▼──────────┐
         │  Vercel Preview   │  │  Vercel Prod    │
         │  Deployment       │  │  Deployment     │
         │  (Automatic)      │  │  (Automatic)    │
         └───────────────────┘  └─────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Repository                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │  .github/       │  │  drizzle/       │  │  src/           ││
│  │  workflows/     │  │  migrations/    │  │  application    ││
│  │  - ci.yml       │  │  - 0001_*.sql   │  │  code           ││
│  │  - deploy.yml   │  │  - 0002_*.sql   │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions Runners                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Environment: ubuntu-latest                                 ││
│  │  Node.js: 20.x                                              ││
│  │  Package Manager: bun                                       ││
│  │  Secrets: DEV_DIRECT_URL, PROD_DIRECT_URL                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  External Services                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Supabase    │  │  Supabase    │  │  Vercel      │         │
│  │  Dev DB      │  │  Prod DB     │  │  Platform    │         │
│  │  (Preview)   │  │  (Production)│  │  (Deployment)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Quality Checks Workflow (`ci.yml`)

**Purpose**: Run automated code quality checks on every push to ensure code meets standards before deployment.

**Triggers**:
- Push to any branch
- Pull request to any branch

**Jobs**:

#### Job: `quality-checks`
- **Runs on**: `ubuntu-latest`
- **Node version**: `20.x`
- **Steps**:
  1. Checkout code
  2. Setup Bun
  3. Install dependencies (with caching)
  4. Run TypeScript type checking
  5. Run ESLint
  6. Run Vitest tests
  7. Run production build

**Outputs**:
- Commit status: success/failure
- Detailed logs for each check
- Test coverage report (optional)

**Interface**:
```yaml
name: CI Quality Checks
on: [push, pull_request]
jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build
```

### 2. Deployment Workflow (`deploy.yml`)

**Purpose**: Run database migrations and trigger Vercel deployments for preview and production environments.

**Triggers**:
- Push to `dev` branch (preview deployment)
- Push to `main` branch (production deployment)
- Push to `feature/*` branches (preview deployment)

**Jobs**:

#### Job: `migrate-preview`
- **Runs on**: `ubuntu-latest`
- **Condition**: Branch is NOT `main`
- **Environment**: `Preview` (GitHub environment)
- **Steps**:
  1. Checkout code
  2. Setup Bun
  3. Install dependencies
  4. Run migrations using `DEV_DIRECT_URL`
  5. Verify migration success

**Secrets Required**:
- `DEV_DIRECT_URL`: Direct connection to dev Supabase database

#### Job: `migrate-production`
- **Runs on**: `ubuntu-latest`
- **Condition**: Branch is `main`
- **Environment**: `Production` (GitHub environment)
- **Steps**:
  1. Checkout code
  2. Setup Bun
  3. Install dependencies
  4. Run migrations using `PROD_DIRECT_URL`
  5. Verify migration success

**Secrets Required**:
- `PROD_DIRECT_URL`: Direct connection to prod Supabase database

**Interface**:
```yaml
name: Deploy
on:
  push:
    branches: [main, dev, 'feature/**']
jobs:
  migrate-preview:
    if: github.ref != 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: Preview
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run db:migrate
        env:
          DIRECT_URL: ${{ secrets.DEV_DIRECT_URL }}
  
  migrate-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: Production
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run db:migrate
        env:
          DIRECT_URL: ${{ secrets.PROD_DIRECT_URL }}
```

### 3. Vercel Integration

**Purpose**: Automatically deploy code to Vercel after migrations succeed.

**Configuration**:
- Vercel is already connected to the GitHub repository
- Production branch: `main`
- Preview branches: All other branches

**Deployment Flow**:
1. GitHub Actions completes migration job
2. Vercel detects push event
3. Vercel builds and deploys application
4. Vercel uses environment variables configured in Vercel dashboard

**Environment Variables** (configured in Vercel):
- **Preview**: `DEV_DATABASE_URL`, `DEV_DIRECT_URL`, and all other dev configs
- **Production**: `PROD_DATABASE_URL`, `PROD_DIRECT_URL`, and all other prod configs

### 4. Drizzle Migration System

**Purpose**: Manage database schema changes safely across environments.

**Configuration** (`drizzle.config.ts`):
```typescript
export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
```

**Migration Commands**:
- `bun run db:generate`: Generate migration SQL from schema changes
- `bun run db:migrate`: Apply pending migrations to database
- `bun run db:push`: Push schema directly (dev only, not used in CI)

**Migration Files**:
- Location: `drizzle/` directory
- Format: `XXXX_migration_name.sql`
- Tracking: `drizzle_migrations` table in database

**Safety Features**:
- Migrations run before deployment
- Failed migrations halt deployment
- Migration history tracked in database
- Rollback requires manual intervention

## Data Models

### GitHub Actions Workflow State

```typescript
interface WorkflowRun {
  id: string
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null
  branch: string
  commit_sha: string
  commit_message: string
  author: string
  created_at: string
  updated_at: string
  jobs: Job[]
}

interface Job {
  id: string
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null
  started_at: string
  completed_at: string
  steps: Step[]
}

interface Step {
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null
  number: number
  started_at: string
  completed_at: string
}
```

### Migration Record

```typescript
interface MigrationRecord {
  id: number
  hash: string
  created_at: string
}
```

This is stored in the `drizzle_migrations` table by Drizzle ORM.

### Deployment Record (Vercel)

```typescript
interface VercelDeployment {
  uid: string
  name: string
  url: string
  created: number
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED'
  type: 'LAMBDAS'
  creator: {
    uid: string
    email: string
    username: string
  }
  meta: {
    githubCommitSha: string
    githubCommitMessage: string
    githubCommitAuthorName: string
    githubCommitRef: string
  }
}
```

## Error Handling

### Migration Failures

**Scenario**: Migration fails during execution

**Detection**:
- Drizzle returns non-zero exit code
- Error message captured in workflow logs

**Response**:
1. Workflow job fails immediately
2. Deployment is halted (Vercel doesn't deploy)
3. Commit status marked as failed
4. Developer receives notification

**Recovery**:
1. Review migration error in workflow logs
2. Fix migration SQL or schema
3. Commit fix and push
4. Workflow re-runs automatically

**Example Error Handling**:
```yaml
- name: Run migrations
  run: bun run db:migrate
  env:
    DIRECT_URL: ${{ secrets.DEV_DIRECT_URL }}
  continue-on-error: false  # Halt on failure
```

### Quality Check Failures

**Scenario**: TypeScript, ESLint, or tests fail

**Detection**:
- Command returns non-zero exit code
- Error output captured in logs

**Response**:
1. Workflow job fails
2. Commit status marked as failed
3. Pull request blocked from merging (if branch protection enabled)

**Recovery**:
1. Review error logs
2. Fix code issues locally
3. Commit and push fix
4. Workflow re-runs automatically

### Vercel Deployment Failures

**Scenario**: Vercel build or deployment fails

**Detection**:
- Vercel reports deployment status as "ERROR"
- Vercel posts comment on PR with error details

**Response**:
1. Previous deployment remains active
2. Developer investigates Vercel logs
3. Fix code and push again

**Recovery**:
- Automatic: Push fix to trigger new deployment
- Manual: Rollback to previous deployment via Vercel dashboard

### Environment Secret Missing

**Scenario**: Required GitHub secret not configured

**Detection**:
- Workflow attempts to access undefined secret
- Migration command fails with connection error

**Response**:
1. Workflow fails with clear error message
2. Logs indicate missing secret

**Recovery**:
1. Add secret to GitHub repository settings
2. Navigate to Settings → Secrets and variables → Actions
3. Add secret to appropriate environment (Preview/Production)
4. Re-run workflow

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria, many requirements relate to external system behavior (Vercel's deployment, GitHub's branch protection, GitHub Actions default behaviors) or are configuration/documentation concerns rather than testable properties of our workflow code. The testable properties focus on workflow configuration correctness and error handling behavior.

### Property 1: Quality checks workflow triggers on all branches

*For any* branch push or pull request event, the CI quality checks workflow should be triggered and execute all quality check steps (TypeScript, ESLint, tests, build).

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Failed quality checks prevent workflow success

*For any* quality check step that fails (returns non-zero exit code), the workflow should mark the overall job as failed and set the commit status to failure.

**Validates: Requirements 1.5**

### Property 3: Preview migrations use dev environment

*For any* push to a non-main branch, the migration job should reference the Preview GitHub environment and use the DEV_DIRECT_URL secret.

**Validates: Requirements 2.1, 4.5, 5.1**

### Property 4: Production migrations use prod environment

*For any* push to the main branch, the migration job should reference the Production GitHub environment and use the PROD_DIRECT_URL secret.

**Validates: Requirements 3.2, 4.6, 5.2**

### Property 5: Migration failures halt deployment

*For any* migration command that fails (returns non-zero exit code), the workflow should exit immediately without proceeding to subsequent steps, and mark the job as failed.

**Validates: Requirements 2.5, 3.5, 4.3**

### Property 6: Migration commands use Drizzle

*For any* migration job, the workflow should execute the `bun run db:migrate` command with the DIRECT_URL environment variable set.

**Validates: Requirements 4.1**

### Property 7: Migration output is logged

*For any* migration execution, the workflow logs should contain the output from the Drizzle migration command, including which migrations were applied.

**Validates: Requirements 4.2, 10.3**

### Property 8: Missing secrets cause workflow failure

*For any* workflow run where a required secret (DEV_DIRECT_URL or PROD_DIRECT_URL) is not configured, the workflow should fail with an error indicating the missing secret.

**Validates: Requirements 5.4**

### Property 9: Dependency caching is configured

*For any* workflow that installs dependencies, the workflow should use Bun's built-in caching mechanism to cache dependencies between runs.

**Validates: Requirements 9.3**

### Property 10: Jobs execute in correct sequence

*For any* deployment workflow run, the migration job should complete before Vercel's deployment begins (enforced by Vercel detecting the push only after GitHub Actions completes).

**Validates: Requirements 2.2, 3.3**

**Note on Testing Approach**: These properties will be validated through:
1. **Workflow YAML validation**: Using GitHub Actions CLI or schema validation
2. **Integration testing**: Triggering workflows on test branches and verifying behavior
3. **Manual verification**: Reviewing workflow runs in GitHub Actions UI

Many acceptance criteria (6.1-6.5, 7.1-7.5, 8.1-8.5, 9.1-9.2, 9.5, 10.1-10.2, 10.4-10.5) relate to external system behavior (GitHub's branch protection, Vercel's deployment, GitHub Actions infrastructure) or are operational procedures rather than testable properties of our workflow code. These are addressed through proper configuration and documentation rather than automated testing.

## Testing Strategy

### Unit Testing

**Scope**: Test individual workflow components and scripts

**Approach**:
- Test migration scripts locally before committing
- Validate workflow YAML syntax using GitHub Actions CLI
- Test Drizzle configuration with local database

**Example Tests**:
```bash
# Test migration generation
bun run db:generate

# Test migration execution locally
DIRECT_URL="postgresql://localhost:5432/test" bun run db:migrate

# Validate workflow syntax
gh workflow view ci.yml
gh workflow view deploy.yml
```

### Integration Testing

**Scope**: Test end-to-end workflow execution

**Approach**:
- Create test branch and push changes
- Verify workflow triggers correctly
- Verify migrations run successfully
- Verify Vercel deployment completes

**Test Scenarios**:
1. **Happy Path**: Push to dev → migrations succeed → preview deploys
2. **Migration Failure**: Push with bad migration → workflow fails → no deployment
3. **Quality Check Failure**: Push with TypeScript errors → workflow fails → blocked from merge
4. **Production Deployment**: Merge to main → migrations succeed → production deploys

### Manual Testing Checklist

Before merging workflow changes to main:

- [ ] Test workflow on feature branch
- [ ] Verify migrations run on dev database
- [ ] Verify preview deployment works
- [ ] Test rollback procedure
- [ ] Verify production deployment (on staging if available)
- [ ] Check workflow logs for errors
- [ ] Verify commit statuses update correctly
- [ ] Test branch protection rules

## Deployment Strategy

### Initial Setup

1. **Create GitHub Environments**:
   - Navigate to repository Settings → Environments
   - Create "Preview" environment
   - Create "Production" environment
   - Add protection rules to Production (require approvals if desired)

2. **Add GitHub Secrets**:
   - Add `DEV_DIRECT_URL` to Preview environment
   - Add `PROD_DIRECT_URL` to Production environment

3. **Configure Branch Protection**:
   - Navigate to Settings → Branches
   - Add rule for `main` branch
   - Require status checks: `quality-checks`
   - Require pull request reviews: 1 approval
   - Require branches to be up to date

4. **Verify Vercel Integration**:
   - Confirm Vercel is connected to repository
   - Verify production branch is set to `main`
   - Verify environment variables are configured in Vercel

### Deployment Process

**For Preview (dev/feature branches)**:
1. Developer pushes to branch
2. CI workflow runs quality checks
3. Deploy workflow runs migrations on dev database
4. Vercel automatically deploys preview
5. Developer tests preview URL

**For Production (main branch)**:
1. Developer creates PR from dev to main
2. CI workflow runs quality checks
3. Code review and approval
4. Merge PR to main
5. Deploy workflow runs migrations on prod database
6. Vercel automatically deploys to production
7. Monitor deployment and verify functionality

### Rollback Procedures

**Code Rollback**:
```bash
# Via Vercel Dashboard
1. Navigate to Deployments
2. Find last known good deployment
3. Click "..." → "Promote to Production"

# Via Vercel CLI
vercel promote <deployment-url>
```

**Database Rollback**:
```bash
# Manual rollback (no automatic rollback)
1. Connect to database
2. Identify problematic migration
3. Write and execute rollback SQL
4. Update drizzle_migrations table

# Example
psql $PROD_DIRECT_URL
DELETE FROM drizzle_migrations WHERE hash = '<migration-hash>';
-- Execute rollback SQL
```

**Combined Rollback**:
1. Rollback code via Vercel
2. Rollback database manually
3. Verify application functionality
4. Create hotfix if needed

## Performance Considerations

### Workflow Optimization

**Caching Strategy**:
```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: Install dependencies
  run: bun install
  # Bun automatically caches dependencies
```

**Parallel Execution**:
- Quality checks run in parallel (TypeScript, ESLint, tests, build)
- Migration and deployment are sequential (by design)

**Expected Durations**:
- Quality checks: 3-5 minutes
- Migrations: 1-2 minutes
- Vercel deployment: 2-3 minutes
- **Total**: 6-10 minutes from push to deployed

### Database Migration Performance

**Optimization Strategies**:
- Use direct connection (DIRECT_URL) instead of pooled connection
- Run migrations during low-traffic periods for production
- Keep migrations small and focused
- Avoid long-running migrations (> 5 minutes)

**Monitoring**:
- Track migration duration in workflow logs
- Alert if migrations exceed threshold
- Review slow migrations for optimization

## Security Considerations

### Secret Management

**GitHub Secrets**:
- Store database URLs as GitHub secrets
- Never log secret values
- Use environment-specific secrets (Preview/Production)
- Rotate secrets periodically

**Access Control**:
- Limit who can modify workflows
- Require code review for workflow changes
- Use GitHub environments for deployment protection
- Audit workflow runs regularly

### Database Security

**Connection Security**:
- Use SSL for database connections
- Use direct URLs with strong passwords
- Limit database user permissions (migrations only need DDL)
- Monitor database access logs

**Migration Safety**:
- Review migrations before merging
- Test migrations on dev database first
- Avoid destructive operations without backups
- Require manual approval for risky migrations

## Monitoring and Observability

### Workflow Monitoring

**GitHub Actions UI**:
- View workflow runs: Repository → Actions tab
- Filter by branch, status, workflow
- View detailed logs for each step
- Download logs for offline analysis

**Notifications**:
- Email notifications for workflow failures
- Slack/Discord webhooks (optional)
- GitHub mobile app notifications

### Deployment Monitoring

**Vercel Dashboard**:
- View deployment status and logs
- Monitor build times and errors
- Track deployment frequency
- View analytics and performance metrics

**Health Checks**:
```bash
# Verify deployment health
curl https://ui-syncup.com/api/health

# Expected response
{
  "status": "ok",
  "deployment": {
    "environment": "production",
    "branch": "main",
    "commitSha": "abc123",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Database Monitoring

**Migration History**:
```sql
-- View applied migrations
SELECT * FROM drizzle_migrations ORDER BY created_at DESC;

-- Check for pending migrations
-- (Compare drizzle/ directory with database records)
```

**Supabase Dashboard**:
- Monitor database performance
- View query logs
- Check connection pool usage
- Review slow queries

## Maintenance and Operations

### Regular Maintenance Tasks

**Weekly**:
- Review workflow run history
- Check for failed deployments
- Monitor migration performance
- Review security alerts

**Monthly**:
- Audit GitHub secrets
- Review and update dependencies
- Optimize slow workflows
- Clean up old preview deployments

**Quarterly**:
- Review and update workflow configurations
- Audit access controls
- Update documentation
- Conduct disaster recovery drill

### Troubleshooting Guide

**Workflow won't trigger**:
1. Check workflow file syntax
2. Verify branch name matches trigger
3. Check repository permissions
4. Review GitHub Actions settings

**Migration fails**:
1. Review error message in logs
2. Check database connectivity
3. Verify secret is configured correctly
4. Test migration locally
5. Check for schema conflicts

**Deployment fails**:
1. Check Vercel logs
2. Verify environment variables
3. Check for build errors
4. Review recent code changes
5. Test build locally

**Rollback needed**:
1. Identify last known good deployment
2. Promote previous deployment via Vercel
3. Rollback database if needed
4. Verify functionality
5. Create hotfix if necessary

## Future Enhancements

### Potential Improvements

1. **Automated Rollback**: Implement automatic rollback on deployment failure
2. **Migration Validation**: Add pre-flight checks for migrations
3. **Performance Monitoring**: Integrate with monitoring tools (Datadog, New Relic)
4. **Deployment Approvals**: Require manual approval for production deployments
5. **Canary Deployments**: Gradual rollout to subset of users
6. **Automated Testing**: Add E2E tests to CI pipeline
7. **Slack Integration**: Post deployment notifications to Slack
8. **Migration Dry Run**: Test migrations without applying them

### Scalability Considerations

**As the application grows**:
- Consider blue-green deployments for zero-downtime
- Implement database migration strategies for large tables
- Add staging environment between preview and production
- Implement feature flags for gradual rollouts
- Add automated performance testing
- Implement database backup verification

## Appendix

### Workflow File Locations

- `.github/workflows/ci.yml`: Quality checks workflow
- `.github/workflows/deploy.yml`: Deployment and migration workflow

### Configuration Files

- `drizzle.config.ts`: Drizzle ORM configuration
- `package.json`: NPM scripts for CI/CD commands
- `.github/branch-protection.yml`: Branch protection documentation

### External Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)

### Support Contacts

- **GitHub Actions Issues**: Repository maintainers
- **Vercel Support**: Vercel dashboard → Support
- **Supabase Support**: Supabase dashboard → Support
- **Team Lead**: [Contact information]
