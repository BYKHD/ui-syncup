-- Consolidates the legacy 'developer' project role into 'member'.
-- Both project_members.role and project_invitations.role are varchar columns,
-- so no schema change is needed — only data.

UPDATE project_members
SET role = 'member'
WHERE role = 'developer';

UPDATE project_invitations
SET role = 'member'
WHERE role = 'developer';
