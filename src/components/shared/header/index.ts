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
export { ThemeToggle } from './theme-toggle'

// Notification components
export { NotificationPanel } from '../notifications/notification-panel'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import header components:
// import { AppHeader, ThemeToggle, NotificationPanel } from '@components/shared/header'
//
// Import types:
// import type { AppHeaderProps, BreadcrumbItem } from '@components/shared/header'
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
