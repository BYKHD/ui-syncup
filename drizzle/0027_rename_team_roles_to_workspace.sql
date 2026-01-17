-- Migration: Rename TEAM_* roles to WORKSPACE_* roles
-- This migration updates existing role values in team_members and team_invitations tables

-- Update management roles in team_members
UPDATE team_members SET management_role = 'WORKSPACE_OWNER' WHERE management_role = 'TEAM_OWNER';
UPDATE team_members SET management_role = 'WORKSPACE_ADMIN' WHERE management_role = 'TEAM_ADMIN';

-- Update operational roles in team_members
UPDATE team_members SET operational_role = 'WORKSPACE_EDITOR' WHERE operational_role = 'TEAM_EDITOR';
UPDATE team_members SET operational_role = 'WORKSPACE_MEMBER' WHERE operational_role = 'TEAM_MEMBER';
UPDATE team_members SET operational_role = 'WORKSPACE_VIEWER' WHERE operational_role = 'TEAM_VIEWER';

-- Update management roles in team_invitations
UPDATE team_invitations SET management_role = 'WORKSPACE_OWNER' WHERE management_role = 'TEAM_OWNER';
UPDATE team_invitations SET management_role = 'WORKSPACE_ADMIN' WHERE management_role = 'TEAM_ADMIN';

-- Update operational roles in team_invitations
UPDATE team_invitations SET operational_role = 'WORKSPACE_EDITOR' WHERE operational_role = 'TEAM_EDITOR';
UPDATE team_invitations SET operational_role = 'WORKSPACE_MEMBER' WHERE operational_role = 'TEAM_MEMBER';
UPDATE team_invitations SET operational_role = 'WORKSPACE_VIEWER' WHERE operational_role = 'TEAM_VIEWER';

-- Add helpful comment
COMMENT ON TABLE team_members IS 'Workspace members with WORKSPACE_* roles (legacy table name retained for compatibility)';
COMMENT ON TABLE team_invitations IS 'Workspace invitations with WORKSPACE_* roles (legacy table name retained for compatibility)';
