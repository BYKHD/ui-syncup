import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  integer,
  pgEnum,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { issues } from "./issues";
import { users } from "./users";

/**
 * Attachment review variant enum - categorizes the purpose of the attachment
 */
export const attachmentReviewVariantEnum = pgEnum("attachment_review_variant", [
  "as_is",
  "to_be",
  "reference",
]);

/**
 * Issue attachments table - stores files attached to issues
 *
 * Each attachment belongs to an issue and contains:
 * - File metadata (name, size, type, dimensions)
 * - Storage URLs (main file and optional thumbnail)
 * - Review variant for categorization
 * - JSONB annotations array for visual feedback
 * - Reference to the uploader
 *
 * File size is constrained to max 10MB per file.
 */
export const issueAttachments = pgTable(
  "issue_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size").notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    width: integer("width"),
    height: integer("height"),
    reviewVariant: attachmentReviewVariantEnum("review_variant").default("as_is"),
    annotations: jsonb("annotations").default(sql`'[]'::jsonb`),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Index for efficient queries by issue
    issueIdIdx: index("issue_attachments_issue_id_idx").on(table.issueId),
    // Check constraint for max 10MB file size
    fileSizeCheck: check(
      "issue_attachments_file_size_check",
      sql`${table.fileSize} > 0 AND ${table.fileSize} <= 10485760`
    ),
  })
);

/**
 * Type inference for IssueAttachment select operations
 */
export type IssueAttachment = typeof issueAttachments.$inferSelect;

/**
 * Type inference for IssueAttachment insert operations
 */
export type NewIssueAttachment = typeof issueAttachments.$inferInsert;
