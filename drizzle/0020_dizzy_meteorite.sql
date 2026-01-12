ALTER TABLE "project_invitations" ADD COLUMN "email_delivery_failed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD COLUMN "email_failure_reason" text;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD COLUMN "email_last_attempt_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "project_invitations_email_failed_idx" ON "project_invitations" USING btree ("email_delivery_failed","email_last_attempt_at") WHERE "project_invitations"."email_delivery_failed" = true;