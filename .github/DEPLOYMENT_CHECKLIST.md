# 🚀 Production Deployment Checklist

Use this checklist before merging to `main` branch to ensure safe production deployments.

---

## 📋 Pre-Deployment Checklist

### 1. Code Quality & Testing
- [ ] All CI checks passing (lint, typecheck, tests)
- [ ] E2E tests passing
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] Code reviewed and approved by at least 1 team member
- [ ] All PR comments addressed and resolved

### 2. Database & Migrations
- [ ] New migrations generated (`bun run db:generate`)
- [ ] Migrations tested on local environment
- [ ] Migrations tested on dev Supabase database
- [ ] No breaking changes to existing tables/columns
- [ ] Migrations are backwards compatible (can rollback safely)
- [ ] Foreign keys and constraints properly defined
- [ ] Indexes added for performance (if needed)

### 3. Environment Variables
- [ ] All new env vars added to `.env.example`
- [ ] Production env vars updated in Vercel dashboard
- [ ] Dev/Preview env vars updated in Vercel dashboard
- [ ] No secrets committed to git (check with `git log -p`)
- [ ] Verify env vars match between dev and prod

### 4. Features & Functionality
- [ ] New features tested in preview deployment (develop branch)
- [ ] Feature flags configured (if applicable)
- [ ] No console.log/debug statements in production code
- [ ] Error handling implemented for new features
- [ ] Loading states and error messages user-friendly

### 5. Performance & Security
- [ ] No N+1 query problems introduced
- [ ] Images optimized and using Next.js Image component
- [ ] API routes have rate limiting (if needed)
- [ ] Authentication/authorization checks in place
- [ ] No exposed sensitive data in API responses
- [ ] CORS configured properly

### 6. External Services
- [ ] Supabase production project accessible
- [ ] R2/Cloudflare storage configured for prod
- [ ] Email service (Resend) tested with production keys
- [ ] Google OAuth callback URLs updated (if changed)
- [ ] All third-party API keys valid and active

---

## 🔄 Deployment Process

### Step 1: Final Testing on Develop
```bash
# Ensure you're on develop branch
git checkout develop

# Pull latest changes
git pull origin develop

# Test locally
bun install
bun run dev

# Run all checks
bun run typecheck
bun run lint
bun run test
bun run build
```

### Step 2: Create Pull Request
```bash
# Create PR from develop to main
gh pr create --base main --head develop --title "Release: [Version/Feature Name]" --body "$(cat .github/DEPLOYMENT_CHECKLIST.md)"
```

### Step 3: Review & Approve
- [ ] PR description includes all changes
- [ ] Screenshots/videos of new features (if UI changes)
- [ ] Database migration plan documented
- [ ] Rollback plan documented (if needed)
- [ ] Team members reviewed and approved

### Step 4: Merge to Main
- [ ] Squash or merge commits (follow team convention)
- [ ] Delete develop branch? (No - keep it for future development)
- [ ] Monitor GitHub Actions workflow
- [ ] Wait for migrations to complete
- [ ] Wait for Vercel deployment to finish

---

## ✅ Post-Deployment Verification

### Immediate Checks (within 5 minutes)
- [ ] Production site loads without errors
- [ ] Database migrations applied successfully (check GitHub Actions logs)
- [ ] User authentication works (login/signup)
- [ ] Core features functional (test critical user flows)
- [ ] Check Vercel deployment logs for errors
- [ ] Check browser console for errors

### Extended Checks (within 30 minutes)
- [ ] Monitor error tracking (if you have Sentry/similar)
- [ ] Check database connection pool usage
- [ ] Verify email sending works (test verification/reset emails)
- [ ] Test file uploads (if applicable)
- [ ] Mobile responsiveness check
- [ ] Performance metrics acceptable (Lighthouse/Core Web Vitals)

### User Acceptance
- [ ] Notify team/stakeholders of deployment
- [ ] Monitor user feedback/reports
- [ ] Check for increased error rates
- [ ] Verify analytics tracking (if enabled)

---

## 🔥 Emergency Rollback Plan

If something goes wrong after deployment:

### Option 1: Revert via Git
```bash
# Find the commit hash before the merge
git log --oneline

# Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin main
```

### Option 2: Revert via Vercel
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Option 3: Database Rollback
```sql
-- If migration caused issues, manually rollback in Supabase SQL Editor
-- Example: Drop the new table
DROP TABLE IF EXISTS projects;

-- OR revert column changes
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

---

## 📊 Deployment Log Template

Copy this template for each production deployment:

```markdown
## Deployment: [Date] - [Feature/Version Name]

**Deployed by:** [Your Name]
**PR:** #[PR Number]
**Commit:** [Commit Hash]

### Changes Included:
- Feature 1: Description
- Feature 2: Description
- Bug fix: Description
- Migration: Description

### Database Changes:
- [ ] New table: projects
- [ ] Modified column: users.email_verified
- [ ] New index: users_email_idx

### Rollback Plan:
- If issues occur: [Specific rollback steps]
- Contact: [Team member] if help needed

### Post-Deployment Status:
- [ ] Deployment successful at [Time]
- [ ] Migrations completed at [Time]
- [ ] Verification checks passed
- [ ] No critical errors detected

### Notes:
[Any additional notes or observations]
```

---

## 🛠️ Troubleshooting Common Issues

### Migration Failed
```bash
# Check GitHub Actions logs for error details
# Common issues:
# - Syntax error in SQL
# - Foreign key constraint violation
# - Column already exists
# - Connection timeout

# Fix: Create a new migration to fix the issue
bun run db:generate
git add drizzle/
git commit -m "fix: correct migration error"
git push origin main
```

### Vercel Build Failed
```bash
# Check Vercel deployment logs
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Build timeout

# Fix in Vercel dashboard:
# 1. Settings → Environment Variables
# 2. Redeploy from Vercel dashboard
```

### Environment Variables Not Working
```bash
# Ensure variables are set for the correct environment:
# - Production: Only available on main branch
# - Preview: Available on all other branches

# Redeploy after adding variables:
# Vercel automatically redeploys when env vars change
```

---

## 📚 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs/deployments/overview)
- [Drizzle Migrations Docs](https://orm.drizzle.team/docs/migrations)
- [Supabase Database Management](https://supabase.com/docs/guides/database)
- [Next.js Deployment Best Practices](https://nextjs.org/docs/deployment)

---

**Remember:** It's better to deploy smaller, incremental changes more frequently than large, risky deployments. When in doubt, ask for a second review!
