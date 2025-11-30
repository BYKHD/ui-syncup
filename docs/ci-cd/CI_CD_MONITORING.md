# CI/CD Monitoring and Status Reporting

This document describes how to monitor and verify the GitHub Actions CI/CD pipeline for UI SyncUp.

## Workflow Status Reporting

### Commit Status Checks

GitHub Actions automatically reports workflow status on commits and pull requests:

1. **Viewing Commit Statuses**:
   - Navigate to any commit in the repository
   - Scroll to the bottom to see "Checks" section
   - Each workflow job appears as a separate check
   - Status indicators: ✅ Success, ❌ Failure, 🟡 In Progress, ⚪ Pending

2. **Pull Request Status Checks**:
   - Open any pull request
   - Status checks appear in the "Checks" tab and at the bottom of the PR
   - Required checks must pass before merging (if branch protection is enabled)
   - Click on any check to view detailed logs

3. **Workflow Names and Jobs**:
   - **CI Quality Checks** workflow:
     - Job: `Quality Checks`
     - Steps: TypeScript, ESLint, Tests, Build
   - **Deploy** workflow:
     - Job: `Migrate Preview Database` (for non-main branches)
     - Job: `Migrate Production Database` (for main branch)

### Vercel Deployment Comments

Vercel automatically posts deployment status comments on pull requests:

1. **Preview Deployments**:
   - Vercel comments on PRs with preview deployment URLs
   - Comment includes: deployment status, preview URL, build logs link
   - Updates automatically as deployment progresses

2. **Production Deployments**:
   - Vercel posts production deployment status on main branch commits
   - Includes production URL and deployment details

3. **Verifying Vercel Integration**:
   ```bash
   # Check Vercel project settings
   # 1. Go to Vercel Dashboard → Project Settings
   # 2. Navigate to Git → GitHub Integration
   # 3. Verify:
   #    - Repository is connected
   #    - Production branch is set to "main"
   #    - Preview deployments are enabled for all branches
   #    - Comments on pull requests are enabled
   ```

### Workflow Logs

All workflow runs are logged and accessible:

1. **Accessing Logs**:
   - Navigate to repository → Actions tab
   - Select a workflow run from the list
   - Click on a job to view step-by-step logs
   - Expand any step to see detailed output

2. **Log Retention**:
   - GitHub retains workflow logs for 90 days
   - Download logs for offline analysis: Click "..." → "Download log archive"

3. **Migration Logs**:
   - Migration output is captured in workflow logs
   - Look for "Run database migrations" step
   - Logs include: migration files applied, SQL statements, errors (if any)

4. **Job Summaries**:
   - Workflow summaries appear at the top of each job
   - Migration jobs include: branch, commit, status, environment
   - Access via the "Summary" section of each workflow run

## Verification Checklist

Use this checklist to verify workflow status reporting is working correctly:

### ✅ Commit Status Checks

- [ ] Push code to a feature branch
- [ ] Navigate to the commit in GitHub
- [ ] Verify "CI Quality Checks" appears in commit checks
- [ ] Verify status updates from pending → in progress → success/failure
- [ ] Click on the check to view detailed logs

### ✅ Pull Request Status Checks

- [ ] Create a pull request
- [ ] Verify status checks appear at the bottom of the PR
- [ ] Verify "Checks" tab shows all workflow jobs
- [ ] Verify required checks are marked (if branch protection enabled)
- [ ] Verify merge button is disabled until checks pass

### ✅ Vercel Deployment Comments

- [ ] Create or update a pull request
- [ ] Wait for Vercel to start deployment
- [ ] Verify Vercel bot posts a comment with deployment status
- [ ] Verify comment includes preview URL
- [ ] Click preview URL to verify deployment works
- [ ] Verify comment updates when deployment completes

### ✅ Workflow Logs Accessibility

- [ ] Navigate to Actions tab
- [ ] Select a recent workflow run
- [ ] Verify all jobs are listed
- [ ] Click on a job to view logs
- [ ] Verify all steps are expandable
- [ ] Verify logs contain detailed output
- [ ] Download log archive and verify it contains all logs

### ✅ Migration Logging

- [ ] Trigger a deployment with database changes
- [ ] Navigate to the migration job in Actions
- [ ] Verify "Run database migrations" step shows:
  - Branch and commit information
  - Migration files being applied
  - SQL statements executed
  - Success/failure status
- [ ] Verify job summary includes migration details

## Monitoring Procedures

### Daily Monitoring

1. **Check Workflow Health**:
   - Navigate to Actions tab
   - Review recent workflow runs
   - Investigate any failures
   - Verify average run times are within expected ranges

2. **Review Failed Workflows**:
   - Filter by "Failure" status
   - Review error logs
   - Determine root cause (code issue, infrastructure, secrets)
   - Take corrective action

### Weekly Monitoring

1. **Audit Workflow Performance**:
   - Review workflow run durations
   - Identify slow steps
   - Optimize caching and dependencies if needed

2. **Review Deployment History**:
   - Check Vercel dashboard for deployment frequency
   - Review deployment success rate
   - Investigate any deployment failures

3. **Verify Environment Secrets**:
   - Ensure all required secrets are configured
   - Rotate secrets if needed (quarterly recommended)

### Monthly Monitoring

1. **Review Workflow Configurations**:
   - Check for workflow file updates
   - Review branch protection rules
   - Update documentation if needed

2. **Audit Access Controls**:
   - Review who has access to modify workflows
   - Review who can approve production deployments
   - Update permissions if needed

## Troubleshooting Status Reporting Issues

### Commit Statuses Not Appearing

**Symptoms**: Workflow runs but status doesn't appear on commits/PRs

**Possible Causes**:
- Workflow file syntax error
- Workflow not triggered for the branch
- GitHub Actions disabled for repository

**Resolution**:
1. Check workflow file syntax: `gh workflow view ci.yml`
2. Verify workflow triggers match branch name
3. Check repository settings → Actions → General → Actions permissions

### Vercel Comments Not Appearing

**Symptoms**: Vercel deploys but doesn't comment on PRs

**Possible Causes**:
- Vercel GitHub integration not configured
- PR comments disabled in Vercel settings
- Vercel bot doesn't have repository access

**Resolution**:
1. Go to Vercel Dashboard → Project Settings → Git
2. Verify GitHub integration is connected
3. Enable "Comments on Pull Requests"
4. Verify Vercel bot has repository access

### Workflow Logs Not Accessible

**Symptoms**: Can't view or download workflow logs

**Possible Causes**:
- Insufficient repository permissions
- Logs expired (>90 days old)
- GitHub Actions quota exceeded

**Resolution**:
1. Verify you have "Read" access to Actions
2. Check log retention period
3. Review GitHub Actions usage quota

## Notification Configuration

### GitHub Actions Notifications

GitHub sends notifications for workflow events:

1. **Email Notifications**:
   - Go to GitHub Settings → Notifications
   - Under "Actions", configure:
     - ✅ Send notifications for failed workflows on branches you're watching
     - ✅ Send notifications for workflow runs you triggered
     - ⚠️ Optionally: Send notifications for all workflow runs

2. **Slack/Discord Integration** (Optional):
   - Use GitHub Actions marketplace actions:
     - `slackapi/slack-github-action` for Slack
     - `sarisia/actions-status-discord` for Discord
   - Add notification step to workflows:
     ```yaml
     - name: Notify Slack on failure
       if: failure()
       uses: slackapi/slack-github-action@v1
       with:
         payload: |
           {
             "text": "Workflow failed: ${{ github.workflow }}",
             "blocks": [
               {
                 "type": "section",
                 "text": {
                   "type": "mrkdwn",
                   "text": "*Workflow:* ${{ github.workflow }}\n*Status:* Failed\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}"
                 }
               }
             ]
           }
       env:
         SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
     ```

### Vercel Deployment Notifications

Vercel provides multiple notification channels:

1. **Email Notifications**:
   - Go to Vercel Dashboard → Settings → Notifications
   - Configure email notifications for:
     - Deployment started
     - Deployment ready
     - Deployment failed

2. **Slack Integration**:
   - Go to Vercel Dashboard → Settings → Integrations
   - Add Slack integration
   - Configure notification preferences

3. **Webhook Notifications**:
   - Go to Vercel Dashboard → Settings → Webhooks
   - Add webhook URL for custom integrations
   - Configure events: deployment.created, deployment.ready, deployment.error

## Monitoring Dashboard

### GitHub Actions Dashboard

Access workflow metrics:
1. Navigate to repository → Insights → Actions
2. View metrics:
   - Workflow runs over time
   - Success/failure rates
   - Average run duration
   - Most active workflows

### Vercel Analytics Dashboard

Access deployment metrics:
1. Navigate to Vercel Dashboard → Analytics
2. View metrics:
   - Deployment frequency
   - Build duration
   - Deployment success rate
   - Error rates

## Health Check Endpoints

Verify deployment health after successful deployments:

```bash
# Preview environment
curl https://preview-url.vercel.app/api/health

# Production environment
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

## Audit Trail

All workflow runs create an audit trail:

1. **Workflow Run History**:
   - Navigate to Actions tab
   - Filter by workflow, branch, status
   - View complete history of all runs

2. **Deployment History**:
   - Vercel Dashboard → Deployments
   - View all deployments with timestamps, commits, status

3. **Migration History**:
   - Query database: `SELECT * FROM drizzle_migrations ORDER BY created_at DESC;`
   - View which migrations were applied and when

## Support and Escalation

If monitoring reveals issues:

1. **GitHub Actions Issues**:
   - Check GitHub Status: https://www.githubstatus.com/
   - Contact repository maintainers
   - Review GitHub Actions documentation

2. **Vercel Issues**:
   - Check Vercel Status: https://www.vercel-status.com/
   - Contact Vercel support via dashboard
   - Review Vercel documentation

3. **Database Issues**:
   - Check Supabase Status: https://status.supabase.com/
   - Review Supabase dashboard logs
   - Contact Supabase support

## Related Documentation

- [CI/CD Setup Guide](./CI_CD_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)
