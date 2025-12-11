-- Add annotation constraints to issue_attachments table
-- Requirements: 13.5 (annotation limit enforcement)

-- Add CHECK constraint to limit annotations array to max 50 elements
-- Using jsonb_array_length to validate JSONB array size
DO $$ BEGIN
  ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_max_annotations_check"
    CHECK (jsonb_array_length(annotations) <= 50);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add GIN index for efficient JSONB queries on annotations column
-- Enables fast searches within the annotations array
CREATE INDEX IF NOT EXISTS "issue_attachments_annotations_gin_idx" 
  ON "issue_attachments" USING GIN ("annotations");
