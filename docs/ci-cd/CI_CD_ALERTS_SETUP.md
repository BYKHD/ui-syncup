# CI/CD Monitoring and Alerts Setup Guide

This guide provides step-by-step instructions for configuring monitoring and alerts for the GitHub Actions CI/CD pipeline and Vercel deployments.

## Overview

The monitoring and alerting system consists of:
- GitHub Actions notifications for workflow failures
- Vercel deployment notifications
- Optional Slack/Discord integrations
- Email alerts for critical events

## GitHub Actions Notifications

### Email Notifications (Built-in)

GitHub provides built-in email notifications for workflow events.

#### Setup Steps

1. **Navigate to GitHub Notification Settings**:
   - Go to https://github.com/settings/notifications
   - Or: Click your profile → Settings → Notifications

2. **Configure Actions Notifications**:
   - Scroll to "Actions" section
   - Enable the following:
     - ✅ **Send notifications for failed workflows on branches you're watching**
       - Sends email when workflows fail on branches you watch
     - ✅ **Send notifications for workflow runs you triggered**
       - Sends email for workflows you personally triggered
     - ⚠️ **Optional**: Send notifications for all workflow runs
       - Only enable if you want notifications for all team workflows

3. **Configure Email Preferences**:
   - Under "Email notification preferences"
   - Ensure your email is verified
   - Choose notification frequency:
     - Recommended: "Send each notification individually"
     - Alternative: "Daily digest" for less frequent updates

4. **Watch Repository**:
   - Navigate to the repository
   - Click "Watch" → "Custom"
   - Enable: ✅ Actions

#### Testing Email Notifications

```bash
# Trigger a workflow failure to test notifications
# 1. Create a test branch
git checkout -b test-notifications

# 2. Introduce a TypeScript error
echo "const x: string = 123;" >> src/test-error.ts

# 3. Commit and push
git add .
git commit -m "test: trigger workflow failure"
git push origin test-notifications

# 4. Check your email for failure notification
# 5. Clean up
git checkout develop
git branch -D test-notifications
git push origin --delete test-notifications
rm src/test-error.ts
```

### Slack Integration (Optional)

Add Slack notifications for workflow events.

#### Prerequisites

- Slack workspace with admin access
- Slack webhook URL

#### Setup Steps

1. **Create Slack Webhook**:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name: "GitHub Actions Notifier"
   - Select your workspace
   - Navigate to "Incoming Webhooks"
   - Activate incoming webhooks
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., #deployments)
   - Copy the webhook URL

2. **Add Webhook to GitHub Secrets**:
   ```bash
   # Using GitHub CLI
   gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   
   # Or via GitHub UI:
   # Settings → Secrets and variables → Actions → New repository secret
   # Name: SLACK_WEBHOOK_URL
   # Value: Your webhook URL
   ```

3. **Update Workflow Files**:

   Add to `.github/workflows/ci.yml`:
   ```yaml
   jobs:
     quality-checks:
       # ... existing steps ...
       
       - name: Notify Slack on failure
         if: failure()
         uses: slackapi/slack-github-action@v1
         with:
           payload: |
             {
               "text": "❌ CI Quality Checks Failed",
               "blocks": [
                 {
                   "type": "section",
                   "text": {
                     "type": "mrkdwn",
                     "text": "*CI Quality Checks Failed*\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*Workflow:* <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>"
                   }
                 }
               ]
             }
         env:
           SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
   ```

   Add to `.github/workflows/deploy.yml`:
   ```yaml
   jobs:
     migrate-production:
       # ... existing steps ...
       
       - name: Notify Slack on production migration failure
         if: failure()
         uses: slackapi/slack-github-action@v1
         with:
           payload: |
             {
               "text": "🚨 Production Migration Failed",
               "blocks": [
                 {
                   "type": "section",
                   "text": {
                     "type": "mrkdwn",
                     "text": "*Production Migration Failed*\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*Workflow:* <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>\n\n⚠️ *Action Required:* Review migration logs and rollback if necessary."
                   }
                 }
               ]
             }
         env:
           SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
       
       - name: Notify Slack on production migration success
         if: success()
         uses: slackapi/slack-github-action@v1
         with:
           payload: |
             {
               "text": "✅ Production Migration Successful",
               "blocks": [
                 {
                   "type": "section",
                   "text": {
                     "type": "mrkdwn",
                     "text": "*Production Migration Successful*\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*Workflow:* <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>"
                   }
                 }
               ]
             }
         env:
           SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
   ```

4. **Test Slack Integration**:
   ```bash
   # Trigger a workflow to test Slack notifications
   git checkout -b test-slack-notifications
   git commit --allow-empty -m "test: slack notifications"
   git push origin test-slack-notifications
   
   # Check Slack channel for notification
   ```

### Discord Integration (Optional)

Add Discord notifications for workflow events.

#### Prerequisites

- Discord server with admin access
- Discord webhook URL

#### Setup Steps

1. **Create Discord Webhook**:
   - Open Discord server
   - Navigate to channel settings (e.g., #deployments)
   - Go to Integrations → Webhooks
   - Click "New Webhook"
   - Name: "GitHub Actions"
   - Copy webhook URL

2. **Add Webhook to GitHub Secrets**:
   ```bash
   # Using GitHub CLI
   gh secret set DISCORD_WEBHOOK_URL --body "https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
   ```

3. **Update Workflow Files**:

   Add to `.github/workflows/ci.yml`:
   ```yaml
   - name: Notify Discord on failure
     if: failure()
     uses: sarisia/actions-status-discord@v1
     with:
       webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
       status: ${{ job.status }}
       title: "CI Quality Checks Failed"
       description: |
         **Branch:** ${{ github.ref_name }}
         **Commit:** ${{ github.sha }}
         **Author:** ${{ github.actor }}
       url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
   ```

## Vercel Deployment Notifications

### Email Notifications

1. **Navigate to Vercel Notifications**:
   - Go to Vercel Dashboard
   - Click on your project
   - Navigate to Settings → Notifications

2. **Configure Email Notifications**:
   - Enable notifications for:
     - ✅ Deployment Started
     - ✅ Deployment Ready
     - ✅ Deployment Failed
     - ✅ Deployment Canceled

3. **Add Team Members**:
   - Ensure all team members are added to the project
   - They will receive notifications based on their preferences

### Slack Integration

1. **Install Vercel Slack App**:
   - Go to Vercel Dashboard → Settings → Integrations
   - Search for "Slack"
   - Click "Add Integration"
   - Authorize Vercel to access your Slack workspace
   - Select channel (e.g., #deployments)

2. **Configure Notification Preferences**:
   - Choose which events to notify:
     - ✅ Deployment Started
     - ✅ Deployment Ready
     - ✅ Deployment Failed
     - ⚠️ Optional: Deployment Canceled

3. **Test Integration**:
   - Push code to trigger a deployment
   - Check Slack channel for deployment notifications

### Discord Integration

1. **Create Discord Webhook** (if not already created):
   - Follow steps from Discord Integration section above

2. **Add Webhook to Vercel**:
   - Go to Vercel Dashboard → Settings → Webhooks
   - Click "Create Webhook"
   - Name: "Discord Notifications"
   - URL: Your Discord webhook URL
   - Events:
     - ✅ deployment.created
     - ✅ deployment.ready
     - ✅ deployment.error

3. **Test Integration**:
   - Push code to trigger a deployment
   - Check Discord channel for deployment notifications

## Monitoring Dashboard Setup

### GitHub Actions Dashboard

1. **Access Workflow Insights**:
   - Navigate to repository → Insights → Actions
   - View metrics:
     - Workflow runs over time
     - Success/failure rates
     - Average run duration

2. **Set Up Custom Dashboard** (Optional):
   - Use GitHub API to fetch workflow data
   - Create custom dashboard with tools like Grafana or Datadog
   - Example API endpoint:
     ```bash
     gh api repos/OWNER/REPO/actions/runs \
       --jq '.workflow_runs[] | {name: .name, status: .status, conclusion: .conclusion}'
     ```

### Vercel Analytics Dashboard

1. **Access Deployment Analytics**:
   - Navigate to Vercel Dashboard → Analytics
   - View metrics:
     - Deployment frequency
     - Build duration
     - Deployment success rate

2. **Set Up Alerts** (Pro Plan):
   - Navigate to Settings → Alerts
   - Configure alerts for:
     - Build failures
     - Deployment errors
     - Performance degradation

## Health Check Monitoring

### Set Up Health Check Endpoint

The application already has a health check endpoint at `/api/health`.

### Monitor Health Check

1. **Using Uptime Monitoring Service** (Recommended):
   - Use services like:
     - UptimeRobot (free tier available)
     - Pingdom
     - StatusCake
     - Better Uptime

2. **Configure Uptime Monitor**:
   - URL: `https://ui-syncup.com/api/health`
   - Interval: 5 minutes
   - Alert on: HTTP status != 200
   - Notification channels: Email, Slack, Discord

3. **Example: UptimeRobot Setup**:
   - Go to https://uptimerobot.com/
   - Create account (free)
   - Add New Monitor:
     - Monitor Type: HTTP(s)
     - Friendly Name: "UI SyncUp Health Check"
     - URL: `https://ui-syncup.com/api/health`
     - Monitoring Interval: 5 minutes
   - Add Alert Contacts:
     - Email
     - Slack webhook
     - Discord webhook

### Custom Health Check Script

Create a simple monitoring script:

```bash
#!/bin/bash
# scripts/monitor-health.sh

HEALTH_URL="https://ui-syncup.com/api/health"
SLACK_WEBHOOK="$SLACK_WEBHOOK_URL"

check_health() {
  response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
  
  if [ "$response" != "200" ]; then
    echo "❌ Health check failed: HTTP $response"
    
    # Send Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
      curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"🚨 Health check failed for UI SyncUp: HTTP $response\"}"
    fi
    
    exit 1
  else
    echo "✅ Health check passed"
  fi
}

check_health
```

## Alert Escalation Procedures

### Severity Levels

1. **Critical (P0)**:
   - Production deployment failed
   - Production migration failed
   - Health check failing for >5 minutes
   - **Action**: Immediate response required, page on-call engineer

2. **High (P1)**:
   - Preview deployment failed
   - CI checks failing on main branch
   - **Action**: Investigate within 1 hour

3. **Medium (P2)**:
   - CI checks failing on feature branches
   - Preview migration failed
   - **Action**: Investigate within 4 hours

4. **Low (P3)**:
   - Workflow performance degradation
   - Non-critical warnings
   - **Action**: Investigate during business hours

### Escalation Path

1. **Initial Alert**:
   - Notification sent via configured channels (email, Slack, Discord)
   - Alert includes: severity, affected component, logs link

2. **First Response** (within SLA):
   - Acknowledge alert
   - Assess severity
   - Begin investigation

3. **Escalation** (if not resolved within SLA):
   - P0: Escalate to team lead immediately
   - P1: Escalate after 1 hour
   - P2: Escalate after 4 hours

4. **Resolution**:
   - Fix issue
   - Verify fix in production
   - Document incident
   - Update runbooks if needed

## Monitoring Checklist

Use this checklist to ensure monitoring is properly configured:

### GitHub Actions Monitoring

- [ ] Email notifications enabled for workflow failures
- [ ] Repository is being watched for Actions
- [ ] Slack/Discord integration configured (if desired)
- [ ] Workflow insights dashboard accessible
- [ ] Test notifications by triggering a failure

### Vercel Monitoring

- [ ] Email notifications enabled for deployments
- [ ] Slack/Discord integration configured (if desired)
- [ ] Deployment analytics dashboard accessible
- [ ] Test notifications by triggering a deployment

### Health Check Monitoring

- [ ] Health check endpoint is accessible
- [ ] Uptime monitoring service configured
- [ ] Alert contacts configured
- [ ] Test alerts by simulating downtime

### Documentation

- [ ] Monitoring procedures documented
- [ ] Alert escalation procedures documented
- [ ] Runbooks created for common issues
- [ ] Team members trained on monitoring tools

## Troubleshooting

### Notifications Not Being Received

**GitHub Actions**:
1. Check notification settings: https://github.com/settings/notifications
2. Verify email is verified
3. Check spam folder
4. Verify repository watch settings

**Vercel**:
1. Check Vercel notification settings
2. Verify team member has access to project
3. Check integration configuration

**Slack/Discord**:
1. Verify webhook URL is correct
2. Check GitHub/Vercel secrets are configured
3. Test webhook manually:
   ```bash
   curl -X POST "$WEBHOOK_URL" \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test notification"}'
   ```

### Alerts Too Noisy

1. **Adjust Notification Preferences**:
   - Disable notifications for non-critical events
   - Use daily digest instead of individual emails
   - Configure alert thresholds

2. **Filter Alerts**:
   - Only alert on failures, not successes
   - Only alert on production events
   - Group related alerts

3. **Use Alert Routing**:
   - Route critical alerts to on-call channel
   - Route non-critical alerts to monitoring channel
   - Use different channels for different environments

## Related Documentation

- [CI/CD Monitoring Guide](./CI_CD_MONITORING.md)
- [CI/CD Setup Guide](./CI_CD_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)
