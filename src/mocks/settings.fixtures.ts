// ============================================================================
// SETTINGS MOCK FIXTURES
// ============================================================================

export interface NotificationPreference {
  type: string
  enabled: boolean
  emailEnabled: boolean
}

export const NOTIFICATION_TYPES = [
  'issue_assigned',
  'issue_commented',
  'issue_status_changed',
  'mention',
  'team_invite',
  'project_update',
] as const

export const MOCK_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    type: 'issue_assigned',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'issue_commented',
    enabled: true,
    emailEnabled: false,
  },
  {
    type: 'issue_status_changed',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'mention',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'team_invite',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'project_update',
    enabled: false,
    emailEnabled: false,
  },
]

export const MOCK_NOTIFICATION_PREFERENCES_RESPONSE = {
  success: true,
  preferences: MOCK_NOTIFICATION_PREFERENCES,
}
