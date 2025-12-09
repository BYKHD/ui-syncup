-- Migration: Add tenant fields for multi-tenant best practices
-- This migration adds denormalized teamId/projectId for performance and RLS support

-- ============================================================================
-- ISSUES TABLE
-- ============================================================================

-- Add new columns
ALTER TABLE "issues" 
  ADD COLUMN IF NOT EXISTS "team_id" uuid,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "created_by" uuid,
  ADD COLUMN IF NOT EXISTS "updated_by" uuid;

-- Populate team_id from projects for existing issues
UPDATE "issues" i
SET team_id = p.team_id
FROM "projects" p
WHERE i.project_id = p.id AND i.team_id IS NULL;

-- Populate created_by from reporter_id for existing issues
UPDATE "issues"
SET created_by = reporter_id
WHERE created_by IS NULL;

-- Make team_id NOT NULL after population
ALTER TABLE "issues" ALTER COLUMN "team_id" SET NOT NULL;

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_team_id_teams_id_fk" 
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_users_id_fk" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_updated_by_users_id_fk" 
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add indexes for team-level queries
CREATE INDEX IF NOT EXISTS "issues_team_id_idx" ON "issues" ("team_id");
CREATE INDEX IF NOT EXISTS "issues_team_project_idx" ON "issues" ("team_id", "project_id");

-- ============================================================================
-- ISSUE_ACTIVITIES TABLE
-- ============================================================================

-- Add new columns
ALTER TABLE "issue_activities"
  ADD COLUMN IF NOT EXISTS "team_id" uuid,
  ADD COLUMN IF NOT EXISTS "project_id" uuid;

-- Populate from issues (through the issue relationship)
UPDATE "issue_activities" ia
SET 
  team_id = i.team_id,
  project_id = i.project_id
FROM "issues" i
WHERE ia.issue_id = i.id AND ia.team_id IS NULL;

-- Make columns NOT NULL after population
-- Note: Only set NOT NULL if there are no NULL values (i.e., all rows have been populated)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "issue_activities" WHERE team_id IS NULL) THEN
    ALTER TABLE "issue_activities" ALTER COLUMN "team_id" SET NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "issue_activities" WHERE project_id IS NULL) THEN
    ALTER TABLE "issue_activities" ALTER COLUMN "project_id" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_team_id_teams_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "issue_activities_team_id_idx" ON "issue_activities" ("team_id");

-- ============================================================================
-- ISSUE_ATTACHMENTS TABLE
-- ============================================================================

-- Add new columns
ALTER TABLE "issue_attachments"
  ADD COLUMN IF NOT EXISTS "team_id" uuid,
  ADD COLUMN IF NOT EXISTS "project_id" uuid;

-- Populate from issues (through the issue relationship)
UPDATE "issue_attachments" ia
SET 
  team_id = i.team_id,
  project_id = i.project_id
FROM "issues" i
WHERE ia.issue_id = i.id AND ia.team_id IS NULL;

-- Make columns NOT NULL after population
-- Note: Only set NOT NULL if there are no NULL values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "issue_attachments" WHERE team_id IS NULL) THEN
    ALTER TABLE "issue_attachments" ALTER COLUMN "team_id" SET NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "issue_attachments" WHERE project_id IS NULL) THEN
    ALTER TABLE "issue_attachments" ALTER COLUMN "project_id" SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_team_id_teams_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "issue_attachments_team_id_idx" ON "issue_attachments" ("team_id");
