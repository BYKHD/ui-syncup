-- Create issue activity type enum
DO $$ BEGIN
  CREATE TYPE issue_activity_type AS ENUM (
    'created',
    'status_changed',
    'priority_changed',
    'type_changed',
    'title_changed',
    'description_changed',
    'assignee_changed',
    'comment_added',
    'attachment_added',
    'attachment_removed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issue_activities table
CREATE TABLE IF NOT EXISTS "issue_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL,
  "actor_id" uuid NOT NULL,
  "type" issue_activity_type NOT NULL,
  "changes" jsonb DEFAULT '[]'::jsonb,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Add foreign key constraint to issues table
DO $$ BEGIN
  ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_issue_id_issues_id_fk" 
    FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add foreign key constraint to users table
DO $$ BEGIN
  ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_actor_id_users_id_fk" 
    FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add index on issue_id for efficient queries
CREATE INDEX IF NOT EXISTS "issue_activities_issue_id_idx" ON "issue_activities" USING btree ("issue_id");

--> statement-breakpoint
-- Add index on created_at for timeline ordering
CREATE INDEX IF NOT EXISTS "issue_activities_created_at_idx" ON "issue_activities" USING btree ("created_at");

--> statement-breakpoint
-- Composite index for fetching activities by issue in chronological order
CREATE INDEX IF NOT EXISTS "issue_activities_issue_created_idx" ON "issue_activities" USING btree ("issue_id", "created_at");
