-- Add updated_at column to sessions table for better-auth compatibility
-- better-auth requires this column for session management
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT NOW();
