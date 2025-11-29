# CI/CD Monitoring Quick Reference

Quick reference guide for monitoring and responding to CI/CD alerts.

## Quick Links

- **GitHub Actions**: https://github.com/BYKHD/ui-syncup/actions
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Health Check**: https://ui-syncup.com/api/health
- **Notification Settings**: https://github.com/settings/notifications

## Common Alerts and Responses

### 🚨 Production Migration Failed

**Alert**: "Production Migration Failed" notification

**Immediate Actions**:
1. Check workflow logs: https://github.com/BYKHD/ui-syncup/actions
2. Review migration error in "Run database migrations" step
3. Verify production database is accessible
4. Check if migration is safe to retry

**Resolution Steps**:
```bash
# 1. Review the failed migration
gh run view --log

# 2. If migration is safe to retry, re-run workflow
gh run rerun <run-id>

# 3. If migration needs fixing, create hotfix
git checkout main
git pull
git checkout -b hotfix/migration-fix
# Fix migration file
git commit -m "fix: correct migration issue"
git push origin hotfix/migration-fix
# Create PR and merge after review
```

**Rollback** (if needed):
```bash
# Rollback code via Vercel
vercel promote <previous-deployment-url>

# Rollback database (manual)
psql $PROD_DIRECT_URL
DELETE FROM drizzle_migrations WHERE hash = '<migration-hash>';
-- Execute rollback SQL
```

### ❌ CI Quality Checks Failed

**Alert**: "CI Quality Checks Failed" notification

**Immediate Actions**:
1. Check which step failed (TypeScript, ESLint, Tests, Build)
2. Review error logs
3. Determine if it's a code issue or infrastructure issue

**Resolution Steps**:
```bash
# 1. Pull latest changes
git pull origin <branch>

# 2. Run checks locally
bun run typecheck  # If TypeScript failed
bun run lint       # If ESLint failed
bun run test       # If tests failed
bun run build      # If build failed

# 3. Fix issues and push
git add .
git commit -m "fix: resolve CI issues"
git push
```

### ⚠️ Preview Deployment Failed

**Alert**: "Preview Deployment Failed" notification

**Immediate Actions**:
1. Check if migration failed or Vercel deployment failed
2. Review workflow logs for migration errors
3. Check Vercel logs for build errors

**Resolution Steps**:
```bash
# If migration failed
# 1. Review migration error
gh run view --log

# 2. Fix migration and push
git add drizzle/
git commit -m "fix: correct migration"
git push

# If Vercel build failed
# 1. Check Vercel logs
vercel logs <deployment-url>

# 2. Fix build issues and push
git add .
git commit -m "fix: resolve build issues"
git push
```

### 🏥 Health Check Failing

**Alert**: "Health check failed" from uptime monitor

**Immediate Actions**:
1. Verify application is accessible: https://ui-syncup.com
2. Check health endpoint: https://ui-syncup.com/api/health
3. Review Vercel deployment status
4. Check database connectivity

**Resolution Steps**:
```bash
# 1. Check current deployment status
vercel ls

# 2. Check deployment logs
vercel logs

# 3. If deployment is broken, rollback
vercel promote <previous-deployment-url>

# 4. If database is down, check Supabase status
# Go to: https://status.supabase.com/
```

## Monitoring Checklist

### Daily
- [ ] Check GitHub Actions for failed workflows
- [ ] Review Vercel deployment status
- [ ] Verify health check is passing

### Weekly
- [ ] Review workflow performance metrics
- [ ] Check deployment frequency and success rate
- [ ] Audit failed workflows and identify patterns

### Monthly
- [ ] Review and update monitoring configuration
- [ ] Rotate secrets if needed
- [ ] Update documentation

## Notification Channels

### Email
- **GitHub Actions**: Configured in https://github.com/settings/notifications
- **Vercel**: Configured in Vercel Dashboard → Settings → Notifications

### Slack (if configured)
- **Channel**: #deployments
- **Alerts**: Workflow failures, deployment status

### Discord (if configured)
- **Channel**: #deployments
- **Alerts**: Workflow failures, deployment status

## Escalation

### Severity Levels

**P0 - Critical** (Immediate response):
- Production deployment failed
- Production migration failed
- Health check failing >5 minutes
- Production site down

**P1 - High** (1 hour response):
- Preview deployment failed
- CI checks failing on main branch
- Database connectivity issues

**P2 - Medium** (4 hour response):
- CI checks failing on feature branches
- Preview migration failed
- Performance degradation

**P3 - Low** (Business hours):
- Workflow performance issues
- Non-critical warnings

### Contact Information

- **Team Lead**: [Contact info]
- **DevOps**: [Contact info]
- **On-Call**: [Contact info]

## Useful Commands

### GitHub CLI

```bash
# View recent workflow runs
gh run list --limit 10

# View specific workflow run
gh run view <run-id>

# View workflow logs
gh run view <run-id> --log

# Re-run failed workflow
gh run rerun <run-id>

# List workflows
gh workflow list

# View workflow details
gh workflow view <workflow-name>
```

### Vercel CLI

```bash
# List deployments
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Promote deployment to production
vercel promote <deployment-url>

# Inspect deployment
vercel inspect <deployment-url>
```

### Database

```bash
# Connect to database
psql $PROD_DIRECT_URL

# View migration history
SELECT * FROM drizzle_migrations ORDER BY created_at DESC;

# Check database connectivity
psql $PROD_DIRECT_URL -c "SELECT 1"
```

### Health Check

```bash
# Check health endpoint
curl https://ui-syncup.com/api/health

# Check with verbose output
curl -v https://ui-syncup.com/api/health

# Check response time
time curl https://ui-syncup.com/api/health
```

## Troubleshooting

### Workflow Not Triggering

1. Check workflow file syntax: `gh workflow view <workflow-name>`
2. Verify branch name matches trigger
3. Check Actions permissions: Settings → Actions → General

### Notifications Not Received

1. Check notification settings: https://github.com/settings/notifications
2. Verify email is verified
3. Check spam folder
4. Verify webhook URLs are correct

### Deployment Stuck

1. Check Vercel status: https://www.vercel-status.com/
2. Check GitHub Actions status: https://www.githubstatus.com/
3. Cancel and re-run deployment

### Database Connection Issues

1. Check Supabase status: https://status.supabase.com/
2. Verify DIRECT_URL secret is correct
3. Check database is not at connection limit
4. Verify IP allowlist (if configured)

## Related Documentation

- [Full Monitoring Guide](./CI_CD_MONITORING.md)
- [Alerts Setup Guide](./CI_CD_ALERTS_SETUP.md)
- [CI/CD Setup Guide](./CI_CD_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
