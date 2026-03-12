/**
 * Settings Feature Types
 * Mock types for UI-only implementation
 */

import { LucideIcon } from "lucide-react";

/**
 * Team information type
 */
export interface Team {
  id: string;
  name: string;
  image: string | null;
}

/**
 * Team form data for editing
 */
export interface TeamGeneralFormData {
  name: string;
  image: FileList | null;
}

/**
 * Navigation item for settings sections
 */
export interface SettingsNavItem {
  title: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  comingSoon?: boolean;
}

/**
 * Notification preference item
 */
export interface NotificationPreference {
  type: string;
  enabled: boolean;
  emailEnabled: boolean;
}

/**
 * User role types for permission guards
 */
export type UserRole = "owner" | "admin" | "member" | "viewer";

/**
 * Team role type (alias for UserRole)
 * Used in team management contexts
 */
export type TeamRole = UserRole;

/**
 * Team permissions for granular access control
 */
export interface TeamPermissions {
  canManageTeam: boolean;
  canManageMembers: boolean;
  canManageIntegrations: boolean;
  canManageSettings: boolean;
  canViewAnalytics: boolean;
  canDeleteTeam: boolean;
}

/**
 * Permission guard props
 */
export interface PermissionGuardProps {
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
