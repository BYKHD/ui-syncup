"use client";

import { useSession as useSessionHook } from "../hooks/use-session";
import type { Role } from "@/config/roles";
import type { ReactNode } from "react";
import type { UserResponse } from "../api/types";

export interface RoleGateProps {
  /**
   * Array of roles that are allowed to see the children.
   * User must have at least one of these roles.
   */
  roles: Role[];

  /**
   * Content to render if user has required role
   */
  children: ReactNode;

  /**
   * Optional fallback content to render if user doesn't have required role.
   * If not provided, nothing will be rendered.
   */
  fallback?: ReactNode;

  /**
   * Optional resource type to check role against (team or project).
   * If not provided, checks all user roles.
   */
  resourceType?: "team" | "project";

  /**
   * Optional resource ID to check role against.
   * If provided, only checks roles for this specific resource.
   * Requires resourceType to be set.
   */
  resourceId?: string;

  /**
   * Optional custom session hook for testing.
   * If not provided, uses the default useSession hook.
   */
  useSession?: () => {
    user?: UserResponse;
    isLoading: boolean;
  };
}

/**
 * RoleGate component that conditionally renders children based on user roles.
 * 
 * Features:
 * - Checks if user has any of the required roles
 * - Optionally filters by resource type (team or project)
 * - Optionally filters by specific resource ID
 * - Renders fallback or null if unauthorized
 * 
 * @example
 * // Show content only to team owners and admins
 * <RoleGate roles={["TEAM_OWNER", "TEAM_ADMIN"]}>
 *   <TeamSettingsButton />
 * </RoleGate>
 * 
 * @example
 * // Show content only to project editors for a specific project
 * <RoleGate 
 *   roles={["PROJECT_EDITOR", "PROJECT_OWNER"]} 
 *   resourceType="project"
 *   resourceId={projectId}
 * >
 *   <EditProjectButton />
 * </RoleGate>
 * 
 * @example
 * // Show fallback content if unauthorized
 * <RoleGate 
 *   roles={["TEAM_EDITOR"]} 
 *   fallback={<p>You need editor access to view this content.</p>}
 * >
 *   <IssueCreateButton />
 * </RoleGate>
 */
export function RoleGate({
  roles,
  children,
  fallback = null,
  resourceType,
  resourceId,
  useSession = useSessionHook,
}: RoleGateProps) {
  const { user, isLoading } = useSession();

  // While loading, don't render anything to avoid flashing unauthorized content
  if (isLoading) {
    return null;
  }

  // If no user or no roles, user is unauthorized
  if (!user || !user.roles || user.roles.length === 0) {
    return <>{fallback}</>;
  }

  // Filter roles by resource type and ID if specified
  let userRoles = user.roles;

  if (resourceType) {
    userRoles = userRoles.filter((r) => r.resourceType === resourceType);
  }

  if (resourceId) {
    userRoles = userRoles.filter((r) => r.resourceId === resourceId);
  }

  // Check if user has any of the required roles
  const hasRequiredRole = userRoles.some((userRole) =>
    roles.includes(userRole.role as Role)
  );

  if (hasRequiredRole) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
