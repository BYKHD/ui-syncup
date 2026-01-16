# Deployment Guide

This guide provides step-by-step procedures for deploying UI SyncUp to Vercel, managing environments, and handling production operations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Vercel Setup](#initial-vercel-setup)
- [Environment Variables Reference](#environment-variables-reference)
- [Security Configuration](#security-configuration)
- [Regular Deployment Flow](#regular-deployment-flow)
- [Rollback Procedures](#rollback-procedures)
- [Emergency Procedures](#emergency-procedures)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying to Vercel, ensure you have:

- [ ] Vercel account with appropriate permissions
- [ ] GitHub repository with the codebase
- [ ] Cloudflare R2 buckets created (production and development)
- [ ] Supabase projects created (production and development)
- [ ] Google OAuth applications configured (production and development)
- [ ] Vercel CLI installed: `bun add -g vercel`

---

## Initial Vercel Setup

### Step 1: Create Vercel Project

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Import Project from GitHub**
   - Navigate to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Configure project settings:
     - **Framework Preset**: Next.js
     - **Root Directory**: `./` (default)
     - **Build Command**: `bun run build`
     - **Output Directory**: `.next` (default)
     - **Install Command**: `bun install`

3. **Configure Production Branch**
   - In Project Settings → Git
   - Set **Production Branch** to `main`
   - Enable **Automatic Deployments**

### Step 2: Configure Environment Variables

Environment variables must be configured for three scopes:
- **Production**: Applied to `main` branch deployments
- **Preview**: Applied to all non-production branches
- **Development**: Applied during `vercel dev` local development

#### Via Vercel Dashboard

1. Navigate to Project Settings → Environment Variables
2. Add each variable from the [Environment Variables Reference](#environment-variables-reference)
3. Select appropriate environment scope(s) for each variable
4. Click "Save"

#### Via Vercel CLI

```bash
# Production environment
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add DATABASE_URL production
vercel env add R2_ACCESS_KEY_ID production
# ... (repeat for all variables)

# Preview environment
vercel env add NEXT_PUBLIC_APP_URL preview
vercel env add DATABASE_URL preview
# ... (repeat for all variables)

# Development environment (optional)
vercel env add NEXT_PUBLIC_APP_URL development
```

**Important**: Never commit secrets to Git. All sensitive values must be stored in Vercel's Environment Variables.

### Common Issue: Localhost URLs in Emails

**Symptom**: Verification emails and password reset emails contain localhost links (e.g., `http://localhost:3000/verify-email-confirm?token=...`) instead of your production domain URLs.

**Cause**: The `BETTER_AUTH_URL` environment variable is not configured in Vercel Dashboard. The `.env.production` and `.env.development` files in the repository are templates only and are **NOT** used by Vercel deployments.

**Solution**:
1. Environment variables must be explicitly configured in Vercel Dashboard:
   - Navigate to **Settings** → **Environment Variables**
   - Add `BETTER_AUTH_URL` with your domain (e.g., `https://ui-syncup.com`)
   - Select appropriate scope:
     - **Production** scope for `https://ui-syncup.com`
     - **Preview** scope for `https://dev.ui-syncup.com` or preview URLs
2. After adding variables, trigger a new deployment:
   - Either push a new commit to trigger automatic deployment
   - Or use Vercel Dashboard → Deployments → "Redeploy"
3. Environment variable changes require redeployment to take effect

**Related Variables**: Ensure these are also configured correctly:
- `NEXT_PUBLIC_APP_URL` - Should match your deployment domain
- `GOOGLE_REDIRECT_URI` - Should match your deployment domain + `/api/auth/callback/google`

**Verification**: After deployment, test by signing up with a test account and checking that the verification email contains your production domain URL, not localhost.

**Reference**: See [Environment Variables Reference](#environment-variables-reference) below for complete list and examples.

### Step 3: Configure Git Integration

#### GitHub Branch Protection Settings

Branch protection rules ensure code quality and prevent accidental changes to critical branches. See `.github/branch-protection.yml` for the complete configuration reference.

**Configure Main Branch Protection**:

1. Navigate to **Repository Settings** → **Branches**
2. Click **"Add branch protection rule"**
3. Enter branch name pattern: `main`
4. Configure the following settings:

   **Pull Request Requirements**:
   - ✅ **Require a pull request before merging**
     - Required number of approvals: `1`
     - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ⬜ Require review from Code Owners (optional)
     - ⬜ Require approval of the most recent reviewable push (optional)

   **Status Check Requirements**:
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Add required status checks:
       - `quality-checks` (GitHub Actions CI workflow)
       - `Vercel – Production` (optional, for Vercel deployment verification)

   **Additional Protections**:
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings** (enforce for administrators)
   - ⬜ Require linear history (optional)
   - ⬜ Require deployments to succeed before merging (optional)

   **Rules Applied to Everyone**:
   - ✅ **Include administrators** (recommended for production safety)

5. Click **"Create"** to save the rule

**Configure Develop Branch Protection** (Optional):

If using a develop branch workflow, repeat the above steps with these modifications:
- Branch name pattern: `develop`
- Required approvals: `1`
- ⬜ Require branches to be up to date (more flexible for development)
- ⬜ Include administrators (allow force pushes for branch maintenance)

**Verification**:
```bash
# Test branch protection
git checkout main
git push origin main  # Should fail if no PR

# Create PR instead
git checkout -b test/branch-protection
git push origin test/branch-protection
gh pr create --base main --head test/branch-protection
```

#### Vercel Deployment Settings

Configure Vercel to automatically deploy from Git branches with proper environment separation.

**Configure Git Integration**:

1. Navigate to **Project Settings** → **Git** in Vercel Dashboard

2. **Production Branch**:
   - Set production branch to: `main`
   - ✅ Enable "Automatic Production Deployments"
   - This ensures only `main` branch deploys to production domain

3. **Preview Deployments**:
   - ✅ Enable "Automatic Preview Deployments"
   - Deploy all branches: `All branches` (recommended)
   - Or specify patterns: `develop`, `feature/*`, `hotfix/*`
   - ✅ Enable "Preview Deployment Comments" on pull requests

4. **Deployment Protection** (Pro/Enterprise):
   - ✅ Enable "Deployment Protection" for production
   - Require approval before production deployments
   - Configure allowed deployers

5. **Ignored Build Step** (Optional):
   - Configure custom ignore conditions in `vercel.json`:
   ```json
   {
     "git": {
       "deploymentEnabled": {
         "main": true,
         "develop": true,
         "feature/*": true
       }
     }
   }
   ```

**Branch to Environment Mapping**:

| Branch Pattern | Environment | Deployment Type | Domain |
|---------------|-------------|-----------------|---------|
| `main` | Production | Automatic | `ui-syncup.com` |
| `develop` | Preview | Automatic | `develop-ui-syncup.vercel.app` |
| `feature/*` | Preview | Automatic | `feature-xyz-ui-syncup.vercel.app` |
| `hotfix/*` | Preview | Automatic | `hotfix-xyz-ui-syncup.vercel.app` |

**Deployment Notifications**:

1. Navigate to **Project Settings** → **Notifications**
2. Configure notifications for:
   - ✅ Deployment started
   - ✅ Deployment ready
   - ✅ Deployment failed
   - ✅ Deployment promoted
3. Add notification channels:
   - Email
   - Slack webhook
   - Discord webhook

**Verification**:
```bash
# Test automatic deployment
git checkout -b test/auto-deploy
echo "test" > test.txt
git add test.txt
git commit -m "test: verify auto deployment"
git push origin test/auto-deploy

# Check Vercel Dashboard for new preview deployment
# Verify preview URL is posted as PR comment
```

### Step 4: Configure Custom Domain (Production)

1. Navigate to Project Settings → Domains
2. Add your custom domain (e.g., `ui-syncup.com`)
3. Follow DNS configuration instructions:
   - Add `A` record pointing to Vercel's IP
   - Or add `CNAME` record pointing to `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours)
5. Vercel automatically provisions SSL certificate

### Step 5: Initial Deployment

```bash
# Deploy to production
vercel --prod

# Or push to main branch (automatic deployment)
git push origin main
```

Monitor the deployment in Vercel Dashboard → Deployments.

---

## Security Configuration

UI SyncUp implements comprehensive security headers and CORS policies to protect against common web vulnerabilities.

### Security Features

- **Content Security Policy (CSP)** - Restricts resource loading to prevent XSS attacks
- **CORS** - Controls which origins can access the API
- **Security Headers** - X-Frame-Options, X-Content-Type-Options, etc.
- **HSTS** - Forces HTTPS in production

### Configuration Files

- `next.config.ts` - Global security headers
- `src/proxy.ts` - Dynamic CSP and CORS preflight handling
- `src/lib/cors.ts` - CORS utilities for API routes
- `src/lib/security-headers.ts` - Centralized security header definitions

### Allowed External Services

The CSP is configured to allow connections to:

- **Supabase** (`*.supabase.co`) - Database and authentication
- **Cloudflare R2** (`*.r2.cloudflarestorage.com`) - Object storage
- **Google OAuth** (`accounts.google.com`) - Authentication

### Adding New External Services

If you need to integrate a new external service:

1. Update `src/lib/security-headers.ts`
2. Add the domain to the appropriate CSP directive
3. Test in preview environment
4. Deploy to production

**Example:**
```typescript
// In getCSPDirectives()
'connect-src': [
  "'self'",
  'https://*.supabase.co',
  'https://*.r2.cloudflarestorage.com',
  'https://accounts.google.com',
  'https://new-service.com', // Add new service here
  // ...
]
```

### Verifying Security Headers

After deployment, verify headers are correctly applied:

```bash
# Check security headers
curl -I https://ui-syncup.com

# Test CORS
curl -X OPTIONS \
     -H "Origin: https://ui-syncup.com" \
     -H "Access-Control-Request-Method: POST" \
     https://ui-syncup.com/api/health
```

For detailed security configuration and troubleshooting, see [SECURITY.md](./SECURITY.md).

---

## Environment Variables Reference

### Application URLs

| Variable | Description | Example (Production) | Example (Preview) |
|----------|-------------|---------------------|-------------------|
| `NEXT_PUBLIC_APP_URL` | Public-facing application URL | `https://ui-syncup.com` | `https://preview-ui-syncup.vercel.app` |
| `NEXT_PUBLIC_API_URL` | API base URL (usually same as APP_URL) | `https://ui-syncup.com` | `https://preview-ui-syncup.vercel.app` |

### Database (Supabase)

| Variable | Description | Required | Scope |
|----------|-------------|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) | ✅ | All |
| `DIRECT_URL` | PostgreSQL direct connection (for migrations) | ⚠️ Optional | All |
| `SUPABASE_URL` | Supabase project URL | ✅ | All |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (public) | ✅ | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (private) | ✅ | All |

**Example**:
```bash
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Storage (Cloudflare R2)

| Variable | Description | Required | Scope |
|----------|-------------|----------|-------|
| `R2_ACCOUNT_ID` | Cloudflare account ID | ✅ | All |
| `R2_ACCESS_KEY_ID` | R2 access key ID | ✅ | All |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key | ✅ | All |
| `R2_BUCKET_NAME` | R2 bucket name | ✅ | All |
| `R2_PUBLIC_URL` | Public URL for R2 bucket | ✅ | All |

**Example**:
```bash
R2_ACCOUNT_ID="abc123def456"
R2_ACCESS_KEY_ID="1234567890abcdef"
R2_SECRET_ACCESS_KEY="abcdef1234567890"
R2_BUCKET_NAME="ui-syncup-prod"  # or "ui-syncup-dev" for preview
R2_PUBLIC_URL="https://pub-abc123.r2.dev"
```

### Authentication (Google OAuth)

| Variable | Description | Required | Scope |
|----------|-------------|----------|-------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ | All |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ | All |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | ✅ | All |
| `BETTER_AUTH_SECRET` | Secret for signing auth tokens (min 32 chars) | ✅ | All |
| `BETTER_AUTH_URL` | Base URL for auth callbacks | ✅ | All |

**Example**:
```bash
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456"
GOOGLE_REDIRECT_URI="https://ui-syncup.com/api/auth/callback/google"
BETTER_AUTH_SECRET="your-32-character-minimum-secret-key-here"
BETTER_AUTH_URL="https://ui-syncup.com"
```

### Resource Limits (Instance Config)

| Variable | Description | Default | Scope |
|----------|-------------|---------|-------|
| `MAX_MEMBERS_PER_TEAM` | Max members per team ("unlimited" or number) | `unlimited` | All |
| `MAX_PROJECTS_PER_TEAM` | Max projects per team ("unlimited" or number) | `100` | All |
| `MAX_ISSUES_PER_TEAM` | Max issues per team ("unlimited" or number) | `unlimited` | All |
| `MAX_STORAGE_PER_TEAM_MB` | Max storage in MB per team | `10000` | All |

**Example**:
```bash
MAX_MEMBERS_PER_TEAM="50"
MAX_PROJECTS_PER_TEAM="10"
MAX_STORAGE_PER_TEAM_MB="5000"
```

### Feature Flags (Optional)

| Variable | Description | Default | Scope |
|----------|-------------|---------|-------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable Vercel Analytics | `false` | All |
| `NEXT_PUBLIC_ENABLE_DEBUG` | Enable debug logging | `false` | Preview/Dev |

**Example**:
```bash
NEXT_PUBLIC_ENABLE_ANALYTICS="true"  # Production only
NEXT_PUBLIC_ENABLE_DEBUG="true"      # Preview/Dev only
```

### System Variables (Vercel-provided)

These are automatically set by Vercel and should not be manually configured:

| Variable | Description |
|----------|-------------|
| `VERCEL` | Always `"1"` when running on Vercel |
| `VERCEL_ENV` | Environment: `"production"`, `"preview"`, or `"development"` |
| `VERCEL_URL` | Deployment URL (e.g., `project-abc123.vercel.app`) |
| `VERCEL_GIT_COMMIT_REF` | Git branch name |
| `VERCEL_GIT_COMMIT_SHA` | Git commit SHA |
| `VERCEL_GIT_COMMIT_MESSAGE` | Git commit message |

---

## Regular Deployment Flow

### Feature Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Develop and Test Locally**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Add your local values to .env.local
   # Start development server
   bun dev
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push to GitHub** (triggers preview deployment)
   ```bash
   git push origin feature/new-feature
   ```

5. **Automatic Preview Deployment**
   - Vercel automatically deploys your branch
   - Preview URL is posted as a comment on your PR
   - CI checks run automatically (typecheck, lint, test, build)

6. **Test in Preview Environment**
   - Open the preview URL
   - Test your changes in an isolated environment
   - Preview uses preview environment variables

7. **Create Pull Request**
   - Request code review
   - Ensure all CI checks pass
   - Address review feedback

8. **Merge to Main** (triggers production deployment)
   ```bash
   # After PR approval
   git checkout main
   git pull origin main
   ```

### Production Deployment Workflow

**Automatic Deployment** (Recommended):
```bash
# Merge PR via GitHub UI or CLI
gh pr merge <pr-number> --squash

# Or push directly to main (if permitted)
git push origin main
```

**Manual Deployment** (via CLI):
```bash
# Deploy current branch to production
vercel --prod

# Deploy specific commit
git checkout <commit-sha>
vercel --prod
```

### Production Deployment Checklist

Use this checklist before every production deployment to ensure quality and minimize risk.

#### Pre-Deployment Checks

**Code Quality**:
- [ ] All CI checks pass (typecheck, lint, test, build)
- [ ] No TypeScript errors or warnings
- [ ] ESLint passes with no errors
- [ ] All unit tests pass
- [ ] Code coverage meets minimum threshold (≥80% for critical features)

**Testing & Verification**:
- [ ] Preview environment deployed and tested
- [ ] Manual testing completed on preview URL
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified
- [ ] Accessibility checks passed (WCAG 2.1 AA)
- [ ] Performance metrics acceptable (Lighthouse score ≥90)

**Database & Migrations**:
- [ ] Database migrations reviewed and approved
- [ ] Migrations tested in preview environment
- [ ] Migration rollback script prepared (if applicable)
- [ ] Database backup created (if making schema changes)
- [ ] Migration impact assessed (downtime, data loss risk)

**Configuration**:
- [ ] Environment variables verified (no missing values)
- [ ] Production environment variables match requirements
- [ ] Feature flags configured correctly
- [ ] External service credentials validated
- [ ] API rate limits and quotas checked

**Documentation**:
- [ ] CHANGELOG.md updated with changes
- [ ] Breaking changes documented
- [ ] API changes documented (if applicable)
- [ ] Deployment notes prepared
- [ ] Rollback plan documented

**Communication**:
- [ ] Team notified of deployment window
- [ ] Stakeholders informed of new features/changes
- [ ] Support team briefed on changes
- [ ] Status page updated (if maintenance required)

**Security**:
- [ ] Security vulnerabilities addressed (npm audit, Dependabot)
- [ ] No secrets committed to repository
- [ ] Authentication flows tested
- [ ] Authorization rules verified
- [ ] CORS configuration reviewed

**Monitoring & Rollback**:
- [ ] Monitoring dashboards ready
- [ ] Error tracking configured
- [ ] Rollback plan prepared and tested
- [ ] Previous deployment URL identified
- [ ] On-call engineer assigned

#### During Deployment

- [ ] Monitor build logs in Vercel Dashboard
- [ ] Watch for build errors or warnings
- [ ] Verify deployment completes successfully
- [ ] Check deployment status changes to "Ready"

#### Post-Deployment Verification

**Immediate Checks** (within 5 minutes):
- [ ] Health endpoint responds: `curl https://ui-syncup.com/api/health`
- [ ] Homepage loads successfully
- [ ] Authentication flow works (sign in/sign up)
- [ ] Critical user flows tested (create issue, view project)
- [ ] No JavaScript errors in browser console

**Extended Monitoring** (within 30 minutes):
- [ ] Error rates normal (check Vercel Analytics)
- [ ] Response times acceptable (p95 < 500ms)
- [ ] Database connections stable
- [ ] External service integrations working (R2, Supabase, OAuth)
- [ ] No spike in error logs

**User Acceptance** (within 24 hours):
- [ ] User feedback collected
- [ ] No critical bugs reported
- [ ] Performance metrics stable
- [ ] Business metrics tracking correctly

#### Rollback Criteria

Initiate rollback immediately if:
- [ ] Error rate increases by >50%
- [ ] Critical functionality broken (auth, data access)
- [ ] Performance degrades significantly (p95 > 2s)
- [ ] Data corruption detected
- [ ] Security vulnerability exposed

#### Post-Deployment Tasks

- [ ] Update deployment log with timestamp and version
- [ ] Close related GitHub issues/PRs
- [ ] Update project board/tracking system
- [ ] Schedule post-mortem (if issues occurred)
- [ ] Document lessons learned
- [ ] Update runbooks (if procedures changed)

---

**Deployment Checklist Template**

Copy this template for each production deployment:

```markdown
## Production Deployment - [YYYY-MM-DD]

**Deployer**: [Your Name]
**Version**: [v1.2.3 or commit SHA]
**Deployment Time**: [HH:MM UTC]

### Pre-Deployment
- [ ] All checks completed
- [ ] Team notified
- [ ] Rollback plan ready

### Deployment
- [ ] Build successful
- [ ] Deployment ready

### Post-Deployment
- [ ] Health check passed
- [ ] Critical flows tested
- [ ] Monitoring normal

### Notes
[Any special considerations or observations]

### Rollback Plan
Previous deployment: [URL]
Rollback command: `vercel promote [deployment-url]`
```

### Monitoring Deployment

1. **Via Vercel Dashboard**
   - Navigate to Deployments tab
   - Monitor build logs in real-time
   - Check deployment status (Building → Ready)

2. **Via CLI**
   ```bash
   # List recent deployments
   vercel ls
   
   # View deployment logs
   vercel logs <deployment-url>
   ```

3. **Post-Deployment Verification**
   ```bash
   # Check health endpoint
   curl https://ui-syncup.com/api/health
   
   # Expected response:
   # {"status":"ok","deployment":{...},"timestamp":"..."}
   ```

---

## Rollback Procedures

### Via Vercel Dashboard (Recommended)

1. **Navigate to Deployments**
   - Go to your project in Vercel Dashboard
   - Click "Deployments" tab

2. **Find Last Known Good Deployment**
   - Identify the deployment before the issue occurred
   - Verify it's marked as "Ready" (green checkmark)

3. **Promote to Production**
   - Click the three-dot menu (⋯) on the deployment
   - Select "Promote to Production"
   - Confirm the promotion

4. **Verify Rollback**
   - Check production URL
   - Verify health endpoint: `https://ui-syncup.com/api/health`
   - Monitor error rates in Vercel Analytics

**Time to rollback**: ~30 seconds

### Via Vercel CLI

```bash
# List recent deployments
vercel ls

# Example output:
# Age  Deployment                          Status
# 2m   ui-syncup-abc123.vercel.app        Ready (Current)
# 1h   ui-syncup-def456.vercel.app        Ready
# 2h   ui-syncup-ghi789.vercel.app        Ready

# Promote specific deployment to production
vercel promote ui-syncup-def456.vercel.app

# Verify
curl https://ui-syncup.com/api/health
```

### Via Git Revert

If you need to revert code changes:

```bash
# Revert the problematic commit
git revert <commit-sha>

# Push to main (triggers new deployment)
git push origin main
```

**Time to rollback**: ~2-5 minutes (includes build time)

### Rollback Decision Matrix

| Scenario | Method | Time | Notes |
|----------|--------|------|-------|
| Bad deployment, previous version works | Dashboard/CLI promote | 30s | Fastest, no code changes |
| Bug in recent commit | Git revert | 2-5m | Creates new deployment |
| Multiple bad commits | Git revert range | 2-5m | Revert multiple commits |
| Database migration issue | Manual intervention | Varies | See Emergency Procedures |

---

## Emergency Procedures

### Production Outage

**Immediate Actions** (within 5 minutes):

1. **Assess the Situation**
   ```bash
   # Check deployment status
   vercel ls
   
   # Check health endpoint
   curl https://ui-syncup.com/api/health
   
   # Check Vercel status
   # Visit: https://www.vercel-status.com
   ```

2. **Check External Services**
   - Supabase: https://status.supabase.com
   - Cloudflare: https://www.cloudflarestatus.com
   - Google OAuth: https://www.google.com/appsstatus

3. **Review Recent Deployments**
   - Check Vercel Dashboard → Deployments
   - Review build logs for errors
   - Check deployment timeline

4. **Immediate Rollback** (if deployment-related)
   ```bash
   # Promote last known good deployment
   vercel promote <last-good-deployment-url>
   ```

5. **Notify Team**
   - Post in team Slack/Discord
   - Update status page (if applicable)
   - Assign incident owner

**Investigation** (within 30 minutes):

1. **Review Logs**
   ```bash
   # View deployment logs
   vercel logs <deployment-url>
   
   # View function logs
   vercel logs --follow
   ```

2. **Check Error Tracking**
   - Review Vercel Analytics → Errors
   - Check error patterns and frequency

3. **Identify Root Cause**
   - Recent code changes
   - Environment variable changes
   - External service failures
   - Database issues

**Resolution**:

1. **Fix and Deploy**
   ```bash
   # Create hotfix branch
   git checkout -b hotfix/critical-issue
   
   # Make fix
   # ...
   
   # Commit and push
   git commit -m "fix: resolve critical issue"
   git push origin hotfix/critical-issue
   
   # Deploy directly to production (emergency only)
   vercel --prod
   ```

2. **Verify Fix**
   ```bash
   # Check health endpoint
   curl https://ui-syncup.com/api/health
   
   # Monitor for 15 minutes
   ```

3. **Post-Mortem**
   - Document incident timeline
   - Identify preventive measures
   - Update runbooks

### Database Migration Failure

**Scenario**: Migration fails during deployment, leaving database in inconsistent state.

**Immediate Actions**:

1. **Rollback Application**
   ```bash
   # Promote previous deployment
   vercel promote <last-good-deployment-url>
   ```

2. **Assess Database State**
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Check migration status
   SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;
   ```

3. **Rollback Migration** (if needed)
   ```bash
   # If using Drizzle
   bun drizzle-kit drop
   
   # Or manually revert SQL
   psql $DATABASE_URL < rollback.sql
   ```

4. **Fix Migration Script**
   - Review migration logs
   - Identify syntax errors or constraint violations
   - Test migration locally

5. **Test in Preview Environment**
   ```bash
   # Deploy to preview branch
   git checkout -b fix/migration-issue
   git push origin fix/migration-issue
   
   # Test migration in preview
   ```

6. **Redeploy to Production**
   ```bash
   # After verification
   git checkout main
   git merge fix/migration-issue
   git push origin main
   ```

### Environment Variable Issues

**Scenario**: Missing or incorrect environment variables causing runtime errors.

**Diagnosis**:

```bash
# Check environment variables (via Vercel CLI)
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

**Resolution**:

1. **Add Missing Variables**
   ```bash
   vercel env add MISSING_VARIABLE production
   ```

2. **Update Incorrect Variables**
   ```bash
   # Remove old value
   vercel env rm VARIABLE_NAME production
   
   # Add new value
   vercel env add VARIABLE_NAME production
   ```

3. **Redeploy**
   ```bash
   # Trigger new deployment to apply changes
   vercel --prod --force
   ```

### External Service Outage

**Scenario**: Supabase, Cloudflare R2, or Google OAuth is down.

**Immediate Actions**:

1. **Verify Service Status**
   - Check service status pages
   - Test connectivity from local machine

2. **Enable Graceful Degradation** (if implemented)
   - Storage failures: Queue uploads for retry
   - Database failures: Show maintenance page
   - Auth failures: Disable login, show status message

3. **Communicate with Users**
   - Display service status banner
   - Update status page
   - Post on social media

4. **Monitor Service Recovery**
   - Set up alerts for service restoration
   - Test functionality when service returns

5. **Resume Normal Operations**
   - Remove maintenance mode
   - Process queued operations
   - Notify users

---

## Monitoring & Maintenance

### Vercel Analytics Setup

Vercel Analytics provides real-time insights into application performance, user behavior, and errors. Enable it to monitor production health and identify issues before they impact users.

#### Enabling Vercel Analytics

**Via Vercel Dashboard**:

1. Navigate to your project in Vercel Dashboard
2. Go to **Analytics** tab
3. Click **"Enable Analytics"**
4. Choose analytics tier:
   - **Web Analytics** (Free): Page views, unique visitors, top pages
   - **Speed Insights** (Free): Core Web Vitals, performance metrics
   - **Audience** (Pro): Geographic data, device types, referrers

**Via Environment Variable**:

```bash
# Add to production environment
vercel env add NEXT_PUBLIC_ENABLE_ANALYTICS production

# Set value to "true"
```

**In Application Code**:

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
```

#### Analytics Features

**Web Analytics**:
- **Page Views**: Track which pages are most visited
- **Unique Visitors**: Monitor user growth and retention
- **Top Pages**: Identify popular content
- **Referrers**: Understand traffic sources
- **Real-time**: See live visitor activity

**Speed Insights**:
- **Core Web Vitals**: LCP, FID, CLS metrics
- **Performance Score**: Overall site performance rating
- **Page Load Times**: P50, P75, P95 percentiles
- **Device Breakdown**: Performance by device type
- **Geographic Data**: Performance by region

**Error Tracking** (Pro):
- **Runtime Errors**: JavaScript errors in production
- **Error Frequency**: Track error occurrence over time
- **Error Context**: Stack traces, user agents, URLs
- **Error Grouping**: Automatically group similar errors

#### Accessing Analytics

1. **Vercel Dashboard**:
   - Navigate to project → Analytics tab
   - View real-time and historical data
   - Filter by date range, page, device

2. **Analytics API** (Pro):
   ```bash
   # Get analytics data programmatically
   curl -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v1/analytics?projectId=$PROJECT_ID"
   ```

3. **Custom Dashboards**:
   - Export data to external tools (Datadog, Grafana)
   - Create custom visualizations
   - Set up automated reports

### Accessing Deployment Logs

Deployment logs help diagnose build failures, runtime errors, and performance issues.

#### Via Vercel Dashboard

1. **Build Logs**:
   - Navigate to **Deployments** tab
   - Click on a deployment
   - View **Build Logs** section
   - Shows: dependency installation, build output, errors

2. **Function Logs** (Runtime):
   - Navigate to **Deployments** → Select deployment
   - Click **Functions** tab
   - View logs for each serverless function
   - Shows: API requests, errors, console output

3. **Real-time Logs**:
   - Navigate to **Logs** tab (Pro feature)
   - View live stream of all function invocations
   - Filter by: function, status code, time range
   - Search logs by keyword

#### Via Vercel CLI

```bash
# View logs for latest deployment
vercel logs

# View logs for specific deployment
vercel logs <deployment-url>

# Follow logs in real-time
vercel logs --follow

# Filter logs by function
vercel logs --output=<function-name>

# View logs from last N minutes
vercel logs --since=10m

# View logs until specific time
vercel logs --until=2024-01-01T12:00:00Z

# Output logs as JSON
vercel logs --output=json
```

#### Log Retention

| Plan | Retention Period | Real-time Logs |
|------|------------------|----------------|
| Hobby | 1 hour | ❌ |
| Pro | 1 day | ✅ |
| Enterprise | 7 days | ✅ |

**Recommendation**: For longer retention, export logs to external service (Datadog, Logtail, Papertrail).

#### Exporting Logs

**To External Service**:

```typescript
// src/lib/logger.ts
import { createLogger } from '@/lib/logger'

const logger = createLogger({
  service: 'ui-syncup',
  environment: process.env.VERCEL_ENV,
  // Send to external service
  transports: [
    new ExternalLogTransport({
      apiKey: process.env.LOG_SERVICE_API_KEY,
      endpoint: 'https://logs.example.com/ingest',
    }),
  ],
})

export default logger
```

**Via Vercel Log Drains** (Enterprise):
- Navigate to Project Settings → Log Drains
- Add drain endpoint (Datadog, Splunk, etc.)
- Configure authentication and filters

### Error Tracking

Monitor and respond to production errors quickly to maintain application reliability.

#### Built-in Error Tracking (Vercel Pro)

**Enable Error Tracking**:
1. Navigate to project → Analytics → Errors
2. View error frequency, affected users, stack traces
3. Group similar errors automatically
4. Set up error alerts (see Alerting section)

**Error Details**:
- **Stack Trace**: Full error stack with source maps
- **User Context**: Browser, OS, device, location
- **Request Context**: URL, method, headers
- **Frequency**: Error count over time
- **First/Last Seen**: When error first and last occurred

#### External Error Tracking

For more advanced features, integrate with dedicated error tracking services:

**Sentry Integration**:

```bash
# Install Sentry SDK
bun add @sentry/nextjs

# Initialize Sentry
bunx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

**Other Options**:
- **Rollbar**: Lightweight error tracking
- **Bugsnag**: Error monitoring with release tracking
- **LogRocket**: Session replay with error tracking
- **Datadog**: Full observability platform

#### Error Response Workflow

1. **Detection**: Error occurs in production
2. **Alert**: Team notified via Slack/email (see Alerting)
3. **Triage**: Assess severity and impact
4. **Investigation**: Review logs, stack traces, user reports
5. **Fix**: Deploy hotfix or schedule fix in next release
6. **Verification**: Confirm error resolved
7. **Post-mortem**: Document root cause and prevention

### Alerting & Notifications

Set up proactive alerts to catch issues before they impact users.

#### Vercel Deployment Notifications

**Configure in Dashboard**:

1. Navigate to Project Settings → Notifications
2. Enable notifications for:
   - ✅ **Deployment Started**: Know when builds begin
   - ✅ **Deployment Ready**: Confirm successful deployments
   - ✅ **Deployment Failed**: Immediate alert on build failures
   - ✅ **Deployment Promoted**: Track production promotions
   - ✅ **Deployment Canceled**: Know when deployments are stopped

3. Add notification channels:

**Slack Integration**:
```bash
# Add Slack webhook
1. Go to Slack → Apps → Incoming Webhooks
2. Create webhook for #deployments channel
3. Copy webhook URL
4. In Vercel: Settings → Notifications → Add Slack
5. Paste webhook URL
```

**Discord Integration**:
```bash
# Add Discord webhook
1. Go to Discord → Server Settings → Integrations → Webhooks
2. Create webhook for #deployments channel
3. Copy webhook URL
4. In Vercel: Settings → Notifications → Add Discord
5. Paste webhook URL
```

**Email Notifications**:
- Add team member emails in Notifications settings
- Configure per-user notification preferences

#### Performance Alerts (Pro)

**Core Web Vitals Alerts**:

1. Navigate to Analytics → Speed Insights
2. Click **"Set up alerts"**
3. Configure thresholds:
   - **LCP** (Largest Contentful Paint): Alert if > 2.5s
   - **FID** (First Input Delay): Alert if > 100ms
   - **CLS** (Cumulative Layout Shift): Alert if > 0.1

4. Set notification channels (Slack, email)

**Custom Performance Alerts**:

```typescript
// src/lib/performance.ts
import { sendAlert } from '@/lib/alerts'

export function trackPerformance(metric: string, value: number, threshold: number) {
  if (value > threshold) {
    sendAlert({
      type: 'performance',
      metric,
      value,
      threshold,
      severity: 'warning',
      message: `${metric} exceeded threshold: ${value}ms > ${threshold}ms`,
    })
  }
}

// Usage in API route
export async function GET() {
  const start = Date.now()
  const data = await fetchData()
  const duration = Date.now() - start
  
  trackPerformance('api_response_time', duration, 500)
  
  return Response.json(data)
}
```

#### Error Rate Alerts

**Vercel Error Alerts** (Pro):

1. Navigate to Analytics → Errors
2. Click **"Configure alerts"**
3. Set thresholds:
   - Alert if error rate > 5% of requests
   - Alert if new error type appears
   - Alert if error affects > 100 users

**Custom Error Alerts**:

```typescript
// src/lib/error-tracking.ts
import { sendAlert } from '@/lib/alerts'

let errorCount = 0
let requestCount = 0

export function trackError(error: Error, context: any) {
  errorCount++
  requestCount++
  
  const errorRate = errorCount / requestCount
  
  if (errorRate > 0.05) { // 5% error rate
    sendAlert({
      type: 'error_rate',
      rate: errorRate,
      severity: 'critical',
      message: `Error rate exceeded 5%: ${(errorRate * 100).toFixed(2)}%`,
      context,
    })
  }
}
```

#### External Service Alerts

**Supabase Alerts**:
- Navigate to Supabase Dashboard → Settings → Alerts
- Configure alerts for:
  - Database CPU usage > 80%
  - Connection pool exhaustion
  - Storage quota > 90%
  - API rate limit approaching

**Cloudflare R2 Alerts**:
- Set up cost alerts in Cloudflare Dashboard
- Monitor storage usage and bandwidth
- Alert on quota approaching limits

**Custom Health Check Alerts**:

```typescript
// src/lib/health-check-monitor.ts
import { sendAlert } from '@/lib/alerts'

export async function monitorHealth() {
  try {
    const response = await fetch('https://ui-syncup.com/api/health')
    const data = await response.json()
    
    if (data.status !== 'ok') {
      sendAlert({
        type: 'health_check',
        severity: 'critical',
        message: 'Health check failed',
        details: data,
      })
    }
  } catch (error) {
    sendAlert({
      type: 'health_check',
      severity: 'critical',
      message: 'Health check endpoint unreachable',
      error: error.message,
    })
  }
}

// Run every 5 minutes via cron job or external monitor
```

#### Alert Severity Levels

| Severity | Response Time | Examples |
|----------|--------------|----------|
| **Critical** | Immediate (< 5 min) | Production down, data loss, security breach |
| **High** | < 30 minutes | Error rate spike, performance degradation |
| **Medium** | < 2 hours | Build failures, preview deployment issues |
| **Low** | Next business day | Deprecation warnings, minor bugs |

#### On-Call Rotation

**Set up on-call schedule**:
1. Define on-call rotation (weekly, bi-weekly)
2. Use PagerDuty, Opsgenie, or similar for escalation
3. Document on-call procedures and runbooks
4. Ensure on-call engineer has access to:
   - Vercel Dashboard
   - External service dashboards
   - Deployment credentials
   - Team communication channels

### Monitoring Checklist

Use these checklists to maintain system health and catch issues early.

#### Daily Monitoring Tasks (5-10 minutes)

**Deployment Health**:
- [ ] Check Vercel Dashboard for failed deployments
- [ ] Review latest production deployment status
- [ ] Verify no stuck or pending deployments

**Error Monitoring**:
- [ ] Review error logs in Vercel Analytics (if Pro)
- [ ] Check for new error types or spikes
- [ ] Verify error rate < 1% of requests

**Performance Metrics**:
- [ ] Check Core Web Vitals in Speed Insights
- [ ] Verify LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Review API response times (p95 < 500ms)

**User Activity**:
- [ ] Check Web Analytics for traffic patterns
- [ ] Verify no unusual drops in traffic
- [ ] Review top pages and user flows

**Quick Health Check**:
```bash
# Run daily health check script
curl https://ui-syncup.com/api/health | jq
```

#### Weekly Monitoring Tasks (30-60 minutes)

**Deployment Review**:
- [ ] Review all deployments from past week
- [ ] Check preview deployment usage and cleanup old ones
- [ ] Verify branch protection rules are enforced
- [ ] Review deployment frequency and patterns

**Security & Dependencies**:
- [ ] Check Dependabot alerts in GitHub
- [ ] Run `bun audit` for security vulnerabilities
- [ ] Review and merge security patches
- [ ] Check for outdated dependencies

**Performance Analysis**:
- [ ] Review weekly performance trends
- [ ] Identify slow pages or API endpoints
- [ ] Check for performance regressions
- [ ] Review bandwidth usage trends

**Error Analysis**:
- [ ] Review top errors from past week
- [ ] Identify recurring error patterns
- [ ] Create tickets for unresolved errors
- [ ] Verify fixes for previously reported errors

**External Services**:
- [ ] Check Supabase database size and growth
- [ ] Review Cloudflare R2 storage usage
- [ ] Verify API rate limits not approaching
- [ ] Check connection pool usage

**Cost Review**:
- [ ] Review Vercel usage (bandwidth, functions)
- [ ] Check Supabase usage and costs
- [ ] Review Cloudflare R2 storage costs
- [ ] Identify cost optimization opportunities

#### Monthly Monitoring Tasks (2-4 hours)

**Security Maintenance**:
- [ ] Rotate secrets (database passwords, API keys)
- [ ] Review access permissions (Vercel team members)
- [ ] Audit environment variables across all scopes
- [ ] Review and update security headers
- [ ] Check SSL certificate expiry

**Dependency Updates**:
- [ ] Update all dependencies: `bun update`
- [ ] Test updated dependencies in preview environment
- [ ] Review breaking changes in major updates
- [ ] Update lock files and commit changes

**Performance Optimization**:
- [ ] Run Lighthouse audits on key pages
- [ ] Identify and optimize slow queries
- [ ] Review and optimize bundle sizes
- [ ] Implement caching improvements
- [ ] Optimize images and assets

**Cost Optimization**:
- [ ] Review monthly costs across all services
- [ ] Identify unused resources and clean up
- [ ] Optimize database queries and indexes
- [ ] Review and adjust caching strategies
- [ ] Negotiate pricing with service providers (if applicable)

**Documentation Updates**:
- [ ] Update deployment documentation
- [ ] Document new procedures or changes
- [ ] Update runbooks for common issues
- [ ] Review and update team onboarding docs

**Capacity Planning**:
- [ ] Review traffic growth trends
- [ ] Forecast resource needs for next quarter
- [ ] Plan for scaling if needed
- [ ] Review and adjust rate limits

**Backup & Disaster Recovery**:
- [ ] Verify database backups are running
- [ ] Test backup restoration process
- [ ] Review disaster recovery procedures
- [ ] Update emergency contact list

### Cost Optimization Guidelines

Optimize costs across Vercel and external services while maintaining performance and reliability.

#### Vercel Cost Optimization

**Bandwidth Optimization**:

1. **Optimize Images**:
   ```typescript
   // Use Next.js Image component
   import Image from 'next/image'
   
   <Image
     src="/hero.jpg"
     alt="Hero"
     width={1200}
     height={600}
     quality={85}  // Reduce quality slightly
     priority      // Preload critical images
   />
   ```

2. **Enable Compression**:
   ```typescript
   // next.config.ts
   const nextConfig = {
     compress: true,  // Enable gzip compression
   }
   ```

3. **Use Edge Caching**:
   ```typescript
   // API route with caching
   export async function GET() {
     const data = await fetchData()
     
     return Response.json(data, {
       headers: {
         'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
       },
     })
   }
   ```

4. **Optimize Static Assets**:
   - Minify CSS and JavaScript
   - Use WebP/AVIF image formats
   - Lazy load non-critical resources
   - Remove unused dependencies

**Function Invocation Optimization**:

1. **Reduce Cold Starts**:
   ```typescript
   // Keep functions warm with minimal code
   export const config = {
     maxDuration: 10,  // Reduce timeout for simple functions
   }
   ```

2. **Batch Operations**:
   ```typescript
   // Batch multiple operations in single function call
   export async function POST(request: Request) {
     const { operations } = await request.json()
     const results = await Promise.all(operations.map(op => processOperation(op)))
     return Response.json(results)
   }
   ```

3. **Use Edge Functions** (when appropriate):
   ```typescript
   // Edge runtime for simple, fast operations
   export const runtime = 'edge'
   
   export async function GET() {
     return Response.json({ status: 'ok' })
   }
   ```

**Preview Deployment Cleanup**:

```bash
# List all deployments
vercel ls

# Remove old preview deployments (older than 7 days)
vercel ls --max-age=7d | grep -v "Production" | xargs -I {} vercel rm {} --yes

# Automate cleanup with GitHub Action
# .github/workflows/cleanup-previews.yml
name: Cleanup Old Previews
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: vercel ls --max-age=7d | grep -v "Production" | xargs -I {} vercel rm {} --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

**Quota Optimization**:
- Monitor usage against resource quotas
- Upgrade infrastructure only when consistently hitting limits
- Consider scaling up resources for high-traffic apps
- Use preview deployments sparingly for large teams

#### Supabase Cost Optimization

**Database Optimization**:

1. **Optimize Queries**:
   ```typescript
   // Use indexes for frequently queried columns
   // Add in migration
   CREATE INDEX idx_issues_project_id ON issues(project_id);
   CREATE INDEX idx_issues_status ON issues(status);
   
   // Use query optimization
   const { data } = await supabase
     .from('issues')
     .select('id, title, status')  // Select only needed columns
     .eq('project_id', projectId)
     .limit(50)  // Limit results
   ```

2. **Connection Pooling**:
   ```typescript
   // Use pooled connection for serverless
   DATABASE_URL="postgresql://...?pgbouncer=true"
   
   // Use direct connection only for migrations
   DIRECT_URL="postgresql://..."
   ```

3. **Clean Up Old Data**:
   ```sql
   -- Archive old issues
   DELETE FROM issues WHERE status = 'archived' AND updated_at < NOW() - INTERVAL '1 year';
   
   -- Vacuum database to reclaim space
   VACUUM FULL;
   ```

**Storage Optimization**:

1. **Implement Storage Policies**:
   ```sql
   -- Delete files older than 90 days
   CREATE POLICY "Delete old files"
   ON storage.objects
   FOR DELETE
   USING (created_at < NOW() - INTERVAL '90 days');
   ```

2. **Compress Files Before Upload**:
   ```typescript
   // Compress images before uploading
   import sharp from 'sharp'
   
   const compressed = await sharp(buffer)
     .resize(1920, 1080, { fit: 'inside' })
     .webp({ quality: 85 })
     .toBuffer()
   ```

**Monitoring & Alerts**:
- Set up quota alerts at 50%, 75%, 90% of limit
- Monitor database size growth trends
- Review slow queries and optimize
- Use read replicas for read-heavy workloads (Pro+)

#### Cloudflare R2 Cost Optimization

**Storage Optimization**:

1. **Lifecycle Policies**:
   ```bash
   # Delete files older than 90 days
   # Configure in Cloudflare Dashboard → R2 → Bucket → Lifecycle
   ```

2. **Deduplicate Files**:
   ```typescript
   // Use content-based hashing to avoid duplicates
   import crypto from 'crypto'
   
   function getFileHash(buffer: Buffer): string {
     return crypto.createHash('sha256').update(buffer).digest('hex')
   }
   
   // Check if file exists before uploading
   const hash = getFileHash(fileBuffer)
   const existingFile = await checkFileExists(hash)
   if (existingFile) {
     return existingFile.url  // Reuse existing file
   }
   ```

3. **Compress Files**:
   ```typescript
   // Compress before uploading
   import { gzip } from 'zlib'
   import { promisify } from 'util'
   
   const gzipAsync = promisify(gzip)
   const compressed = await gzipAsync(buffer)
   ```

**Bandwidth Optimization**:

1. **Use CDN Caching**:
   ```typescript
   // Set cache headers on R2 objects
   await r2.putObject({
     Bucket: bucket,
     Key: key,
     Body: buffer,
     CacheControl: 'public, max-age=31536000',  // 1 year
   })
   ```

2. **Optimize Image Delivery**:
   - Use Cloudflare Images for automatic optimization
   - Serve responsive images (multiple sizes)
   - Use modern formats (WebP, AVIF)

**Cost Monitoring**:
- Monitor storage usage and growth
- Track bandwidth usage patterns
- Set up cost alerts
- Review and delete unused files regularly

#### General Cost Optimization Strategies

**Monitoring & Alerting**:
```typescript
// Set up cost alerts
const COST_THRESHOLDS = {
  vercel: 100,      // $100/month
  supabase: 50,     // $50/month
  cloudflare: 25,   // $25/month
}

async function checkCosts() {
  const costs = await fetchCurrentCosts()
  
  for (const [service, cost] of Object.entries(costs)) {
    if (cost > COST_THRESHOLDS[service]) {
      sendAlert({
        type: 'cost_alert',
        service,
        cost,
        threshold: COST_THRESHOLDS[service],
        message: `${service} costs exceeded threshold: $${cost} > $${COST_THRESHOLDS[service]}`,
      })
    }
  }
}
```

**Resource Tagging**:
- Tag resources by environment (production, preview)
- Tag by feature or team
- Track costs per tag
- Identify cost centers

**Regular Reviews**:
- Monthly cost review meetings
- Quarterly cost optimization sprints
- Annual service provider negotiations
- Continuous monitoring and optimization

**Cost Optimization Checklist**:
- [ ] Enable compression and caching
- [ ] Optimize images and assets
- [ ] Clean up unused resources
- [ ] Implement lifecycle policies
- [ ] Monitor usage trends
- [ ] Set up billing alerts
- [ ] Review and optimize queries
- [ ] Use appropriate service tiers
- [ ] Implement rate limiting
- [ ] Regular cost audits

### Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs --follow

# Pull environment variables
vercel env pull .env.local

# List environment variables
vercel env ls

# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Promote deployment
vercel promote <deployment-url>

# Remove deployment
vercel rm <deployment-url>

# Check project info
vercel inspect <deployment-url>
```

---

## Troubleshooting

### Build Failures

**Symptom**: Deployment fails during build step.

**Common Causes**:
- TypeScript errors
- Missing dependencies
- Environment variable validation failures
- Out of memory

**Resolution**:
```bash
# Test build locally
bun run build

# Check TypeScript
bun run typecheck

# Check for missing dependencies
bun install

# Review build logs in Vercel Dashboard
```

### Runtime Errors

**Symptom**: Deployment succeeds but application crashes at runtime.

**Common Causes**:
- Missing environment variables
- External service connection failures
- Database migration issues

**Resolution**:
```bash
# Check health endpoint
curl https://ui-syncup.com/api/health

# Review function logs
vercel logs --follow

# Verify environment variables
vercel env ls
```

### Preview Deployment Issues

**Symptom**: Preview deployments not working or not being created.

**Resolution**:
1. Check Git integration in Vercel Dashboard
2. Verify branch protection rules don't block Vercel
3. Check Vercel GitHub App permissions
4. Review deployment settings (ensure preview deployments enabled)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Git Integration](https://vercel.com/docs/concepts/git)

---

## Support

For deployment issues:
1. Check this documentation
2. Review Vercel Dashboard logs
3. Contact team lead or DevOps
4. Open support ticket with Vercel (if platform issue)

---

## Authentication System Monitoring

The authentication system requires specialized monitoring to ensure security, reliability, and performance. This section covers authentication-specific monitoring rules, alert thresholds, metrics collection, and troubleshooting procedures.

### Authentication Monitoring Overview

The authentication system logs all security-relevant events using a structured logging format. All logs include:
- Event ID (UUID)
- Event type (e.g., `auth.login.success`)
- Timestamp (ISO 8601)
- User context (user ID, email hash)
- Request context (IP address, user agent, request ID)
- Outcome (success, failure, error)

### Alert Thresholds

Configure alerts for the following authentication events to detect security issues and system problems early.

#### Critical Alerts (Immediate Response Required)

**High Authentication Failure Rate**:
```typescript
// Alert when login failures exceed 100 in 5 minutes
if (count('auth.login.failure', last_5_minutes) > 100) {
  alert('high_auth_failure_rate', {
    severity: 'critical',
    count: count,
    threshold: 100,
    message: 'Potential brute force attack or system issue',
    action: 'Investigate logs, check for attack patterns, consider temporary IP blocks',
  });
}
```

**Token Tampering Detected**:
```typescript
// Alert on any token tampering attempts
if (count('auth.token.tampered', last_5_minutes) > 5) {
  alert('potential_attack', {
    severity: 'critical',
    count: count,
    threshold: 5,
    message: 'Multiple token tampering attempts detected',
    action: 'Review IP addresses, check for coordinated attack, consider blocking IPs',
  });
}
```

**Session Tampering Detected**:
```typescript
// Alert on session cookie tampering
if (count('auth.session.tampered', last_5_minutes) > 5) {
  alert('session_tampering', {
    severity: 'critical',
    count: count,
    threshold: 5,
    message: 'Multiple session tampering attempts detected',
    action: 'Investigate source IPs, verify session signing key integrity',
  });
}
```

**Email Delivery Failures**:
```typescript
// Alert when email delivery fails repeatedly
if (count('email.failed', last_15_minutes) > 10) {
  alert('email_delivery_issues', {
    severity: 'critical',
    count: count,
    threshold: 10,
    message: 'Email service experiencing high failure rate',
    action: 'Check Resend API status, verify API key, review error logs',
  });
}
```

#### High Priority Alerts (Response Within 30 Minutes)

**Rate Limit Abuse**:
```typescript
// Alert when rate limits are frequently exceeded
if (count('auth.rate_limit.exceeded', last_5_minutes) > 50) {
  alert('rate_limit_abuse', {
    severity: 'high',
    count: count,
    threshold: 50,
    message: 'High rate of rate limit violations',
    action: 'Review IP addresses, check for bot activity, consider stricter limits',
  });
}
```

**Elevated Sign-In Failure Rate**:
```typescript
// Alert on elevated but not critical failure rate
if (count('auth.login.failure', last_15_minutes) > 50) {
  alert('elevated_auth_failures', {
    severity: 'high',
    count: count,
    threshold: 50,
    message: 'Elevated authentication failure rate',
    action: 'Monitor for escalation, review failure reasons',
  });
}
```

**Password Reset Spike**:
```typescript
// Alert on unusual password reset activity
if (count('auth.reset_password.request', last_hour) > 100) {
  alert('password_reset_spike', {
    severity: 'high',
    count: count,
    threshold: 100,
    message: 'Unusual spike in password reset requests',
    action: 'Check for automated attacks, verify legitimate user activity',
  });
}
```

**Email Queue Backlog**:
```typescript
// Alert when email queue grows too large
if (gauge('email.queue.size') > 1000) {
  alert('email_queue_backlog', {
    severity: 'high',
    value: gauge('email.queue.size'),
    threshold: 1000,
    message: 'Email queue backlog growing',
    action: 'Check email worker status, verify Resend API availability',
  });
}
```

#### Medium Priority Alerts (Response Within 2 Hours)

**Session Validation Errors**:
```typescript
// Alert on session validation issues
if (count('auth.session.validation.error', last_hour) > 20) {
  alert('session_validation_errors', {
    severity: 'medium',
    count: count,
    threshold: 20,
    message: 'Elevated session validation errors',
    action: 'Review database connectivity, check session table integrity',
  });
}
```

**Slow Authentication Response Times**:
```typescript
// Alert when auth endpoints are slow
if (histogram('auth.login.duration', p95) > 1000) {
  alert('slow_auth_response', {
    severity: 'medium',
    p95: histogram('auth.login.duration', p95),
    threshold: 1000,
    message: 'Authentication response times degraded',
    action: 'Check database performance, review query execution plans',
  });
}
```

**Unverified Email Sign-In Attempts**:
```typescript
// Alert on users trying to sign in without verification
if (count('auth.login.failure.unverified', last_hour) > 30) {
  alert('unverified_signin_attempts', {
    severity: 'medium',
    count: count,
    threshold: 30,
    message: 'High rate of unverified email sign-in attempts',
    action: 'Review verification email delivery, check for user confusion',
  });
}
```

### Metrics Collection

Implement the following metrics to track authentication system health and performance.

#### Counters (Cumulative Counts)

**Authentication Events**:
```typescript
// Track all authentication events
metrics.counter('auth.signup.total');           // Total signups
metrics.counter('auth.signup.success');         // Successful signups
metrics.counter('auth.signup.failure');         // Failed signups

metrics.counter('auth.login.total');            // Total sign-in attempts
metrics.counter('auth.login.success');          // Successful sign-ins
metrics.counter('auth.login.failure');          // Failed sign-ins
metrics.counter('auth.login.failure.invalid_credentials');
metrics.counter('auth.login.failure.unverified');

metrics.counter('auth.logout.total');           // Total sign-outs

metrics.counter('auth.verify_email.total');     // Email verification attempts
metrics.counter('auth.verify_email.success');   // Successful verifications
metrics.counter('auth.verify_email.failure');   // Failed verifications

metrics.counter('auth.reset_password.request'); // Password reset requests
metrics.counter('auth.reset_password.success'); // Successful resets
metrics.counter('auth.reset_password.failure'); // Failed resets
```

**Security Events**:
```typescript
metrics.counter('auth.rate_limit.exceeded');    // Rate limit hits
metrics.counter('auth.token.tampered');         // Token tampering attempts
metrics.counter('auth.session.tampered');       // Session tampering attempts
metrics.counter('auth.reauth.required');        // Re-auth prompts
metrics.counter('auth.reauth.failure');         // Failed re-auth attempts
```

**Email Events**:
```typescript
metrics.counter('email.queued');                // Emails queued
metrics.counter('email.sent');                  // Emails sent successfully
metrics.counter('email.failed');                // Email delivery failures
metrics.counter('email.retry');                 // Email retries scheduled
```

#### Gauges (Point-in-Time Values)

**System State**:
```typescript
metrics.gauge('auth.sessions.active');          // Current active sessions
metrics.gauge('auth.users.total');              // Total registered users
metrics.gauge('auth.users.verified');           // Verified users
metrics.gauge('email.queue.size');              // Current email queue size
metrics.gauge('auth.rate_limit.blocked_ips');   // Currently blocked IPs
```

#### Histograms (Distribution of Values)

**Performance Metrics**:
```typescript
metrics.histogram('auth.login.duration');                    // Sign-in duration (ms)
metrics.histogram('auth.signup.duration');                   // Signup duration (ms)
metrics.histogram('auth.session.validation.duration');       // Session validation (ms)
metrics.histogram('auth.password.hash.duration');            // Password hashing (ms)
metrics.histogram('auth.token.generation.duration');         // Token generation (ms)
metrics.histogram('email.delivery.duration');                // Email delivery (ms)
```

**Example Implementation**:
```typescript
// src/lib/metrics.ts
import { logger } from '@/lib/logger';

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  counter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    // Send to external metrics service (Datadog, Prometheus, etc.)
    this.sendMetric({ type: 'counter', name, value });
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
    this.sendMetric({ type: 'gauge', name, value });
  }

  histogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
    this.sendMetric({ type: 'histogram', name, value });
  }

  private sendMetric(metric: any): void {
    // Send to external service or log for collection
    logger.info('metric', metric);
  }

  getPercentile(name: string, percentile: number): number {
    const values = this.histograms.get(name) || [];
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

export const metrics = new MetricsCollector();
```

**Usage in Authentication Code**:
```typescript
// src/app/api/auth/login/route.ts
import { metrics } from '@/lib/metrics';

export async function POST(request: Request) {
  const start = Date.now();
  metrics.counter('auth.login.total');
  
  try {
    // ... authentication logic ...
    
    metrics.counter('auth.login.success');
    metrics.histogram('auth.login.duration', Date.now() - start);
    
    return Response.json({ user });
  } catch (error) {
    metrics.counter('auth.login.failure');
    metrics.histogram('auth.login.duration', Date.now() - start);
    
    throw error;
  }
}
```

### Email and Slack Alert Configuration

Configure notification channels to receive authentication alerts in real-time.

#### Slack Integration

**Setup Slack Webhook**:

1. Create Slack App:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name: "UI SyncUp Alerts"
   - Select workspace

2. Enable Incoming Webhooks:
   - Navigate to "Incoming Webhooks"
   - Toggle "Activate Incoming Webhooks" to On
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., `#auth-alerts`)
   - Copy webhook URL

3. Configure in Application:
   ```bash
   # Add to environment variables
   vercel env add SLACK_WEBHOOK_URL production
   # Paste webhook URL when prompted
   ```

4. Implement Alert Function:
   ```typescript
   // src/lib/alerts.ts
   import { env } from '@/lib/env';
   
   interface Alert {
     type: string;
     severity: 'critical' | 'high' | 'medium' | 'low';
     message: string;
     details?: Record<string, any>;
   }
   
   export async function sendSlackAlert(alert: Alert): Promise<void> {
     if (!env.SLACK_WEBHOOK_URL) return;
     
     const color = {
       critical: '#FF0000',
       high: '#FF6600',
       medium: '#FFCC00',
       low: '#00CC00',
     }[alert.severity];
     
     const payload = {
       attachments: [{
         color,
         title: `🚨 ${alert.severity.toUpperCase()}: ${alert.type}`,
         text: alert.message,
         fields: Object.entries(alert.details || {}).map(([key, value]) => ({
           title: key,
           value: String(value),
           short: true,
         })),
         footer: 'UI SyncUp Auth System',
         ts: Math.floor(Date.now() / 1000),
       }],
     };
     
     await fetch(env.SLACK_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     });
   }
   ```

5. Use in Alert Logic:
   ```typescript
   // src/lib/monitoring.ts
   import { sendSlackAlert } from '@/lib/alerts';
   import { metrics } from '@/lib/metrics';
   
   export async function checkAuthFailureRate(): Promise<void> {
     const failures = metrics.counter('auth.login.failure');
     
     if (failures > 100) {
       await sendSlackAlert({
         type: 'high_auth_failure_rate',
         severity: 'critical',
         message: 'Authentication failure rate exceeded threshold',
         details: {
           count: failures,
           threshold: 100,
           window: '5 minutes',
           action: 'Investigate logs for attack patterns',
         },
       });
     }
   }
   ```

#### Email Alerts

**Setup Email Alerts**:

1. Configure Email Service:
   ```typescript
   // src/lib/alerts.ts
   import { resend } from '@/server/email/client';
   import { env } from '@/lib/env';
   
   export async function sendEmailAlert(alert: Alert): Promise<void> {
     const recipients = env.ALERT_EMAIL_RECIPIENTS?.split(',') || [];
     if (recipients.length === 0) return;
     
     const subject = `[${alert.severity.toUpperCase()}] ${alert.type}`;
     const html = `
       <h2>${alert.message}</h2>
       <p><strong>Severity:</strong> ${alert.severity}</p>
       <p><strong>Time:</strong> ${new Date().toISOString()}</p>
       ${alert.details ? `
         <h3>Details:</h3>
         <ul>
           ${Object.entries(alert.details).map(([key, value]) => 
             `<li><strong>${key}:</strong> ${value}</li>`
           ).join('')}
         </ul>
       ` : ''}
     `;
     
     await resend.emails.send({
       from: 'alerts@yourdomain.com',
       to: recipients,
       subject,
       html,
     });
   }
   ```

2. Add Environment Variable:
   ```bash
   vercel env add ALERT_EMAIL_RECIPIENTS production
   # Enter: admin@yourdomain.com,devops@yourdomain.com
   ```

#### Discord Integration (Alternative)

**Setup Discord Webhook**:

1. Create Webhook:
   - Open Discord server
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Name: "Auth Alerts"
   - Select channel (e.g., `#auth-alerts`)
   - Copy webhook URL

2. Implement Discord Alerts:
   ```typescript
   // src/lib/alerts.ts
   export async function sendDiscordAlert(alert: Alert): Promise<void> {
     if (!env.DISCORD_WEBHOOK_URL) return;
     
     const color = {
       critical: 0xFF0000,
       high: 0xFF6600,
       medium: 0xFFCC00,
       low: 0x00CC00,
     }[alert.severity];
     
     const payload = {
       embeds: [{
         title: `🚨 ${alert.severity.toUpperCase()}: ${alert.type}`,
         description: alert.message,
         color,
         fields: Object.entries(alert.details || {}).map(([name, value]) => ({
           name,
           value: String(value),
           inline: true,
         })),
         timestamp: new Date().toISOString(),
         footer: { text: 'UI SyncUp Auth System' },
       }],
     };
     
     await fetch(env.DISCORD_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     });
   }
   ```

### Monitoring Dashboard Setup

Create a centralized dashboard to monitor authentication system health.

#### Vercel Analytics Dashboard

**Key Metrics to Display**:
- Authentication success/failure rates (last 24 hours)
- Active sessions count
- Email queue size
- Rate limit violations
- Response time percentiles (p50, p95, p99)

**Custom Dashboard** (if using external service):

```typescript
// Example: Datadog Dashboard Configuration
{
  "title": "Authentication System Health",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "Authentication Success Rate",
        "requests": [{
          "q": "sum:auth.login.success{*}.as_rate()",
          "display_type": "line"
        }]
      }
    },
    {
      "definition": {
        "type": "query_value",
        "title": "Active Sessions",
        "requests": [{
          "q": "avg:auth.sessions.active{*}"
        }]
      }
    },
    {
      "definition": {
        "type": "timeseries",
        "title": "Authentication Response Time (p95)",
        "requests": [{
          "q": "p95:auth.login.duration{*}",
          "display_type": "line"
        }]
      }
    }
  ]
}
```

### Troubleshooting Guide

Common authentication issues and their resolutions.

#### High Authentication Failure Rate

**Symptoms**:
- Alert: `high_auth_failure_rate`
- Many `auth.login.failure` events in logs

**Diagnosis**:
```bash
# Check recent login failures
vercel logs --follow | grep "auth.login.failure"

# Check for patterns (same IP, same email)
vercel logs | grep "auth.login.failure" | jq '.ipAddress' | sort | uniq -c | sort -rn

# Check failure reasons
vercel logs | grep "auth.login.failure" | jq '.errorCode' | sort | uniq -c
```

**Common Causes**:
1. **Brute Force Attack**:
   - Multiple IPs trying common passwords
   - Solution: Verify rate limiting is working, consider temporary IP blocks
   
2. **User Confusion**:
   - Users forgetting passwords
   - Solution: Improve password reset flow, add "forgot password" link
   
3. **System Issue**:
   - Database connectivity problems
   - Solution: Check database health, connection pool status

**Resolution**:
```bash
# If attack detected, block IPs temporarily
# Add to rate limiter with extended block time

# If system issue, check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Email Delivery Failures

**Symptoms**:
- Alert: `email_delivery_issues`
- Many `email.failed` events in logs

**Diagnosis**:
```bash
# Check email failure logs
vercel logs | grep "email.failed" | jq '.errorMessage'

# Check Resend API status
curl https://status.resend.com/api/v2/status.json

# Check email queue size
vercel logs | grep "email.queue.size" | tail -1
```

**Common Causes**:
1. **Resend API Issues**:
   - Service outage or rate limiting
   - Solution: Check Resend status page, wait for recovery
   
2. **Invalid API Key**:
   - Expired or incorrect API key
   - Solution: Verify `RESEND_API_KEY` environment variable
   
3. **Rate Limit Exceeded**:
   - Too many emails sent too quickly
   - Solution: Implement exponential backoff, upgrade Resend plan

**Resolution**:
```bash
# Verify API key
vercel env ls | grep RESEND_API_KEY

# Test Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","html":"Test"}'

# Check email queue and retry failed jobs
# (Implement admin endpoint to retry failed emails)
```

#### Session Validation Errors

**Symptoms**:
- Alert: `session_validation_errors`
- Users being logged out unexpectedly

**Diagnosis**:
```bash
# Check session validation errors
vercel logs | grep "auth.session.validation.error" | jq '.errorMessage'

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check session table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sessions WHERE expires_at > NOW();"
```

**Common Causes**:
1. **Database Connection Issues**:
   - Connection pool exhausted
   - Solution: Increase pool size, check for connection leaks
   
2. **Clock Skew**:
   - Server time out of sync
   - Solution: Verify server time, use NTP
   
3. **Session Expiration**:
   - Sessions expiring too quickly
   - Solution: Adjust session lifetime, verify rolling renewal

**Resolution**:
```bash
# Check database connection pool
psql $DATABASE_URL -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check server time
date -u

# Verify session expiration logic
psql $DATABASE_URL -c "SELECT id, expires_at, created_at FROM sessions ORDER BY created_at DESC LIMIT 10;"
```

#### Rate Limit Abuse

**Symptoms**:
- Alert: `rate_limit_abuse`
- Many `auth.rate_limit.exceeded` events

**Diagnosis**:
```bash
# Check rate limit violations
vercel logs | grep "auth.rate_limit.exceeded" | jq '.ipAddress' | sort | uniq -c | sort -rn

# Check for bot patterns
vercel logs | grep "auth.rate_limit.exceeded" | jq '.userAgent' | sort | uniq -c
```

**Common Causes**:
1. **Bot Attack**:
   - Automated tools trying to brute force
   - Solution: Block IPs, implement CAPTCHA
   
2. **Legitimate User**:
   - User repeatedly trying wrong password
   - Solution: Improve error messages, suggest password reset

**Resolution**:
```bash
# Block abusive IPs (implement IP blocking in rate limiter)
# Add to blocklist with extended timeout

# Consider implementing CAPTCHA for repeated failures
# Add reCAPTCHA or similar after 3 failed attempts
```

#### Token Tampering

**Symptoms**:
- Alert: `potential_attack`
- `auth.token.tampered` events in logs

**Diagnosis**:
```bash
# Check token tampering attempts
vercel logs | grep "auth.token.tampered" | jq '{ip: .ipAddress, token: .token, time: .timestamp}'

# Check for patterns
vercel logs | grep "auth.token.tampered" | jq '.ipAddress' | sort | uniq -c
```

**Common Causes**:
1. **Malicious Attack**:
   - Attacker trying to forge tokens
   - Solution: Verify token signing key, block IPs
   
2. **Old Tokens**:
   - Users using expired or old verification links
   - Solution: Improve token expiration messaging

**Resolution**:
```bash
# Verify token signing secret
vercel env ls | grep BETTER_AUTH_SECRET

# Rotate secret if compromised (will invalidate all tokens)
vercel env rm BETTER_AUTH_SECRET production
vercel env add BETTER_AUTH_SECRET production
# Enter new 32+ character secret

# Block attacking IPs
# Implement IP blocking in rate limiter
```

### Performance Monitoring

Monitor authentication system performance to ensure fast response times.

#### Target Performance Metrics

| Operation | Target (p95) | Critical Threshold |
|-----------|--------------|-------------------|
| Sign-in | < 500ms | > 1000ms |
| Sign-up | < 1000ms | > 2000ms |
| Session validation | < 100ms | > 500ms |
| Password hashing | < 200ms | > 500ms |
| Token generation | < 50ms | > 200ms |
| Email queueing | < 100ms | > 500ms |

#### Performance Monitoring Queries

```bash
# Check authentication response times
vercel logs | grep "auth.login.duration" | jq '.duration' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# Check p95 response time
vercel logs | grep "auth.login.duration" | jq '.duration' | \
  sort -n | awk '{a[NR]=$1} END {print "P95:", a[int(NR*0.95)]}'

# Check slow queries
vercel logs | grep "auth.login.duration" | jq 'select(.duration > 1000)'
```

#### Performance Optimization

If performance degrades:

1. **Check Database**:
   ```bash
   # Check slow queries
   psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   
   # Check missing indexes
   psql $DATABASE_URL -c "SELECT schemaname, tablename, attname FROM pg_stats WHERE schemaname = 'public' AND n_distinct < 0;"
   ```

2. **Check Connection Pool**:
   ```bash
   # Check active connections
   psql $DATABASE_URL -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
   ```

3. **Optimize Queries**:
   - Add indexes for frequently queried columns
   - Use `EXPLAIN ANALYZE` to identify slow queries
   - Implement query result caching

### Security Monitoring

Monitor for security threats and suspicious activity.

#### Security Metrics to Track

```typescript
// Track security events
metrics.counter('auth.suspicious.multiple_ips');        // Same user from multiple IPs
metrics.counter('auth.suspicious.rapid_signups');       // Many signups from same IP
metrics.counter('auth.suspicious.password_spray');      // Same password tried on multiple accounts
metrics.counter('auth.suspicious.credential_stuffing'); // Known breached credentials
```

#### Security Alerts

**Multiple IPs for Same User**:
```typescript
// Alert if user signs in from multiple IPs in short time
if (userIPCount(userId, last_hour) > 3) {
  alert('suspicious_activity', {
    severity: 'high',
    userId,
    ipCount: userIPCount(userId, last_hour),
    message: 'User signed in from multiple IPs',
  });
}
```

**Rapid Signups from Same IP**:
```typescript
// Alert if many signups from same IP
if (signupsFromIP(ipAddress, last_hour) > 10) {
  alert('suspicious_signups', {
    severity: 'high',
    ipAddress,
    count: signupsFromIP(ipAddress, last_hour),
    message: 'Rapid signups from single IP',
  });
}
```

### Compliance and Audit Logging

Maintain audit logs for compliance and security investigations.

#### Audit Log Requirements

All authentication events must be logged with:
- Event ID (UUID)
- Timestamp (ISO 8601)
- User ID (if authenticated)
- Email (hashed for PII protection)
- IP address
- User agent
- Outcome (success/failure)
- Error code (if failed)

#### Audit Log Retention

| Environment | Retention Period | Storage |
|-------------|------------------|---------|
| Production | 90 days | External log service |
| Preview | 7 days | Vercel logs |
| Development | 1 day | Local logs |

#### Audit Log Queries

```bash
# Find all events for a user
vercel logs | grep "userId:user_123" | jq '.'

# Find all failed login attempts
vercel logs | grep "auth.login.failure" | jq '{time: .timestamp, email: .email, ip: .ipAddress}'

# Find all password changes
vercel logs | grep "auth.reset_password.success" | jq '{time: .timestamp, userId: .userId}'

# Find all token tampering attempts
vercel logs | grep "auth.token.tampered" | jq '{time: .timestamp, ip: .ipAddress, token: .token}'
```

### Monitoring Checklist

Use this checklist to ensure comprehensive authentication monitoring.

#### Daily Monitoring (5 minutes)

- [ ] Check authentication success rate (should be > 95%)
- [ ] Review error rate (should be < 1%)
- [ ] Check email queue size (should be < 100)
- [ ] Verify no critical alerts triggered
- [ ] Review rate limit violations (should be < 50/day)

#### Weekly Monitoring (30 minutes)

- [ ] Review authentication metrics trends
- [ ] Check for unusual patterns (time of day, geography)
- [ ] Review top error messages
- [ ] Verify email delivery rate (should be > 99%)
- [ ] Check session validation performance
- [ ] Review security events (tampering, suspicious activity)
- [ ] Verify rate limiting effectiveness

#### Monthly Monitoring (2 hours)

- [ ] Review authentication system performance trends
- [ ] Analyze user behavior patterns
- [ ] Review and update alert thresholds
- [ ] Check for security vulnerabilities
- [ ] Review audit logs for compliance
- [ ] Update monitoring documentation
- [ ] Test alert notification channels
- [ ] Review and optimize database queries
- [ ] Check for outdated dependencies
- [ ] Verify backup and recovery procedures

---

**Last Updated**: 2025-11-20
**Maintained By**: DevOps Team
