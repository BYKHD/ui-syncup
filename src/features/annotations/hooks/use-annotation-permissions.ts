/**
 * useAnnotationPermissions Hook
 *
 * Derives annotation permissions from the user's team/project role.
 * Returns AnnotationPermissions object for controlling UI state.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.5
 *
 * @module features/annotations/hooks/use-annotation-permissions
 */

'use client';

import { useMemo } from 'react';
import { useSession } from '@/features/auth/hooks/use-session';
import type { AnnotationPermissions } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAnnotationPermissionsOptions {
  /** Project ID for checking project-level roles */
  projectId?: string;
  /** Team ID for checking team-level roles */
  teamId?: string;
}

export interface UseAnnotationPermissionsResult {
  permissions: AnnotationPermissions;
  isLoading: boolean;
  userId: string | null;
}

// ============================================================================
// DEFAULT PERMISSIONS
// ============================================================================

const NO_PERMISSIONS: AnnotationPermissions = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canEditAll: false,
  canDelete: false,
  canDeleteAll: false,
  canComment: false,
};

const READ_ONLY_PERMISSIONS: AnnotationPermissions = {
  canView: true,
  canCreate: false,
  canEdit: false,
  canEditAll: false,
  canDelete: false,
  canDeleteAll: false,
  canComment: false,
};

const MEMBER_PERMISSIONS: AnnotationPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true, // Own only
  canEditAll: false,
  canDelete: true, // Own only
  canDeleteAll: false,
  canComment: true,
};

const EDITOR_PERMISSIONS: AnnotationPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canEditAll: true,
  canDelete: true,
  canDeleteAll: true,
  canComment: true,
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for deriving annotation permissions from user role.
 *
 * Uses the current session to determine the user's team and project roles,
 * then maps those roles to AnnotationPermissions flags.
 *
 * Permission Mapping:
 * - No session: No permissions
 * - TEAM_VIEWER: Read-only (view only)
 * - TEAM_MEMBER/PROJECT_VIEWER: Member (create, edit/delete own, comment)
 * - TEAM_EDITOR+/PROJECT_EDITOR+: Editor (full CRUD on all)
 *
 * @example
 * ```tsx
 * const { permissions, isLoading, userId } = useAnnotationPermissions({
 *   projectId: 'project_1',
 *   teamId: 'team_1',
 * });
 *
 * // Use permissions to control UI
 * {permissions.canCreate && <CreateAnnotationButton />}
 * {permissions.canEditAll && <EditAnyAnnotationButton />}
 * ```
 */
export function useAnnotationPermissions(
  options: UseAnnotationPermissionsOptions = {}
): UseAnnotationPermissionsResult {
  const { projectId: _projectId, teamId: _teamId } = options;

  // Get current session with roles
  const { session, isLoading: isSessionLoading } = useSession();

  // Derive permissions from session roles
  const permissions = useMemo((): AnnotationPermissions => {
    if (!session?.user) {
      return NO_PERMISSIONS;
    }

    // Get roles from session user
    const roles = session.user.roles ?? [];

    // Find team and project roles
    const teamRoleEntry = roles.find((r) => r.resourceType === 'team');
    const projectRoleEntry = roles.find((r) => r.resourceType === 'project');

    const teamRole = teamRoleEntry?.role;
    const projectRole = projectRoleEntry?.role;

    // Check for editor-level access
    const isTeamEditor = isEditorOrHigher(teamRole);
    const isProjectEditor = isProjectEditorOrHigher(projectRole);

    if (isTeamEditor || isProjectEditor) {
      return EDITOR_PERMISSIONS;
    }

    // Check for viewer-only access
    if (teamRole === 'TEAM_VIEWER' && !projectRole) {
      return READ_ONLY_PERMISSIONS;
    }

    // Default to member permissions
    return MEMBER_PERMISSIONS;
  }, [session]);

  return {
    permissions,
    isLoading: isSessionLoading,
    userId: session?.user?.id ?? null,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a team role is editor or higher
 */
function isEditorOrHigher(role?: string): boolean {
  if (!role) return false;
  return ['TEAM_OWNER', 'TEAM_ADMIN', 'TEAM_EDITOR'].includes(role);
}

/**
 * Check if a project role is editor or higher
 */
function isProjectEditorOrHigher(role?: string): boolean {
  if (!role) return false;
  return ['PROJECT_OWNER', 'PROJECT_EDITOR'].includes(role);
}

// ============================================================================
// UTILITY HOOK - Check specific permission
// ============================================================================

/**
 * Hook for checking if user can perform a specific action on an annotation.
 *
 * @example
 * ```tsx
 * const canEdit = useCanPerformAnnotationAction('edit', isOwner);
 * ```
 */
export function useCanPerformAnnotationAction(
  action: 'view' | 'create' | 'edit' | 'delete' | 'comment',
  isOwner: boolean = false,
  options: UseAnnotationPermissionsOptions = {}
): boolean {
  const { permissions } = useAnnotationPermissions(options);

  return useMemo(() => {
    switch (action) {
      case 'view':
        return permissions.canView;
      case 'create':
        return permissions.canCreate;
      case 'edit':
        return permissions.canEditAll || (permissions.canEdit && isOwner);
      case 'delete':
        return permissions.canDeleteAll || (permissions.canDelete && isOwner);
      case 'comment':
        return permissions.canComment;
      default:
        return false;
    }
  }, [permissions, action, isOwner]);
}
