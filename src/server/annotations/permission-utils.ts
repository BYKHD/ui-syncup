/**
 * Annotation Permission Utilities
 *
 * Maps team/project roles to annotation permissions.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { getHighestTeamRole, getHighestProjectRole } from '@/server/auth/rbac';
import { TEAM_ROLES, PROJECT_ROLES } from '@/config/roles';
import type { AnnotationPermissions } from '@/features/annotations/types';

// ============================================================================
// PERMISSION MAPPING
// ============================================================================

/**
 * Get annotation permissions for a user based on their team/project role
 *
 * Permission mapping:
 * - TEAM_VIEWER: View only
 * - TEAM_MEMBER / PROJECT_VIEWER: View, create, edit/delete own, comment
 * - TEAM_EDITOR+ / PROJECT_EDITOR+: View, create, edit/delete all, comment
 *
 * @param userId - User to check permissions for
 * @param teamId - Team containing the attachment
 * @param projectId - Project containing the attachment
 * @returns AnnotationPermissions object
 */
export async function getAnnotationPermissions(
  userId: string,
  teamId: string,
  projectId: string
): Promise<AnnotationPermissions> {
  // Get user's highest roles
  const [teamRole, projectRole] = await Promise.all([
    getHighestTeamRole(userId, teamId),
    getHighestProjectRole(userId, projectId),
  ]);

  // No access if user has no role in team
  if (!teamRole) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canEditAll: false,
      canDelete: false,
      canDeleteAll: false,
      canComment: false,
    };
  }

  // Check if user is an editor or higher
  const isTeamEditor = isEditorOrHigher(teamRole);
  const isProjectEditor = projectRole ? isProjectEditorOrHigher(projectRole) : false;
  const hasEditAllPermission = isTeamEditor || isProjectEditor;

  // Check if user is a viewer (lowest level)
  const isViewerOnly = teamRole === TEAM_ROLES.TEAM_VIEWER && !projectRole;

  return {
    canView: true, // All authenticated team members can view
    canCreate: !isViewerOnly, // Everyone except viewers
    canEdit: !isViewerOnly, // Can edit own
    canEditAll: hasEditAllPermission, // Editors+ can edit all
    canDelete: !isViewerOnly, // Can delete own
    canDeleteAll: hasEditAllPermission, // Editors+ can delete all
    canComment: !isViewerOnly, // Everyone except viewers
  };
}

/**
 * Check if user has permission to perform an action on an annotation
 *
 * @param permissions - User's annotation permissions
 * @param action - Action to check
 * @param isOwner - Whether user is the annotation author
 * @returns True if user can perform the action
 */
export function canPerformAction(
  permissions: AnnotationPermissions,
  action: 'view' | 'create' | 'edit' | 'delete' | 'comment',
  isOwner: boolean = false
): boolean {
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
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a team role is editor or higher
 */
function isEditorOrHigher(role: string): boolean {
  return (
    role === TEAM_ROLES.TEAM_OWNER ||
    role === TEAM_ROLES.TEAM_ADMIN ||
    role === TEAM_ROLES.TEAM_EDITOR
  );
}

/**
 * Check if a project role is editor or higher
 */
function isProjectEditorOrHigher(role: string): boolean {
  return (
    role === PROJECT_ROLES.PROJECT_OWNER ||
    role === PROJECT_ROLES.PROJECT_EDITOR
  );
}
