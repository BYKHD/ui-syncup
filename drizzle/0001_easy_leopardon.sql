-- Cancel duplicate active invitations before adding the partial unique indexes.
-- Without this, CREATE UNIQUE INDEX would fail on any existing duplicates that
-- slipped past the racy check-then-insert in the invitation services.
-- Strategy: per (scope_id, lower(email)) group, keep the row with the most
-- recent created_at (ties broken by id DESC) and soft-cancel the rest.

WITH ranked_project_invitations AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "project_id", lower("email")
    ORDER BY "created_at" DESC, "id" DESC
  ) AS rn
  FROM "project_invitations"
  WHERE "used_at" IS NULL AND "cancelled_at" IS NULL
)
UPDATE "project_invitations"
SET "cancelled_at" = NOW()
WHERE "id" IN (SELECT "id" FROM ranked_project_invitations WHERE rn > 1);
--> statement-breakpoint

WITH ranked_team_invitations AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "team_id", lower("email")
    ORDER BY "created_at" DESC, "id" DESC
  ) AS rn
  FROM "team_invitations"
  WHERE "used_at" IS NULL AND "cancelled_at" IS NULL
)
UPDATE "team_invitations"
SET "cancelled_at" = NOW()
WHERE "id" IN (SELECT "id" FROM ranked_team_invitations WHERE rn > 1);
--> statement-breakpoint

CREATE UNIQUE INDEX "project_invitations_active_unique_idx" ON "project_invitations" USING btree ("project_id",lower("email")) WHERE "project_invitations"."used_at" IS NULL AND "project_invitations"."cancelled_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_active_unique_idx" ON "team_invitations" USING btree ("team_id",lower("email")) WHERE "team_invitations"."used_at" IS NULL AND "team_invitations"."cancelled_at" IS NULL;
