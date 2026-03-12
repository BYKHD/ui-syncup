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
import { users } from "./users";

/**
 * Notification type enum - categorizes the type of notification
 *
 * Types are grouped by category:
 * - Collaboration: mention, comment_created, reply
 * - Workflow: issue_assigned, issue_status_changed
 * - System/Access: project_invitation, team_invitation, role_updated
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "mention",
  "comment_created",
  "reply",
  "issue_assigned",
  "issue_status_changed",
  "project_invitation",
  "team_invitation",
  "role_updated",
]);

/**
 * Notifications table - stores in-app notifications for users
 *
 * Each notification records:
 * - The recipient user
 * - The actor who triggered the notification (nullable for system events)
 * - The type of notification event
 * - Polymorphic relation to the entity (issue, project, comment, team)
 * - JSONB metadata for rendering without extra fetches
 * - Read status and timestamp
 *
 * Design notes:
 * - No multi-tenant fields (teamId, projectId) since notifications are user-scoped
 * - RLS policies ensure users can only access their own notifications
 * - Metadata is denormalized to avoid N+1 queries when rendering
 * - Indexes optimized for common query patterns (unread, grouping, dedup)
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Recipient of the notification
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Actor who triggered the notification (null for system-generated)
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Type of notification event
    type: notificationTypeEnum("type").notNull(),
    // Polymorphic relation to entity
    entityType: text("entity_type").notNull(), // 'issue', 'project', 'comment', 'team'
    entityId: uuid("entity_id").notNull(),
    // Denormalized metadata for rendering without extra fetches
    // Structure: { issue_title, comment_preview, project_name, target_url, etc. }
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    // Read status
    readAt: timestamp("read_at", { withTimezone: true }),
    // Creation timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Primary index for recipient's unread notifications (ordered by date)
    // Used for: GET /api/notifications (paginated list)
    recipientUnreadIdx: index("idx_notifications_recipient_unread").on(
      table.recipientId,
      table.createdAt
    ),
    // Entity lookup index for finding notifications related to an entity
    // Used for: Cleanup when entity is deleted, bulk operations
    entityIdx: index("idx_notifications_entity").on(
      table.entityType,
      table.entityId
    ),
    // Grouping index for client-side aggregation queries
    // Used for: Grouping notifications by (type, entity) within time window
    groupingIdx: index("idx_notifications_grouping").on(
      table.recipientId,
      table.type,
      table.entityType,
      table.entityId,
      table.createdAt
    ),
    // Deduplication check index (5-minute window)
    // Used for: Preventing notification spam from repeated actions
    dedupIdx: index("idx_notifications_dedup").on(
      table.recipientId,
      table.actorId,
      table.type,
      table.entityType,
      table.entityId,
      table.createdAt
    ),
  })
);

/**
 * Type inference for Notification select operations
 */
export type DbNotification = typeof notifications.$inferSelect;

/**
 * Type inference for Notification insert operations
 */
export type NewDbNotification = typeof notifications.$inferInsert;
