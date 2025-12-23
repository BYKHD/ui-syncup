CREATE TYPE "public"."issue_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'in_review', 'resolved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."issue_type" AS ENUM('bug', 'visual', 'accessibility', 'content', 'other');--> statement-breakpoint
CREATE TYPE "public"."attachment_review_variant" AS ENUM('as_is', 'to_be', 'reference');--> statement-breakpoint
CREATE TYPE "public"."issue_activity_type" AS ENUM('created', 'status_changed', 'priority_changed', 'type_changed', 'title_changed', 'description_changed', 'assignee_changed', 'comment_added', 'attachment_added', 'attachment_removed', 'annotation_created', 'annotation_updated', 'annotation_commented', 'annotation_deleted');--> statement-breakpoint
CREATE TABLE "better_auth_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "better_auth_verifications_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "project_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"role" varchar(20) NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_key" varchar(50) NOT NULL,
	"issue_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "issue_type" DEFAULT 'bug' NOT NULL,
	"priority" "issue_priority" DEFAULT 'medium' NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"reporter_id" uuid NOT NULL,
	"cover_image_url" text,
	"page" varchar(255),
	"figma_link" text,
	"jira_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "issue_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"width" integer,
	"height" integer,
	"review_variant" "attachment_review_variant" DEFAULT 'as_is',
	"annotations" jsonb DEFAULT '[]'::jsonb,
	"uploaded_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_attachments_file_size_check" CHECK ("issue_attachments"."file_size" > 0 AND "issue_attachments"."file_size" <= 10485760),
	CONSTRAINT "issue_attachments_max_annotations_check" CHECK (jsonb_array_length("issue_attachments"."annotations") <= 50)
);
--> statement-breakpoint
CREATE TABLE "issue_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"type" "issue_activity_type" NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annotation_read_status" (
	"user_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"annotation_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annotation_read_status_user_id_attachment_id_annotation_id_pk" PRIMARY KEY("user_id","attachment_id","annotation_id")
);
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "role" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activities" ADD CONSTRAINT "issue_activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation_read_status" ADD CONSTRAINT "annotation_read_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation_read_status" ADD CONSTRAINT "annotation_read_status_attachment_id_issue_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."issue_attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_token_hash_idx" ON "project_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "project_invitations_project_email_idx" ON "project_invitations" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "project_invitations_expires_idx" ON "project_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "issues_project_id_idx" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issues_assignee_id_idx" ON "issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issues_project_status_idx" ON "issues" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "issues_team_id_idx" ON "issues" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "issues_team_project_idx" ON "issues" USING btree ("team_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_issue_number_unique" ON "issues" USING btree ("project_id","issue_number");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_issue_key_unique" ON "issues" USING btree ("project_id","issue_key");--> statement-breakpoint
CREATE INDEX "issue_attachments_issue_id_idx" ON "issue_attachments" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_attachments_team_id_idx" ON "issue_attachments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "issue_activities_issue_id_idx" ON "issue_activities" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_activities_created_at_idx" ON "issue_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "issue_activities_issue_created_idx" ON "issue_activities" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "issue_activities_team_id_idx" ON "issue_activities" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "annotation_read_status_user_id_idx" ON "annotation_read_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "annotation_read_status_attachment_id_idx" ON "annotation_read_status" USING btree ("attachment_id");