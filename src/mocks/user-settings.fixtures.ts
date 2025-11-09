import type {
  UserProfile,
  NotificationPreference,
  UserPreferences,
  Integration,
} from '@features/user-settings/types'

export const MOCK_USER_PROFILE: UserProfile = {
  id: 'user_1',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  avatar: null,
  bio: 'Product designer passionate about creating delightful user experiences',
  timezone: 'America/Los_Angeles',
  language: 'en',
}

export const MOCK_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    id: 'notif_1',
    type: 'issues',
    label: 'Issues',
    description: 'Notify me when issues are assigned to me or mention me',
    inApp: true,
    email: true,
  },
  {
    id: 'notif_2',
    type: 'mentions',
    label: 'Mentions',
    description: 'Notify me when someone mentions me in a comment',
    inApp: true,
    email: false,
  },
  {
    id: 'notif_3',
    type: 'updates',
    label: 'Project Updates',
    description: 'Notify me about updates to projects I follow',
    inApp: true,
    email: false,
  },
  {
    id: 'notif_4',
    type: 'security',
    label: 'Security Alerts',
    description: 'Important security and privacy notifications',
    inApp: true,
    email: true,
  },
]

export const MOCK_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  emailDigest: 'weekly',
  soundEnabled: true,
  compactMode: false,
}

export const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'int_1',
    name: 'Jira',
    description: 'Connect your Jira account to automatic create tickets',
    icon: 'jira',
    connected: false,
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: 'int_2',
    name: 'Figma',
    description: 'Attach Figma designs to your issues and projects',
    icon: 'figma',
    connected: true,
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
]
