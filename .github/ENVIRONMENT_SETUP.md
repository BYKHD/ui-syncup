# GitHub Environment Protection Setup Guide

This guide explains how to configure GitHub Environments for your deployment workflows with proper security controls.

## Overview

GitHub Environments provide:
- **Environment-specific secrets** (separate production/preview credentials)
- **Protection rules** (required approvers, wait timers)
- **Deployment history** (track all deployments)
- **Audit logs** (who approved what, when)

## Step 1: Create Environments

### 1.1 Navigate to Environment Settings
1. Go to your repository on GitHub
2. Click **Settings** tab
3. In the left sidebar, click **Environments**

### 1.2 Create Production Environment
1. Click **New environment**
2. Name: `production`
3. Click **Configure environment**

### 1.3 Create Preview Environment
1. Click **New environment**
2. Name: `preview`
3. Click **Configure environment**

## Step 2: Configure Production Environment Protection Rules

### 2.1 Required Reviewers
1. In the `production` environment settings
2. Check **Required reviewers**
3. Add at least 1-2 senior developers who can approve production deployments
4. Click **Save protection rules**

**Why?** Prevents accidental production deployments. Every production deployment requires manual approval.

### 2.2 Wait Timer (Optional but Recommended)
1. Check **Wait timer**
2. Set to **5 minutes**
3. Click **Save protection rules**

**Why?** Gives time to catch mistakes before deployment proceeds. You can override by manually approving earlier.

### 2.3 Deployment Branches
1. Under **Deployment branches**, select **Protected branches only**
2. This ensures only `main` branch can deploy to production

**Why?** Prevents accidental production deployments from feature branches.

## Step 3: Configure Environment Secrets

### 3.1 Production Secrets

In the `production` environment, add these secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PROD_DATABASE_URL` | Production database connection URL | `postgresql://user:pass@host:5432/db` |
| `PROD_DIRECT_URL` | Direct connection URL (for migrations) | `postgresql://user:pass@host:5432/db` |

**How to add:**
1. In `production` environment settings
2. Scroll to **Environment secrets**
3. Click **Add secret**
4. Enter name and value
5. Click **Add secret**

### 3.2 Preview Secrets

In the `preview` environment, add these secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DEV_DATABASE_URL` | Development database connection URL | `postgresql://user:pass@host:5432/dev_db` |
| `DEV_DIRECT_URL` | Direct connection URL (for migrations) | `postgresql://user:pass@host:5432/dev_db` |

### 3.3 Repository-Level Secrets (Shared)

Some secrets are used across all environments. Add these at the repository level:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Used In |
|-------------|-------------|---------|
| `TEST_DATABASE_URL` | Test database for CI/E2E | CI, E2E workflows |
| `TEST_SUPABASE_URL` | Test Supabase URL | CI, E2E workflows |
| `TEST_SUPABASE_ANON_KEY` | Test Supabase anon key | CI, E2E workflows |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | Test Supabase service key | CI, E2E workflows |
| `TEST_R2_ACCOUNT_ID` | Test R2 account ID | CI, E2E workflows |
| `TEST_R2_ACCESS_KEY_ID` | Test R2 access key | CI, E2E workflows |
| `TEST_R2_SECRET_ACCESS_KEY` | Test R2 secret key | CI, E2E workflows |
| `TEST_R2_BUCKET_NAME` | Test R2 bucket name | CI, E2E workflows |
| `TEST_R2_PUBLIC_URL` | Test R2 public URL | CI, E2E workflows |
| `TEST_GOOGLE_CLIENT_ID` | Test Google OAuth client ID | CI, E2E workflows |
| `TEST_GOOGLE_CLIENT_SECRET` | Test Google OAuth secret | CI, E2E workflows |
| `BETTER_AUTH_SECRET` | Auth secret (32+ chars) | E2E workflows |
| `TEST_BETTER_AUTH_SECRET` | Test auth secret | CI workflows |
| `RESEND_API_KEY` | Email API key | E2E workflows |
| `TEST_RESEND_API_KEY` | Test email API key | CI workflows |

## Step 4: Verify Configuration

### 4.1 Test Preview Deployment
1. Create a branch from `develop`
2. Make a small change
3. Push to `develop` branch
4. Watch the **Actions** tab
5. Verify workflow runs and accesses `preview` environment secrets

### 4.2 Test Production Deployment (Dry Run)
1. Create a PR to `main`
2. Wait for CI and E2E tests to pass
3. Merge the PR
4. Watch the **Actions** tab
5. You should see a **Review required** status
6. An approved reviewer must click **Review deployments** and approve
7. After approval, migration runs automatically

## Step 5: Environment URLs

Update these URLs to match your actual deployment URLs:

**In `.github/workflows/deploy.yml`:**

```yaml
environment:
  name: ${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}
  url: ${{ github.ref == 'refs/heads/main' && 'https://ui-syncup.vercel.app' || 'https://ui-syncup-git-develop.vercel.app' }}
```

Replace:
- `https://ui-syncup.vercel.app` with your actual production URL
- `https://ui-syncup-git-develop.vercel.app` with your actual preview URL

## Step 6: Monitor Deployments

### View Deployment History
1. Go to repository **Code** tab
2. Click **Environments** in the right sidebar
3. Click on `production` or `preview`
4. See all past deployments with:
   - Who triggered it
   - Who approved it
   - When it ran
   - Success/failure status

### View Active Deployments
1. Go to **Actions** tab
2. Click on a running workflow
3. See environment protection status
4. Approve/reject deployments if you're a reviewer

## Troubleshooting

### Issue: "Environment not found" error

**Solution:** Make sure environment name in workflow matches exactly:
- Workflow: `environment: production`
- GitHub: Environment must be named exactly `production` (case-sensitive)

### Issue: Workflow runs without approval

**Possible causes:**
1. No protection rules configured in environment settings
2. User who pushed is also a required reviewer (can self-approve)
3. Workflow is running on a branch other than `main`

**Solution:** Double-check protection rules are saved and active

### Issue: Cannot access environment secrets

**Error:** `secret PROD_DATABASE_URL not found`

**Solution:**
1. Verify secret is added to correct environment (not repository level)
2. Verify secret name matches exactly (case-sensitive)
3. Verify workflow references correct environment

### Issue: PR validation fails with migration errors

**Error:** `Generated migrations differ from committed migrations`

**Solution:**
1. Run `bun run db:generate` locally
2. Review generated migration files in `drizzle/` directory
3. Commit the changes
4. Push to trigger workflow again

## Security Best Practices

### ✅ DO:
- Use different database credentials for production/preview/test
- Rotate credentials every 90 days
- Use read-only credentials where possible
- Monitor audit logs regularly
- Require at least 2 reviewers for production
- Use wait timers for production deployments

### ❌ DON'T:
- Share production credentials in Slack/email
- Commit secrets to git (use `.env.local` which is gitignored)
- Use production database for testing
- Allow developers to self-approve their own production deployments
- Skip environment protection for "hotfixes"

## Migration Strategy

### Current Setup (After Fixes)
- **Production:** Uses `db:migrate` with versioned migrations
- **Preview:** Uses `db:migrate` with versioned migrations
- **Testing:** Uses `db:push` (acceptable for CI)

### Before Each Deployment
1. Developer makes schema changes locally
2. Run `bun run db:generate` to create migration file
3. Commit migration files to git
4. Create PR
5. PR validation checks migration files are up-to-date
6. After merge, workflow runs migrations automatically

### Rollback Strategy
If a migration fails:
1. Workflow will fail and halt deployment
2. Database health check will verify connectivity
3. Check workflow logs for error details
4. Fix migration issue locally
5. Create new migration to resolve issue or revert changes
6. Do NOT manually edit database schema

## Next Steps

After completing this setup:

1. **Test the full pipeline:**
   - Create a test PR
   - Verify CI runs
   - Verify E2E tests run
   - Merge to `develop`
   - Verify preview deployment
   - Create PR to `main`
   - Verify production approval required

2. **Document your team's process:**
   - Who are the production approvers?
   - What's the process for emergency hotfixes?
   - How do we handle failed deployments?

3. **Set up notifications:**
   - Consider adding Slack/Discord notifications
   - Set up email alerts for failed deployments
   - Monitor deployment frequency

## Additional Resources

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Drizzle Kit Migrate Docs](https://orm.drizzle.team/kit-docs/overview#prototyping-with-db-push)
- [Vercel + GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)

## Questions?

If you run into issues or have questions about environment setup:
1. Check the troubleshooting section above
2. Review GitHub Actions workflow logs
3. Check this repository's Issues page
4. Contact your team's DevOps lead
