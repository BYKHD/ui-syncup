# Vercel Integration Verification Checklist

This document provides a step-by-step checklist to verify that Vercel is properly integrated with the GitHub repository for the CI/CD pipeline.

## Prerequisites

- Access to Vercel dashboard
- Access to GitHub repository settings
- Vercel CLI installed (optional): `npm i -g vercel`

## Task 5.1: Confirm Vercel Git Connection

### Step 1: Verify GitHub Repository Connection

1. **Navigate to Vercel Dashboard**
   - Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project (UI SyncUp)

2. **Check Git Integration**
   - Go to **Settings** → **Git**
   - Verify the following:
     - [ ] GitHub repository is connected
     - [ ] Repository name matches your GitHub repo
     - [ ] Connection status shows "Connected"

3. **Verify Production Branch**
   - In the Git settings page:
     - [ ] "Production Branch" is set to `main`
     - [ ] This ensures production deployments only happen from the main branch

4. **Verify Preview Deployments**
   - In the Git settings page:
     - [ ] "Preview Deployments" is enabled
     - [ ] Set to "All branches" or "All non-production branches"
     - [ ] This ensures preview deployments are created for dev and feature branches

### Step 2: Test Git Connection

Run the verification script:

```bash
bun run scripts/verify-vercel-integration.ts
```

Or manually verify:

```bash
# Check git remote
git remote get-url origin
# Should show: git@github.com:<org>/<repo>.git or https://github.com/<org>/<repo>.git

# Check current branch
git branch --show-current

# Check Vercel project (if CLI installed)
vercel project ls
```

### Validation Criteria

- ✅ Vercel dashboard shows GitHub repository connected
- ✅ Production branch is set to `main`
- ✅ Preview deployments are enabled for all branches
- ✅ Git remote points to GitHub

**Requirements Validated:** 2.2, 3.3

---

## Task 5.2: Verify Vercel Environment Variables

### Step 1: Check Preview Environment Variables

1. **Navigate to Environment Variables**
   - In Vercel dashboard, go to **Settings** → **Environment Variables**

2. **Verify Preview Environment Variables**
   - [ ] `DEV_DATABASE_URL` exists and is set for **Preview** environment
   - [ ] `DEV_DIRECT_URL` exists and is set for **Preview** environment
   - [ ] All other required environment variables are configured for Preview

3. **Required Environment Variables for Preview**
   ```
   DEV_DATABASE_URL          (Supabase pooled connection)
   DEV_DIRECT_URL            (Supabase direct connection)
   NEXT_PUBLIC_APP_URL       (Preview app URL)
   BETTER_AUTH_SECRET        (Auth secret)
   BETTER_AUTH_URL           (Auth URL for preview)
   RESEND_API_KEY            (Email service)
   RESEND_FROM_EMAIL         (From email address)
   NODE_ENV                  (development)
   ```

### Step 2: Check Production Environment Variables

1. **Verify Production Environment Variables**
   - [ ] `PROD_DATABASE_URL` exists and is set for **Production** environment
   - [ ] `PROD_DIRECT_URL` exists and is set for **Production** environment
   - [ ] All other required environment variables are configured for Production

2. **Required Environment Variables for Production**
   ```
   PROD_DATABASE_URL         (Supabase pooled connection)
   PROD_DIRECT_URL           (Supabase direct connection)
   NEXT_PUBLIC_APP_URL       (Production app URL)
   BETTER_AUTH_SECRET        (Auth secret - different from preview)
   BETTER_AUTH_URL           (Auth URL for production)
   RESEND_API_KEY            (Email service)
   RESEND_FROM_EMAIL         (From email address)
   NODE_ENV                  (production)
   ```

### Step 3: Verify Environment Variable Scope

For each environment variable, verify:
- [ ] Preview variables are scoped to "Preview" environment only
- [ ] Production variables are scoped to "Production" environment only
- [ ] No sensitive production values are exposed to preview environments

### Step 4: Cross-Reference with Local Environment Files

Compare Vercel environment variables with local `.env` files:

```bash
# Check local environment files
ls -la .env*

# Files should include:
# .env.development  (dev/preview values)
# .env.production   (production values)
# .env.local        (local overrides - not committed)
# .env.example      (template for required variables)
```

Verify that:
- [ ] `.env.example` lists all required variables
- [ ] `.env.development` matches Preview environment in Vercel
- [ ] `.env.production` matches Production environment in Vercel
- [ ] `.env.local` is in `.gitignore`

### Validation Criteria

- ✅ All required Preview environment variables are configured
- ✅ All required Production environment variables are configured
- ✅ Environment variables are properly scoped
- ✅ No production secrets in preview environment
- ✅ Local `.env` files match Vercel configuration

**Requirements Validated:** 2.4, 3.4, 5.5

---

## Automated Verification

Run the verification script to check what can be automated:

```bash
bun run scripts/verify-vercel-integration.ts
```

This script will:
- ✅ Check git remote configuration
- ✅ Verify GitHub workflows exist
- ✅ Check local environment files
- ⚠️  Provide manual verification steps for Vercel dashboard checks

---

## Troubleshooting

### Issue: Vercel Not Connected to GitHub

**Solution:**
1. Go to Vercel dashboard → Add New Project
2. Import from GitHub
3. Select your repository
4. Configure project settings
5. Deploy

### Issue: Wrong Production Branch

**Solution:**
1. Go to Settings → Git
2. Change "Production Branch" to `main`
3. Save changes

### Issue: Preview Deployments Not Working

**Solution:**
1. Go to Settings → Git
2. Enable "Preview Deployments"
3. Select "All branches" or configure branch patterns
4. Save changes

### Issue: Missing Environment Variables

**Solution:**
1. Go to Settings → Environment Variables
2. Add missing variables
3. Select correct environment (Preview/Production)
4. Redeploy to apply changes

### Issue: Environment Variables Not Applied

**Solution:**
1. After adding/updating environment variables
2. Trigger a new deployment:
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push
   ```
3. Or redeploy from Vercel dashboard

---

## Testing the Integration

After completing all verification steps, test the integration:

### Test Preview Deployment

```bash
# Create a test branch
git checkout -b test/vercel-integration

# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test Vercel preview deployment"

# Push to trigger deployment
git push origin test/vercel-integration
```

**Expected Results:**
- ✅ GitHub Actions CI workflow runs
- ✅ GitHub Actions Deploy workflow runs migrations on dev database
- ✅ Vercel creates a preview deployment
- ✅ Preview URL is posted as a comment on the commit/PR
- ✅ Preview deployment uses DEV_DATABASE_URL and DEV_DIRECT_URL

### Test Production Deployment

```bash
# Create PR to main
gh pr create --base main --head test/vercel-integration --title "Test deployment"

# After approval, merge
gh pr merge --squash

# Or merge via GitHub UI
```

**Expected Results:**
- ✅ GitHub Actions CI workflow runs on main
- ✅ GitHub Actions Deploy workflow runs migrations on prod database
- ✅ Vercel deploys to production
- ✅ Production deployment uses PROD_DATABASE_URL and PROD_DIRECT_URL
- ✅ Production URL is updated

---

## Sign-Off

Once all checks are complete, sign off on the verification:

- [ ] Task 5.1: Vercel Git connection verified
- [ ] Task 5.2: Environment variables verified
- [ ] Preview deployment tested successfully
- [ ] Production deployment tested successfully
- [ ] All requirements validated (2.2, 2.4, 3.3, 3.4, 5.5)

**Verified by:** _______________  
**Date:** _______________  
**Notes:** _______________

---

## References

- [Vercel Git Integration Docs](https://vercel.com/docs/deployments/git)
- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- Project Design Document: `.kiro/specs/github-actions-cicd/design.md`
- Project Requirements: `.kiro/specs/github-actions-cicd/requirements.md`
