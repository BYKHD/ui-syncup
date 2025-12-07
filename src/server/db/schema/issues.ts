import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

/**
 * Issue type enum - categorizes the nature of the issue
 */
export const issueTypeEnum = pgEnum("issue_type", [
  "bug",
  "visual",
  "accessibility",
  "content",
  "other",
]);

/**
 * Issue priority enum - indicates urgency level
 */
export const issuePriorityEnum = pgEnum("issue_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

/**
 * Issue status enum - workflow state
 */
export const issueStatusEnum = pgEnum("issue_status", [
  "open",
  "in_progress",
  "in_review",
  "resolved",
  "archived",
]);

/**
 * Issues table - stores UI/UX issues for tracking feedback
 * 
 * Each issue belongs to a project and has:
 * - A unique issue_key (e.g., "PRJ-123") within the project
 * - An auto-incrementing issue_number per project
 * - Type, priority, and status for categorization and workflow
 * - Optional assignee and required reporter
 * - Optional links to external tools (Figma, Jira)
 */
export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    issueKey: varchar("issue_key", { length: 50 }).notNull(),
    issueNumber: integer("issue_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    type: issueTypeEnum("type").notNull().default("bug"),
    priority: issuePriorityEnum("priority").notNull().default("medium"),
    status: issueStatusEnum("status").notNull().default("open"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coverImageUrl: text("cover_image_url"),
    page: varchar("page", { length: 255 }),
    figmaLink: text("figma_link"),
    jiraLink: text("jira_link"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Indexes for common queries
    projectIdIdx: index("issues_project_id_idx").on(table.projectId),
    statusIdx: index("issues_status_idx").on(table.status),
    assigneeIdIdx: index("issues_assignee_id_idx").on(table.assigneeId),
    // Composite index for filtering by project and status
    projectStatusIdx: index("issues_project_status_idx").on(
      table.projectId,
      table.status
    ),
    // Unique constraints
    projectIssueNumberUnique: uniqueIndex("issues_project_issue_number_unique").on(
      table.projectId,
      table.issueNumber
    ),
    projectIssueKeyUnique: uniqueIndex("issues_project_issue_key_unique").on(
      table.projectId,
      table.issueKey
    ),
  })
);

/**
 * Type inference for Issue select operations
 */
export type Issue = typeof issues.$inferSelect;

/**
 * Type inference for Issue insert operations
 */
export type NewIssue = typeof issues.$inferInsert;
