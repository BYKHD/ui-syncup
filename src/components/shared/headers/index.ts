// ============================================================================
// HEADER COMPONENTS - BARREL EXPORTS
// ============================================================================
//
// This file provides clean imports for all header-related components
// following the compound component pattern as per AGENTS.md
//

// Main header component
export { AppHeader } from './app-header'
export type { AppHeaderProps, BreadcrumbItem } from './app-header'

// Sub-components
export { HeaderUserMenu } from './header-user-menu'
export type { HeaderUserMenuProps } from './header-user-menu'

// Notification components
export { NotificationPanel } from '../notifications/notification-panel'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import header components:
// import { AppHeader, ThemeToggle, HeaderUserMenu, NotificationPanel } from '@/components/shared/header'
//
// Import types:
// import type { AppHeaderProps, BreadcrumbItem, HeaderUserMenuProps } from '@/components/shared/header'
//
// Example usage:
// <AppHeader
//   pageName="Dashboard"
//   breadcrumbs={[
//     { label: 'Home', href: '/' },
//     { label: 'Dashboard' }
//   ]}
// />
//
// <HeaderUserMenu
//   onLogout={() => console.log('Logging out...')}
//   onSettingsClick={() => router.push('/settings')}
// />
//
