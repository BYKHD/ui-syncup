-- Migration: Add instance_settings table for self-hosted setup
-- This table stores instance-level configuration and tracks setup completion

-- Create instance_settings table
CREATE TABLE instance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name VARCHAR(100) NOT NULL DEFAULT 'UI SyncUp',
    public_url VARCHAR(255),
    default_workspace_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    default_member_role VARCHAR(50) NOT NULL DEFAULT 'WORKSPACE_MEMBER',
    setup_completed_at TIMESTAMP WITH TIME ZONE,
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Singleton constraint: Only one row should exist in this table
-- Uses a unique index on a constant TRUE expression
CREATE UNIQUE INDEX instance_settings_singleton ON instance_settings ((TRUE));

-- Add helpful comment
COMMENT ON TABLE instance_settings IS 'Singleton table storing instance-level configuration for self-hosted deployments';
COMMENT ON COLUMN instance_settings.default_workspace_id IS 'ID of the default workspace for single-workspace mode';
COMMENT ON COLUMN instance_settings.default_member_role IS 'Default role for new users in single-workspace mode (WORKSPACE_VIEWER, WORKSPACE_MEMBER, or WORKSPACE_EDITOR)';
COMMENT ON COLUMN instance_settings.setup_completed_at IS 'Timestamp when initial setup wizard was completed; NULL means setup is required';

-- For existing instances: Mark setup as complete if users exist
-- This ensures backwards compatibility for instances that already have users
INSERT INTO instance_settings (instance_name, setup_completed_at, admin_user_id, default_workspace_id)
SELECT 
    'UI SyncUp',
    NOW(),
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    (SELECT id FROM teams ORDER BY created_at ASC LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users);
