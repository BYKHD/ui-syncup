# Team System Monitoring and Alerts

This document describes the monitoring and alerting strategy for the team management system.

## Overview

The team system logs all significant events using structured logging. These logs can be ingested by monitoring systems to track system health, detect anomalies, and alert on critical issues.

## Log Event Types

All team events are logged with the following structure:

```typescript
interface TeamLogEvent {
  eventId: string;           // Unique event ID (UUID)
  eventType: TeamEventType;  // Event type (see below)
  timestamp: string;         // ISO 8601 timestamp
  userId?: string;           // User performing the action
  actorRole?: string;        // Actor's role in the team
  teamId?: string;           // Team ID
  teamName?: string;         // Team name
  ipAddress?: string;        // Client IP address
  userAgent?: string;        // Client user agent
  requestId?: string;        // Request correlation ID
  outcome: 'success' | 'failure' | 'error';
  errorCode?: string;        // Error code if failed
  errorMessage?: string;     // Error message if failed
  metadata?: Record<string, unknown>;
}
```

### Event Types

**Team Lifecycle:**
- `team.create.success` / `team.create.failure`
- `team.update.success` / `team.update.failure`
- `team.delete.success` / `team.delete.failure`

**Member Management:**
- `team.member.add.success` / `team.member.add.failure`
- `team.member.remove.success` / `team.member.remove.failure`
- `team.member.role_change.success` / `team.member.role_change.failure`
- `team.member.leave.success` / `team.member.leave.failure`

**Invitations:**
- `team.invitation.create.success` / `team.invitation.create.failure`
- `team.invitation.accept.success` / `team.invitation.accept.failure`
- `team.invitation.resend.success` / `team.invitation.resend.failure`
- `team.invitation.cancel.success` / `team.invitation.cancel.failure`
- `team.invitation.expire`

**Ownership:**
- `team.ownership.transfer.success` / `team.ownership.transfer.failure`

**Context Management:**
- `team.switch.success` / `team.switch.failure`
- `team.context.invalid`
- `team.context.cleared`
- `team.context.auto_switch`
- `team.access.denied`

**Data Export:**
- `team.export.requested`
- `team.export.completed`
- `team.export.failure`

**Limits:**
- `team.limit.reached`
- `team.rate_limit.exceeded`

## Alert Configurations

### 1. High Team Creation Rate

**Purpose:** Detect potential abuse or bot activity creating many teams.

**Metric:** Count of `team.create.success` events

**Threshold:** More than 50 team creations in 5 minutes

**Severity:** Warning

**Alert Configuration (Example - Datadog):**
```yaml
name: "High Team Creation Rate"
type: metric alert
query: "sum(last_5m):count:team.create.success{*} > 50"
message: |
  High team creation rate detected: {{value}} teams created in the last 5 minutes.
  This may indicate bot activity or abuse.
  
  Investigate:
  - Check user IDs creating teams
  - Review IP addresses
  - Check for patterns in team names
  
  @slack-ops-team
priority: P2
tags:
  - team:platform
  - service:teams
  - alert:abuse
```

**Alert Configuration (Example - CloudWatch):**
```json
{
  "AlarmName": "HighTeamCreationRate",
  "MetricName": "team.create.success",
  "Namespace": "UISync/Teams",
  "Statistic": "Sum",
  "Period": 300,
  "EvaluationPeriods": 1,
  "Threshold": 50,
  "ComparisonOperator": "GreaterThanThreshold",
  "AlarmDescription": "Alert when more than 50 teams are created in 5 minutes",
  "AlarmActions": ["arn:aws:sns:us-east-1:123456789:ops-alerts"]
}
```

### 2. Invitation Spam Detection

**Purpose:** Detect users sending excessive invitations, which may indicate spam or abuse.

**Metric:** Count of `team.rate_limit.exceeded` events with `errorCode: RATE_LIMIT_EXCEEDED`

**Threshold:** More than 20 rate limit hits in 5 minutes

**Severity:** Warning

**Alert Configuration (Example - Datadog):**
```yaml
name: "Invitation Spam Detected"
type: metric alert
query: "sum(last_5m):count:team.rate_limit.exceeded{error_code:RATE_LIMIT_EXCEEDED} > 20"
message: |
  Invitation spam detected: {{value}} rate limit hits in the last 5 minutes.
  
  Multiple users are hitting invitation rate limits, which may indicate:
  - Spam campaigns
  - Misconfigured integrations
  - Bot activity
  
  Investigate:
  - Check user IDs hitting limits
  - Review invitation patterns
  - Consider temporary blocks if abuse confirmed
  
  @slack-security-team
priority: P2
tags:
  - team:platform
  - service:teams
  - alert:spam
```

### 3. Resource Quota Hits

**Purpose:** Track when users frequently hit resource quotas, indicating potential need for higher limits.

**Metric:** Count of `team.limit.reached` events

**Threshold:** More than 100 limit hits in 15 minutes

**Severity:** Info

**Alert Configuration (Example - Datadog):**
```yaml
name: "High Resource Quota Hits"
type: metric alert
query: "sum(last_15m):count:team.limit.reached{*} > 100"
message: |
  High number of resource quota hits: {{value}} in the last 15 minutes.
  
  This indicates users are actively trying to use features beyond their quotas.
  
  Actions:
  - Review which limits are being hit most
  - Check if default quotas are too restrictive
  
  @slack-growth-team
priority: P3
tags:
  - team:growth
  - service:teams
  - alert:limits
```

### 4. Invalid Context Errors

**Purpose:** Detect issues with team context management that may indicate bugs or data corruption.

**Metric:** Count of `team.context.invalid` events

**Threshold:** More than 10 invalid context errors in 5 minutes

**Severity:** Critical

**Alert Configuration (Example - Datadog):**
```yaml
name: "Team Context Issues"
type: metric alert
query: "sum(last_5m):count:team.context.invalid{*} > 10"
message: |
  Critical: High number of invalid team context errors: {{value}} in the last 5 minutes.
  
  This may indicate:
  - Database synchronization issues
  - Cookie/session corruption
  - Race conditions in team switching
  - Data integrity problems
  
  Immediate actions:
  - Check database connectivity
  - Review recent deployments
  - Check for database migration issues
  - Monitor user reports
  
  @pagerduty-oncall @slack-eng-team
priority: P1
tags:
  - team:platform
  - service:teams
  - alert:critical
```

## Metrics to Track

### Counters

- `team.create.total` - Total teams created
- `team.member.add.total` - Total members added
- `team.invitation.sent.total` - Total invitations sent
- `team.switch.total` - Total team switches
- `team.limit.reached.total` - Total limit hits

### Gauges

- `team.active.count` - Active teams count
- `team.members.avg` - Average members per team

### Histograms

- `team.create.duration` - Team creation duration
- `team.invitation.accept.duration` - Invitation acceptance duration
- `team.member.add.duration` - Member addition duration

## Dashboard Recommendations

### Team Health Dashboard

**Widgets:**
1. Team creation rate (line chart, last 24h)
2. Active teams count (gauge)
3. Member additions rate (line chart, last 24h)
4. Invitation acceptance rate (percentage, last 7d)
5. Quota limit hits by type (bar chart, last 24h)
6. Error rate by event type (stacked area chart, last 24h)

### Operations Dashboard

**Widgets:**
1. Alert status (list of active alerts)
2. Rate limit hits (line chart, last 24h)
3. Invalid context errors (line chart, last 24h)
4. Team switching errors (line chart, last 24h)
5. Database query performance (histogram, last 1h)
6. API response times (histogram, last 1h)

### Growth Dashboard

**Widgets:**
1. New teams per day (bar chart, last 30d)
2. Team size distribution (histogram)
3. Quota limit hits by limit type (pie chart, last 7d)
4. Invitation conversion rate (percentage, last 30d)

6. Churn rate (percentage, last 30d)

## Log Aggregation

### Recommended Setup

1. **Log Collection:** Use a log shipper (Fluentd, Logstash, Vector) to collect logs from application servers
2. **Log Storage:** Store logs in a centralized system (Elasticsearch, CloudWatch Logs, Datadog)
3. **Log Parsing:** Parse JSON-formatted logs to extract structured fields
4. **Indexing:** Index logs by timestamp, event type, user ID, and team ID for fast queries
5. **Retention:** Keep logs for at least 90 days for compliance and debugging

### Example Fluentd Configuration

```xml
<source>
  @type tail
  path /var/log/app/team-events.log
  pos_file /var/log/td-agent/team-events.log.pos
  tag team.events
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%LZ
  </parse>
</source>

<filter team.events>
  @type record_transformer
  <record>
    service teams
    environment ${ENV}
  </record>
</filter>

<match team.events>
  @type elasticsearch
  host elasticsearch.internal
  port 9200
  index_name team-events-%Y.%m.%d
  type_name _doc
  <buffer>
    @type file
    path /var/log/td-agent/buffer/team-events
    flush_interval 10s
  </buffer>
</match>
```

## Incident Response

### High Team Creation Rate

1. Check if it's legitimate growth or abuse
2. Review user IDs and IP addresses
3. If abuse detected, temporarily rate limit or block offending IPs
4. Investigate root cause (bot, misconfigured integration, etc.)
5. Update rate limits if needed

### Invitation Spam

1. Identify users hitting rate limits
2. Check invitation patterns (same email, same team, etc.)
3. If spam confirmed, suspend user accounts
4. Review and update rate limiting rules
5. Consider adding CAPTCHA for invitation creation

### Resource Quota Hits

1. Identify which limits are being hit most
2. Review if default quotas need adjustment
3. Monitor for user frustration (support tickets)
4. Consider adjusting limits if too restrictive

### Invalid Context Errors

1. Check database connectivity and health
2. Review recent deployments for bugs
3. Check for database migration issues
4. Monitor user reports and support tickets
5. Roll back if necessary
6. Fix root cause and deploy hotfix

## Implementation Notes

- All logs are written to stdout/stderr in JSON format
- Logs are automatically collected by the container runtime
- Use the `logger` utility from `@/lib/logger` for consistent formatting
- Include request IDs for correlation across services
- Hash PII (emails) in logs for privacy compliance
- Set log levels appropriately (info for success, warn for failures, error for errors)

## Next Steps

1. Set up log aggregation infrastructure
2. Configure alerts in monitoring system
3. Create dashboards for team health and operations
4. Set up on-call rotation for critical alerts
5. Document incident response procedures
6. Train team on alert handling
