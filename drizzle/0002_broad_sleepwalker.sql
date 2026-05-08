CREATE TABLE "project_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"message" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"decline_cooldown_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_access_requests" ADD CONSTRAINT "project_access_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_access_requests" ADD CONSTRAINT "project_access_requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_access_requests" ADD CONSTRAINT "project_access_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_access_requests_pending_unique_idx" ON "project_access_requests" USING btree ("project_id","requester_user_id") WHERE "project_access_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "project_access_requests_project_status_idx" ON "project_access_requests" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_access_requests_requester_idx" ON "project_access_requests" USING btree ("requester_user_id");