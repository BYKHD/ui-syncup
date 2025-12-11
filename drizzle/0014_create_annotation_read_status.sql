-- Create annotation_read_status table
-- Tracks per-user read status of annotations for the unread indicator feature
-- Requirements: 3.5 (unread indicator logic)

CREATE TABLE IF NOT EXISTS "annotation_read_status" (
  "user_id" uuid NOT NULL,
  "attachment_id" uuid NOT NULL,
  "annotation_id" uuid NOT NULL, -- References annotation ID within JSONB, not a foreign key
  "last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "attachment_id", "annotation_id")
);

--> statement-breakpoint
-- Add foreign key constraint to users table
DO $$ BEGIN
  ALTER TABLE "annotation_read_status" ADD CONSTRAINT "annotation_read_status_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add foreign key constraint to issue_attachments table
DO $$ BEGIN
  ALTER TABLE "annotation_read_status" ADD CONSTRAINT "annotation_read_status_attachment_id_issue_attachments_id_fk" 
    FOREIGN KEY ("attachment_id") REFERENCES "public"."issue_attachments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add index for user-based queries
CREATE INDEX IF NOT EXISTS "annotation_read_status_user_id_idx" ON "annotation_read_status" USING btree ("user_id");

--> statement-breakpoint
-- Add index for attachment-based queries
CREATE INDEX IF NOT EXISTS "annotation_read_status_attachment_id_idx" ON "annotation_read_status" USING btree ("attachment_id");
