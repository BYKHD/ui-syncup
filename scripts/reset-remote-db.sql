-- ================================================================
-- REMOTE DATABASE RESET SCRIPT
-- Run this on your Supabase remote database via SQL Editor
-- This will DROP all tables and reset migration tracking
-- ================================================================

-- Drop all tables in public schema (in correct order for FK constraints)
DROP TABLE IF EXISTS "project_members" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "team_invitations" CASCADE;
DROP TABLE IF EXISTS "team_members" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "email_jobs" CASCADE;
DROP TABLE IF EXISTS "user_roles" CASCADE;
DROP TABLE IF EXISTS "verification_tokens" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS "project_status" CASCADE;
DROP TYPE IF EXISTS "project_visibility" CASCADE;
DROP TYPE IF EXISTS "project_role" CASCADE;

-- Reset migration tracking (drop and let Drizzle recreate)
DROP SCHEMA IF EXISTS "drizzle" CASCADE;

-- Verify cleanup
SELECT 'Tables remaining: ' || COUNT(*)::text 
FROM pg_tables 
WHERE schemaname = 'public';
