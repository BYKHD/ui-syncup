-- Remove billing-related columns from teams table
-- This migration removes plan_id and billable_seats columns as part of the open-source refactor

-- Drop the plan index first
DROP INDEX IF EXISTS "teams_plan_idx";

-- Remove billing columns
ALTER TABLE "teams" DROP COLUMN IF EXISTS "plan_id";
ALTER TABLE "teams" DROP COLUMN IF EXISTS "billable_seats";
