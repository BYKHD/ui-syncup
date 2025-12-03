DO $$ BEGIN
 CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."project_visibility" AS ENUM('public', 'private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."project_role" AS ENUM('owner', 'editor', 'member', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;