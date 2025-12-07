-- Create issue type enum
DO $$ BEGIN
  CREATE TYPE issue_type AS ENUM ('bug', 'visual', 'accessibility', 'content', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issue priority enum
DO $$ BEGIN
  CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issue status enum
DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'in_review', 'resolved', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issues table
CREATE TABLE IF NOT EXISTS "issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "issue_key" varchar(50) NOT NULL,
  "issue_number" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "type" issue_type NOT NULL DEFAULT 'bug',
  "priority" issue_priority NOT NULL DEFAULT 'medium',
  "status" issue_status NOT NULL DEFAULT 'open',
  "assignee_id" uuid,
  "reporter_id" uuid NOT NULL,
  "cover_image_url" text,
  "page" varchar(255),
  "figma_link" text,
  "jira_link" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" 
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" 
    FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_users_id_fk" 
    FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "issues_project_issue_number_unique" ON "issues" USING btree ("project_id", "issue_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "issues_project_issue_key_unique" ON "issues" USING btree ("project_id", "issue_key");

--> statement-breakpoint
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "issues_project_id_idx" ON "issues" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issues_status_idx" ON "issues" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issues_assignee_id_idx" ON "issues" USING btree ("assignee_id");
--> statement-breakpoint
-- Composite index for filtering issues by project and status
CREATE INDEX IF NOT EXISTS "issues_project_status_idx" ON "issues" USING btree ("project_id", "status");
