import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { issues } from "./issues";
import { projects } from "./projects";
import { teams } from "./teams";
import { users } from "./users";

/**
 * Issue activity type enum - categorizes the type of activity
 */
export const issueActivityTypeEnum = pgEnum("issue_activity_type", [
  "created",
  "status_changed",
  "priority_changed",
  "type_changed",
  "title_changed",
  "description_changed",
  "assignee_changed",
  "comment_added",
  "attachment_added",
  "attachment_removed",
]);

/**
 * Issue activities table - tracks all changes and events on issues
 *
 * Each activity belongs to an issue and records:
 * - The actor who performed the action
 * - The type of activity (status change, comment, etc.)
 * - JSONB changes array for field-level change tracking
 * - Optional comment text for comment activities
 * - Timestamp for timeline ordering
 *
 * Multi-tenant design:
 * - teamId and projectId are denormalized for direct filtering
 * - Enables efficient team-scoped queries without JOINs through issues
 */
export const issueActivities = pgTable(
  "issue_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Tenant isolation: denormalized from issue for direct filtering
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: issueActivityTypeEnum("type").notNull(),
    changes: jsonb("changes").default(sql`'[]'::jsonb`),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Index for fetching activities by issue
    issueIdIdx: index("issue_activities_issue_id_idx").on(table.issueId),
    // Index for timeline ordering
    createdAtIdx: index("issue_activities_created_at_idx").on(table.createdAt),
    // Composite index for fetching activities by issue in chronological order
    issueCreatedIdx: index("issue_activities_issue_created_idx").on(
      table.issueId,
      table.createdAt
    ),
    // Team-level index for multi-tenant queries
    teamIdIdx: index("issue_activities_team_id_idx").on(table.teamId),
  })
);

/**
 * Type inference for IssueActivity select operations
 */
export type IssueActivity = typeof issueActivities.$inferSelect;

/**
 * Type inference for IssueActivity insert operations
 */
export type NewIssueActivity = typeof issueActivities.$inferInsert;
