CREATE TYPE "public"."project_activity_type" AS ENUM('invitation_sent', 'invitation_accepted', 'invitation_declined', 'invitation_revoked', 'invitation_email_failed', 'member_role_changed', 'member_added', 'member_removed');--> statement-breakpoint
CREATE TABLE "project_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" "project_activity_type" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_activities_project_id_idx" ON "project_activities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_activities_created_at_idx" ON "project_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_activities_project_created_idx" ON "project_activities" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_activities_team_id_idx" ON "project_activities" USING btree ("team_id");