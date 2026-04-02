// src/config/roles.ts

/**
 * Role-Based Access Control (RBAC) Configuration
 * 
 * This file defines the canonical roles and permissions for UI SyncUp.
 * Keep this file in sync with product.md and RBAC.md documentation.
 * 
 * NOTE: WORKSPACE_* roles are the canonical names. TEAM_* roles are
 * backwards-compatible aliases and will be deprecated in a future version.
 */

// ============================================================================
// WORKSPACE ROLES (Two-Tier Hierarchy) - Canonical Names
// ============================================================================

/**
 * Management roles control workspace settings and administration.
 */
export const WORKSPACE_MANAGEMENT_ROLES = {
  WORKSPACE_OWNER: "WORKSPACE_OWNER",
  WORKSPACE_ADMIN: "WORKSPACE_ADMIN",
} as const;

export type WorkspaceManagementRole = (typeof WORKSPACE_MANAGEMENT_ROLES)[keyof typeof WORKSPACE_MANAGEMENT_ROLES];

/**
 * Operational roles determine content access.
 * Every user must have exactly one operational role.
 */
export const WORKSPACE_OPERATIONAL_ROLES = {
  WORKSPACE_EDITOR: "WORKSPACE_EDITOR",
  WORKSPACE_MEMBER: "WORKSPACE_MEMBER",
  WORKSPACE_VIEWER: "WORKSPACE_VIEWER",
} as const;

export type WorkspaceOperationalRole = (typeof WORKSPACE_OPERATIONAL_ROLES)[keyof typeof WORKSPACE_OPERATIONAL_ROLES];

/**
 * All workspace roles (management + operational).
 */
export const WORKSPACE_ROLES = {
  ...WORKSPACE_MANAGEMENT_ROLES,
  ...WORKSPACE_OPERATIONAL_ROLES,
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

// ============================================================================
// TEAM ROLES - Backwards Compatible Aliases (Deprecated)
// ============================================================================

/**
 * @deprecated Use WORKSPACE_MANAGEMENT_ROLES instead
 */
export const TEAM_MANAGEMENT_ROLES = {
  TEAM_OWNER: "WORKSPACE_OWNER",
  TEAM_ADMIN: "WORKSPACE_ADMIN",
} as const;

export type TeamManagementRole = (typeof TEAM_MANAGEMENT_ROLES)[keyof typeof TEAM_MANAGEMENT_ROLES];

/**
 * @deprecated Use WORKSPACE_OPERATIONAL_ROLES instead
 */
export const TEAM_OPERATIONAL_ROLES = {
  TEAM_EDITOR: "WORKSPACE_EDITOR",
  TEAM_MEMBER: "WORKSPACE_MEMBER",
  TEAM_VIEWER: "WORKSPACE_VIEWER",
} as const;

export type TeamOperationalRole = (typeof TEAM_OPERATIONAL_ROLES)[keyof typeof TEAM_OPERATIONAL_ROLES];

/**
 * @deprecated Use WORKSPACE_ROLES instead
 */
export const TEAM_ROLES = {
  ...TEAM_MANAGEMENT_ROLES,
  ...TEAM_OPERATIONAL_ROLES,
} as const;

export type TeamRole = (typeof TEAM_ROLES)[keyof typeof TEAM_ROLES];

// ============================================================================
// PROJECT ROLES
// ============================================================================

export const PROJECT_ROLES = {
  PROJECT_OWNER: "owner",
  PROJECT_EDITOR: "editor",
  PROJECT_DEVELOPER: "developer",
  PROJECT_VIEWER: "viewer",
} as const;

export type ProjectRole = (typeof PROJECT_ROLES)[keyof typeof PROJECT_ROLES];

// ============================================================================
// ALL ROLES
// ============================================================================

export type Role = TeamRole | ProjectRole;

export const ALL_ROLES = {
  ...TEAM_ROLES,
  ...PROJECT_ROLES,
} as const;

// ============================================================================
// PERMISSIONS
// ============================================================================

export const PERMISSIONS = {
  // Team permissions
  TEAM_VIEW: "team:view",
  TEAM_UPDATE: "team:update",
  TEAM_DELETE: "team:delete",
  TEAM_MANAGE_MEMBERS: "team:manage_members",
  TEAM_MANAGE_SETTINGS: "team:manage_settings",
  TEAM_TRANSFER_OWNERSHIP: "team:transfer_ownership",

  // Project permissions
  PROJECT_VIEW: "project:view",
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",
  PROJECT_MANAGE_MEMBERS: "project:manage_members",
  PROJECT_MANAGE_SETTINGS: "project:manage_settings",

  // Issue permissions
  ISSUE_VIEW: "issue:view",
  ISSUE_CREATE: "issue:create",
  ISSUE_UPDATE: "issue:update",
  ISSUE_DELETE: "issue:delete",
  ISSUE_ASSIGN: "issue:assign",
  ISSUE_COMMENT: "issue:comment",

  // Annotation permissions
  ANNOTATION_VIEW: "annotation:view",
  ANNOTATION_CREATE: "annotation:create",
  ANNOTATION_UPDATE: "annotation:update",
  ANNOTATION_DELETE: "annotation:delete",
  ANNOTATION_COMMENT: "annotation:comment",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================================
// ROLE PERMISSIONS MAP
// ============================================================================

/**
 * Maps each role to its set of permissions.
 * This is the single source of truth for what each role can do.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // -------------------------------------------------------------------------
  // TEAM ROLES
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TEAM MANAGEMENT ROLES (settings access only)
  // -------------------------------------------------------------------------

  [TEAM_ROLES.TEAM_OWNER]: [
    // Team management permissions (full control)
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TEAM_UPDATE,
    PERMISSIONS.TEAM_DELETE,
    PERMISSIONS.TEAM_MANAGE_MEMBERS,
    PERMISSIONS.TEAM_MANAGE_SETTINGS,
    PERMISSIONS.TEAM_TRANSFER_OWNERSHIP,
    
    // Note: Content permissions come from operational role (EDITOR/MEMBER/VIEWER)
  ],

  [TEAM_ROLES.TEAM_ADMIN]: [
    // Team management permissions (no delete, no transfer)
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TEAM_UPDATE,
    PERMISSIONS.TEAM_MANAGE_MEMBERS,
    PERMISSIONS.TEAM_MANAGE_SETTINGS,
    
    // Note: Content permissions come from operational role (EDITOR/MEMBER/VIEWER)
  ],

  // -------------------------------------------------------------------------
  // TEAM OPERATIONAL ROLES (content access)
  // -------------------------------------------------------------------------

  [TEAM_ROLES.TEAM_EDITOR]: [
    // Project permissions (view and create)
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,

    // Issue permissions (full control)
    PERMISSIONS.ISSUE_VIEW,
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_DELETE,
    PERMISSIONS.ISSUE_ASSIGN,
    PERMISSIONS.ISSUE_COMMENT,

    // Annotation permissions (full control)
    PERMISSIONS.ANNOTATION_VIEW,
    PERMISSIONS.ANNOTATION_CREATE,
    PERMISSIONS.ANNOTATION_UPDATE,
    PERMISSIONS.ANNOTATION_DELETE,
    PERMISSIONS.ANNOTATION_COMMENT,
  ],

  [TEAM_ROLES.TEAM_MEMBER]: [
    // Project permissions (view and create)
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,

    // Issue permissions (view and comment)
    PERMISSIONS.ISSUE_VIEW,
    PERMISSIONS.ISSUE_COMMENT,

    // Annotation permissions (view and comment)
    PERMISSIONS.ANNOTATION_VIEW,
    PERMISSIONS.ANNOTATION_COMMENT,
  ],

  [TEAM_ROLES.TEAM_VIEWER]: [
    // Project permissions (view only)
    PERMISSIONS.PROJECT_VIEW,

    // Issue permissions (view only)
    PERMISSIONS.ISSUE_VIEW,

    // Annotation permissions (view only)
    PERMISSIONS.ANNOTATION_VIEW,
  ],

  // -------------------------------------------------------------------------
  // PROJECT ROLES
  // -------------------------------------------------------------------------

  [PROJECT_ROLES.PROJECT_OWNER]: [
    // Project permissions (full control)
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.PROJECT_MANAGE_SETTINGS,

    // Issue permissions (full control)
    PERMISSIONS.ISSUE_VIEW,
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_DELETE,
    PERMISSIONS.ISSUE_ASSIGN,
    PERMISSIONS.ISSUE_COMMENT,

    // Annotation permissions (full control)
    PERMISSIONS.ANNOTATION_VIEW,
    PERMISSIONS.ANNOTATION_CREATE,
    PERMISSIONS.ANNOTATION_UPDATE,
    PERMISSIONS.ANNOTATION_DELETE,
    PERMISSIONS.ANNOTATION_COMMENT,
  ],

  [PROJECT_ROLES.PROJECT_EDITOR]: [
    // Project permissions (view only)
    PERMISSIONS.PROJECT_VIEW,

    // Issue permissions (full control)
    PERMISSIONS.ISSUE_VIEW,
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_DELETE,
    PERMISSIONS.ISSUE_ASSIGN,
    PERMISSIONS.ISSUE_COMMENT,

    // Annotation permissions (full control)
    PERMISSIONS.ANNOTATION_VIEW,
    PERMISSIONS.ANNOTATION_CREATE,
    PERMISSIONS.ANNOTATION_UPDATE,
    PERMISSIONS.ANNOTATION_DELETE,
    PERMISSIONS.ANNOTATION_COMMENT,
  ],

  [PROJECT_ROLES.PROJECT_DEVELOPER]: [
    // Project permissions (view only)
    PERMISSIONS.PROJECT_VIEW,

    // Issue permissions (view, update status, comment)
    PERMISSIONS.ISSUE_VIEW,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_COMMENT,

    // Annotation permissions (view and comment)
    PERMISSIONS.ANNOTATION_VIEW,
    PERMISSIONS.ANNOTATION_COMMENT,
  ],

  [PROJECT_ROLES.PROJECT_VIEWER]: [
    // Project permissions (view only)
    PERMISSIONS.PROJECT_VIEW,

    // Issue permissions (view only)
    PERMISSIONS.ISSUE_VIEW,

    // Annotation permissions (view only)
    PERMISSIONS.ANNOTATION_VIEW,
  ],
};

/**
 * Check if a role is a management role.
 */
export function isManagementRole(role: Role): boolean {
  return role in TEAM_MANAGEMENT_ROLES;
}

/**
 * Check if a role is an operational role.
 */
export function isOperationalRole(role: Role): boolean {
  return role in TEAM_OPERATIONAL_ROLES;
}

// ============================================================================
// DEFAULT ROLES
// ============================================================================

/**
 * Default roles assigned to new users after email verification.
 */
export const DEFAULT_ROLES = {
  // No default team role (user must create or join a team)
  team: null,

  // No default project role (user must be invited to projects)
  project: null,
} as const;

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

/**
 * Role hierarchy for team management roles (higher number = more permissions).
 */
export const TEAM_MANAGEMENT_ROLE_HIERARCHY: Record<TeamManagementRole, number> = {
  [TEAM_MANAGEMENT_ROLES.TEAM_ADMIN]: 1,
  [TEAM_MANAGEMENT_ROLES.TEAM_OWNER]: 2,
};

/**
 * Role hierarchy for team operational roles (higher number = more permissions).
 */
export const TEAM_OPERATIONAL_ROLE_HIERARCHY: Record<TeamOperationalRole, number> = {
  [TEAM_OPERATIONAL_ROLES.TEAM_VIEWER]: 1,
  [TEAM_OPERATIONAL_ROLES.TEAM_MEMBER]: 2,
  [TEAM_OPERATIONAL_ROLES.TEAM_EDITOR]: 3,
};

/**
 * Role hierarchy for project roles (higher number = more permissions).
 */
export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [PROJECT_ROLES.PROJECT_VIEWER]: 1,
  [PROJECT_ROLES.PROJECT_DEVELOPER]: 2,
  [PROJECT_ROLES.PROJECT_EDITOR]: 3,
  [PROJECT_ROLES.PROJECT_OWNER]: 4,
};

/**
 * Check if roleA has higher or equal permissions than roleB.
 */
export function hasHigherOrEqualRole(
  roleA: TeamManagementRole,
  roleB: TeamManagementRole
): boolean;
export function hasHigherOrEqualRole(
  roleA: TeamOperationalRole,
  roleB: TeamOperationalRole
): boolean;
export function hasHigherOrEqualRole(
  roleA: ProjectRole,
  roleB: ProjectRole
): boolean;
export function hasHigherOrEqualRole(roleA: Role, roleB: Role): boolean {
  // Check if both are team management roles
  if (roleA in TEAM_MANAGEMENT_ROLE_HIERARCHY && roleB in TEAM_MANAGEMENT_ROLE_HIERARCHY) {
    return (
      TEAM_MANAGEMENT_ROLE_HIERARCHY[roleA as TeamManagementRole] >=
      TEAM_MANAGEMENT_ROLE_HIERARCHY[roleB as TeamManagementRole]
    );
  }

  // Check if both are team operational roles
  if (roleA in TEAM_OPERATIONAL_ROLE_HIERARCHY && roleB in TEAM_OPERATIONAL_ROLE_HIERARCHY) {
    return (
      TEAM_OPERATIONAL_ROLE_HIERARCHY[roleA as TeamOperationalRole] >=
      TEAM_OPERATIONAL_ROLE_HIERARCHY[roleB as TeamOperationalRole]
    );
  }

  // Check if both are project roles
  if (roleA in PROJECT_ROLE_HIERARCHY && roleB in PROJECT_ROLE_HIERARCHY) {
    return (
      PROJECT_ROLE_HIERARCHY[roleA as ProjectRole] >=
      PROJECT_ROLE_HIERARCHY[roleB as ProjectRole]
    );
  }

  // Cannot compare different role types
  return false;
}

// ============================================================================
// ROLE LABELS
// ============================================================================

/**
 * Human-readable labels for roles (used in UI).
 */
export const ROLE_LABELS: Record<Role, string> = {
  // Team roles
  [TEAM_ROLES.TEAM_OWNER]: "Owner",
  [TEAM_ROLES.TEAM_ADMIN]: "Admin",
  [TEAM_ROLES.TEAM_EDITOR]: "Editor",
  [TEAM_ROLES.TEAM_MEMBER]: "Member",
  [TEAM_ROLES.TEAM_VIEWER]: "Viewer",

  // Project roles
  [PROJECT_ROLES.PROJECT_OWNER]: "Owner",
  [PROJECT_ROLES.PROJECT_EDITOR]: "Editor",
  [PROJECT_ROLES.PROJECT_DEVELOPER]: "Developer",
  [PROJECT_ROLES.PROJECT_VIEWER]: "Viewer",
};

/**
 * Role descriptions (used in UI tooltips and help text).
 */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  // Team management roles
  [TEAM_ROLES.TEAM_OWNER]:
    "Full control over team. Manage members, settings, and can delete team or transfer ownership.",
  [TEAM_ROLES.TEAM_ADMIN]:
    "Manage team members, projects, and integrations. Cannot delete team or transfer ownership.",

  // Team operational roles
  [TEAM_ROLES.TEAM_EDITOR]:
    "Create and manage issues and annotations. Automatically assigned when user becomes a Project Owner or Project Editor.",
  [TEAM_ROLES.TEAM_MEMBER]:
    "View projects and comment on issues. Can be assigned to projects.",
  [TEAM_ROLES.TEAM_VIEWER]:
    "View-only access to projects and issues. No modifications.",

  // Project roles
  [PROJECT_ROLES.PROJECT_OWNER]:
    "Full control over project and its issues. Auto-promotes to TEAM_EDITOR.",
  [PROJECT_ROLES.PROJECT_EDITOR]:
    "Create and manage issues and annotations. Auto-promotes to TEAM_EDITOR.",
  [PROJECT_ROLES.PROJECT_DEVELOPER]:
    "Update issue status and comment.",
  [PROJECT_ROLES.PROJECT_VIEWER]:
    "View-only access to project and issues.",
};
