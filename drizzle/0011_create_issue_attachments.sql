-- Create attachment review variant enum
DO $$ BEGIN
  CREATE TYPE attachment_review_variant AS ENUM ('as_is', 'to_be', 'reference');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issue_attachments table
CREATE TABLE IF NOT EXISTS "issue_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_size" integer NOT NULL,
  "file_type" varchar(100) NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "width" integer,
  "height" integer,
  "review_variant" attachment_review_variant DEFAULT 'as_is',
  "annotations" jsonb DEFAULT '[]'::jsonb,
  "uploaded_by_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Add foreign key constraint to issues table
DO $$ BEGIN
  ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_issue_id_issues_id_fk" 
    FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add foreign key constraint to users table
DO $$ BEGIN
  ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_uploaded_by_id_users_id_fk" 
    FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add check constraint for max 10MB file size (10 * 1024 * 1024 = 10485760 bytes)
DO $$ BEGIN
  ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_file_size_check" 
    CHECK ("file_size" > 0 AND "file_size" <= 10485760);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add index on issue_id for efficient queries
CREATE INDEX IF NOT EXISTS "issue_attachments_issue_id_idx" ON "issue_attachments" USING btree ("issue_id");
