import { pgTable, uuid, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { issueAttachments } from "./issue-attachments";

/**
 * Annotation read status table - tracks per-user read status of annotations
 *
 * This table enables the "unread indicator" feature by tracking when each user
 * last viewed each annotation. When the latest comment's timestamp is greater
 * than the user's last_read_at, the annotation shows as unread.
 *
 * Design decisions:
 * - Separate table since read status is user-specific and frequently updated
 * - annotation_id is a UUID referencing the annotation ID within the JSONB array
 * - Composite primary key for uniqueness and efficient lookups
 * - Cascade deletes to prevent orphan records
 *
 * Requirements: 3.5 (unread indicator logic)
 */
export const annotationReadStatus = pgTable(
  "annotation_read_status",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attachmentId: uuid("attachment_id")
      .notNull()
      .references(() => issueAttachments.id, { onDelete: "cascade" }),
    // References annotation ID within the JSONB array, not a foreign key
    annotationId: uuid("annotation_id").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Composite primary key for uniqueness
    pk: primaryKey({
      columns: [table.userId, table.attachmentId, table.annotationId],
    }),
    // Index for user-based queries (e.g., "all unread for this user")
    userIdIdx: index("annotation_read_status_user_id_idx").on(table.userId),
    // Index for attachment-based queries (e.g., "all readers of this attachment")
    attachmentIdIdx: index("annotation_read_status_attachment_id_idx").on(
      table.attachmentId
    ),
  })
);

/**
 * Type inference for AnnotationReadStatus select operations
 */
export type AnnotationReadStatus = typeof annotationReadStatus.$inferSelect;

/**
 * Type inference for AnnotationReadStatus insert operations
 */
export type NewAnnotationReadStatus = typeof annotationReadStatus.$inferInsert;
