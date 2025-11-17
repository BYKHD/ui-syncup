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

### Daily Checks

- [ ] Review Vercel deployment status
- [ ] Check error logs in Vercel Dashboard
- [ ] Monitor performance metrics (Web Vitals)
- [ ] Review preview deployment usage

### Weekly Checks

- [ ] Review environment variable expiry (if applicable)
- [ ] Check security alerts (Dependabot, npm audit)
- [ ] Review and clean up old preview deployments
- [ ] Monitor bandwidth and function invocation usage

### Monthly Checks

- [ ] Rotate secrets (database passwords, API keys)
- [ ] Review access permissions (Vercel team members)
- [ ] Update dependencies (`bun update`)
- [ ] Review and optimize costs
- [ ] Audit environment variables across all scopes

### Cost Optimization

**Vercel Usage**:
- Monitor bandwidth usage in Vercel Dashboard
- Optimize image delivery (use Next.js Image component)
- Use edge caching effectively (`Cache-Control` headers)
- Clean up old preview deployments regularly

**External Services**:
- Monitor Supabase database size and connection pool usage
- Optimize Cloudflare R2 storage (delete unused files)
- Review API call patterns and implement rate limiting
- Set up billing alerts in each service

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

**Last Updated**: 2025-11-17
**Maintained By**: DevOps Team
