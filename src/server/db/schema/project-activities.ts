import {
  pgTable,
  uuid,
  timestamp,
  index,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./projects";
import { teams } from "./teams";
import { users } from "./users";

/**
 * Project activity type enum - categorizes the type of activity
 *
 * Activity types for project-level events (not issue-related):
 * - invitation_sent: When an invitation is created
 * - invitation_accepted: When a user accepts an invitation
 * - invitation_declined: When a user declines an invitation
 * - invitation_revoked: When an admin cancels an invitation
 * - invitation_email_failed: When email delivery permanently fails
 * - member_role_changed: When an existing member's role is updated
 * - member_added: When a member is added (via invitation or direct)
 * - member_removed: When a member is removed from the project
 */
export const projectActivityTypeEnum = pgEnum("project_activity_type", [
  "invitation_sent",
  "invitation_accepted",
  "invitation_declined",
  "invitation_revoked",
  "invitation_email_failed",
  "member_role_changed",
  "member_added",
  "member_removed",
]);

/**
 * Project activities table - tracks all project-level changes and events
 *
 * Each activity belongs to a project and records:
 * - The actor who performed the action (nullable for system events)
 * - The type of activity (invitation events, member changes, etc.)
 * - JSONB metadata for event-specific details
 * - Timestamp for timeline ordering
 *
 * Multi-tenant design:
 * - teamId is denormalized for direct filtering
 * - Enables efficient team-scoped queries without JOINs through projects
 *
 * System events (no actor):
 * - Some activities like email failures don't have a user actor
 * - actorId is nullable to support these system-generated events
 */
export const projectActivities = pgTable(
  "project_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Tenant isolation: denormalized for direct filtering
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Nullable for system events (email failures, etc.)
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: projectActivityTypeEnum("type").notNull(),
    // Event-specific metadata (invitation details, role changes, etc.)
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Index for fetching activities by project
    projectIdIdx: index("project_activities_project_id_idx").on(
      table.projectId
    ),
    // Index for timeline ordering
    createdAtIdx: index("project_activities_created_at_idx").on(
      table.createdAt
    ),
    // Composite index for fetching activities by project in chronological order
    projectCreatedIdx: index("project_activities_project_created_idx").on(
      table.projectId,
      table.createdAt
    ),
    // Team-level index for multi-tenant queries
    teamIdIdx: index("project_activities_team_id_idx").on(table.teamId),
    // Composite index for type-filtered queries (e.g., "show only invitation events")
    projectTypeCreatedIdx: index("project_activities_project_type_created_idx").on(
      table.projectId,
      table.type,
      table.createdAt
    ),
  })
);

/**
 * Type inference for ProjectActivity select operations
 */
export type ProjectActivity = typeof projectActivities.$inferSelect;

/**
 * Type inference for ProjectActivity insert operations
 */
export type NewProjectActivity = typeof projectActivities.$inferInsert;

/**
 * Project activity type literal type
 */
export type ProjectActivityType =
  (typeof projectActivityTypeEnum.enumValues)[number];
