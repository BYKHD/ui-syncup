# Vercel Integration Quick Start

This guide provides a quick reference for verifying your Vercel integration.

## Quick Verification

Run the automated verification script:

```bash
bun run verify:vercel
```

This will check:
- ✅ Git remote configuration
- ✅ GitHub workflows exist
- ✅ Local environment files
- ⚠️  Manual steps for Vercel dashboard

## Manual Verification Steps

### 1. Verify Git Connection (Task 5.1)

**In Vercel Dashboard:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project
2. Navigate to **Settings** → **Git**
3. Confirm:
   - [ ] GitHub repository is connected
   - [ ] Production Branch = `main`
   - [ ] Preview Deployments = Enabled for all branches

**Requirements:** 2.2, 3.3

### 2. Verify Environment Variables (Task 5.2)

**In Vercel Dashboard:**
1. Navigate to **Settings** → **Environment Variables**
2. Confirm **Preview** environment has:
   - [ ] `DEV_DATABASE_URL`
   - [ ] `DEV_DIRECT_URL`
   - [ ] All other required variables
3. Confirm **Production** environment has:
   - [ ] `PROD_DATABASE_URL`
   - [ ] `PROD_DIRECT_URL`
   - [ ] All other required variables

**Requirements:** 2.4, 3.4, 5.5

## Test the Integration

### Test Preview Deployment

```bash
# Create test branch
git checkout -b test/vercel-preview
echo "# Test" >> README.md
git add . && git commit -m "Test preview deployment"
git push origin test/vercel-preview
```

**Expected:**
- GitHub Actions runs CI checks
- GitHub Actions runs migrations on dev database
- Vercel creates preview deployment
- Preview URL posted in commit/PR

### Test Production Deployment

```bash
# Merge to main (after PR approval)
git checkout main
git merge test/vercel-preview
git push origin main
```

**Expected:**
- GitHub Actions runs CI checks
- GitHub Actions runs migrations on prod database
- Vercel deploys to production

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Vercel not connected | Go to Vercel → Add New Project → Import from GitHub |
| Wrong production branch | Settings → Git → Change to `main` |
| Missing env variables | Settings → Environment Variables → Add missing vars |
| Deployment not triggered | Check GitHub Actions logs, verify workflows exist |

## Full Documentation

For detailed step-by-step instructions, see:
- [VERCEL_INTEGRATION_CHECKLIST.md](./VERCEL_INTEGRATION_CHECKLIST.md)

## Scripts

- `bun run verify:vercel` - Run automated verification
- `bun run db:migrate` - Run database migrations (used by CI/CD)

## Support

If you encounter issues:
1. Check the verification script output
2. Review the full checklist documentation
3. Check Vercel deployment logs
4. Check GitHub Actions workflow logs
