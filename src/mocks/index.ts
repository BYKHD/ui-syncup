// ============================================================================
// MOCK DATA BARREL EXPORTS
// ============================================================================

export * from './notification.fixtures';
export * from './project.fixtures';
export * from './project-member.fixtures';
export * from './project-activity.fixtures';
export * from './project-invitation.fixtures';
export * from './issue.fixtures';
export * from './attachment.fixtures';
export * from './annotation.fixtures';
export * from './activity.fixtures';
export * from './team.fixtures';
export * from './team-member.fixtures';
export * from './user.fixtures';
export * from './share.fixtures';

// Re-export with explicit naming to avoid conflicts
export {
  type NotificationPreference as SettingsNotificationPreference,
  NOTIFICATION_TYPES,
  MOCK_NOTIFICATION_PREFERENCES as MOCK_SETTINGS_NOTIFICATION_PREFERENCES,
  MOCK_NOTIFICATION_PREFERENCES_RESPONSE,
} from './settings.fixtures'

export {
  MOCK_USER_PROFILE,
  MOCK_NOTIFICATION_PREFERENCES as MOCK_USER_NOTIFICATION_PREFERENCES,
  MOCK_USER_PREFERENCES,
  MOCK_INTEGRATIONS,
} from './user-settings.fixtures'
