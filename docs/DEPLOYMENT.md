# Deployment Guide

This guide provides step-by-step procedures for deploying UI SyncUp to Vercel, managing environments, and handling production operations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Vercel Setup](#initial-vercel-setup)
- [Environment Variables Reference](#environment-variables-reference)
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

1. **Branch Protection Rules** (GitHub)
   - Navigate to Repository Settings → Branches
   - Add rule for `main` branch:
     - ✅ Require pull request reviews (1 approval)
     - ✅ Require status checks to pass
     - ✅ Require branches to be up to date
     - Add required checks: `quality-checks` (from CI workflow)
     - ✅ Include administrators

2. **Deployment Settings** (Vercel)
   - Project Settings → Git
   - ✅ Enable "Automatic Deployments from Git"
   - ✅ Enable "Preview Deployments" for all branches
   - ✅ Enable "Production Deployments" for `main` branch only

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

### Deployment Checklist

Before deploying to production:

- [ ] All CI checks pass (typecheck, lint, test, build)
- [ ] Preview environment tested and verified
- [ ] Database migrations reviewed and tested
- [ ] Environment variables verified (no missing values)
- [ ] Breaking changes documented
- [ ] Rollback plan prepared
- [ ] Team notified of deployment

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
