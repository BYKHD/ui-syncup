// Screens
export { default as UserSettingsScreen } from './screens/user-settings-screen'

// Components
export { NotificationPreferences } from './components/notification-preferences'
export { UserPreferencesComponent } from './components/user-preferences'
export { IntegrationsList } from './components/integrations-list'
export { OtherSettings } from './components/other-settings'
export { DeleteAccountDialog } from './components/delete-account-dialog'

// Hooks
export { useNotificationPreferences } from './hooks/use-notification-preferences'
export { useUserPreferences } from './hooks/use-user-preferences'

// Types
export type {
  UserProfile,
  NotificationPreference,
  UserPreferences,
  Integration,
  SettingSection,
  AccountDeletionConfirmation,
} from './types'
