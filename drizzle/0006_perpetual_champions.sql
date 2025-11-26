ALTER TABLE "team_invitations" DROP CONSTRAINT "team_invitations_token_unique";--> statement-breakpoint
DROP INDEX "team_invitations_token_idx";--> statement-breakpoint
ALTER TABLE "team_invitations" RENAME COLUMN "token" TO "token_hash";--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_token_hash_idx" ON "team_invitations" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_token_hash_unique" UNIQUE("token_hash");