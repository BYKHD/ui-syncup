/**
 * Issue Service
 *
 * Core business logic for issue operations including CRUD, auto-incrementing
 * issue numbers, and activity logging.
 */

import { db } from "@/lib/db";
import { issues } from "@/server/db/schema/issues";
import { issueAttachments } from "@/server/db/schema/issue-attachments";
import { users } from "@/server/db/schema/users";
import { projects } from "@/server/db/schema/projects";
import { teams } from "@/server/db/schema/teams";
import { eq, and, or, like, desc, count, max } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { logActivity } from "./activity-service";
import { createNotification, buildTargetUrl } from "@/server/notifications";
import type {
  Issue,
  IssueWithDetails,
  ListIssuesParams,
  IssueListResult,
  CreateIssueData,
  UpdateIssueData,
  FieldChange,
} from "./types";

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get an issue by ID with related user information
 *
 * @param issueId - Issue UUID
 * @returns Issue with details or null if not found
 */
export async function getIssueById(
  issueId: string
): Promise<IssueWithDetails | null> {
  // Fetch issue
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
  });

  if (!issue) {
    return null;
  }

  // Fetch reporter (required)
  const reporter = await db.query.users.findFirst({
    where: eq(users.id, issue.reporterId),
    columns: { id: true, name: true, email: true, image: true },
  });

  if (!reporter) {
    // This shouldn't happen due to FK constraints, but handle gracefully
    return null;
  }

  // Fetch assignee (optional)
  let assignee: IssueWithDetails["assignee"] = null;
  if (issue.assigneeId) {
    const assigneeUser = await db.query.users.findFirst({
      where: eq(users.id, issue.assigneeId),
      columns: { id: true, name: true, email: true, image: true },
    });
    if (assigneeUser) {
      assignee = {
        id: assigneeUser.id,
        name: assigneeUser.name,
        email: assigneeUser.email,
        avatarUrl: assigneeUser.image,
      };
    }
  }

  // Get attachment count
  const attachmentCountResult = await db
    .select({ count: count() })
    .from(issueAttachments)
    .where(eq(issueAttachments.issueId, issueId));

  return {
    ...issue,
    assignee,
    reporter: {
      id: reporter.id,
      name: reporter.name,
      email: reporter.email,
      avatarUrl: reporter.image,
    },
    attachmentCount: attachmentCountResult[0]?.count ?? 0,
  };
}

/**
 * Get an issue by its key (e.g., "PRJ-123")
 *
 * @param projectId - Project UUID
 * @param issueKey - Issue key string
 * @returns Issue with details or null if not found
 */
export async function getIssueByKey(
  projectId: string,
  issueKey: string
): Promise<IssueWithDetails | null> {
  const issue = await db.query.issues.findFirst({
    where: and(eq(issues.projectId, projectId), eq(issues.issueKey, issueKey)),
  });

  if (!issue) {
    return null;
  }

  return getIssueById(issue.id);
}

/**
 * Get an issue by its key only (e.g., "PRJ-123") without projectId
 *
 * Useful for direct issue key lookups where projectId is not available,
 * such as from URL routes like /issue/[issueKey].
 *
 * @param issueKey - Issue key string (e.g., "PRJ-123")
 * @returns Issue with details or null if not found
 */
export async function getIssueByKeyOnly(
  issueKey: string
): Promise<IssueWithDetails | null> {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.issueKey, issueKey),
  });

  if (!issue) {
    return null;
  }

  return getIssueById(issue.id);
}

/**
 * List issues with filtering and pagination
 *
 * @param params - List parameters including filters and pagination
 * @returns Paginated list of issues with details
 */
export async function getIssuesByProject(
  params: ListIssuesParams
): Promise<IssueListResult> {
  const {
    projectId,
    status,
    type,
    priority,
    assigneeId,
    search,
    page = 1,
    limit = 20,
  } = params;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [eq(issues.projectId, projectId)];

  if (status) {
    conditions.push(eq(issues.status, status));
  }

  if (type) {
    conditions.push(eq(issues.type, type));
  }

  if (priority) {
    conditions.push(eq(issues.priority, priority));
  }

  if (assigneeId) {
    conditions.push(eq(issues.assigneeId, assigneeId));
  }

  if (search) {
    conditions.push(
      or(
        like(issues.title, `%${search}%`),
        like(issues.issueKey, `%${search}%`),
        like(issues.description, `%${search}%`)
      )!
    );
  }

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(issues)
    .where(and(...conditions));

  const total = totalResult[0]?.count ?? 0;

  // Fetch issues with pagination
  const issueRows = await db
    .select()
    .from(issues)
    .where(and(...conditions))
    .orderBy(desc(issues.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch details for each issue
  const items = await Promise.all(
    issueRows.map(async (issue) => {
      const details = await getIssueById(issue.id);
      return details!;
    })
  );

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new issue with auto-incrementing issue_number
 *
 * Uses a transaction to ensure atomic issue_number generation.
 * Issue key is generated as `{PROJECT_KEY}-{issue_number}`.
 *
 * @param data - Issue creation data
 * @returns Created issue
 * @throws Error if project not found or validation fails
 */
export async function createIssue(data: CreateIssueData): Promise<Issue> {
  const {
    projectId,
    reporterId,
    title,
    description,
    type = "bug",
    priority = "medium",
    status = "open",
    assigneeId,
    coverImageUrl,
    page,
    figmaLink,
    jiraLink,
  } = data;

  // Validate title
  if (!title || title.trim().length === 0) {
    throw new Error("Issue title is required");
  }

  if (title.length > 255) {
    throw new Error("Issue title must be 255 characters or less");
  }

  // Get project key and teamId for issue creation
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { key: true, teamId: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Create issue with atomic issue_number increment
  const result = await db.transaction(async (tx) => {
    // Get max issue_number for this project
    const maxResult = await tx
      .select({ maxNumber: max(issues.issueNumber) })
      .from(issues)
      .where(eq(issues.projectId, projectId));

    const nextNumber = (maxResult[0]?.maxNumber ?? 0) + 1;
    const issueKey = `${project.key}-${nextNumber}`;

    // Insert issue with denormalized teamId for multi-tenant queries
    const [newIssue] = await tx
      .insert(issues)
      .values({
        teamId: project.teamId, // Denormalized for performance
        projectId,
        reporterId,
        issueKey,
        issueNumber: nextNumber,
        title: title.trim(),
        description: description ?? null,
        type,
        priority,
        status,
        assigneeId: assigneeId ?? null,
        coverImageUrl: coverImageUrl ?? null,
        page: page ?? null,
        figmaLink: figmaLink ?? null,
        jiraLink: jiraLink ?? null,
        createdBy: reporterId, // Audit field
      })
      .returning();

    return newIssue;
  });

  // Log activity with denormalized fields for performance
  await logActivity({
    issueId: result.id,
    teamId: project.teamId,
    projectId,
    actorId: reporterId,
    type: "created",
  });

  logger.info("issue.created", {
    issueId: result.id,
    projectId,
    issueKey: result.issueKey,
    reporterId,
  });

  return result as Issue;
}

/**
 * Update an issue with field-level changes
 *
 * Logs activity for each field that changed.
 *
 * @param issueId - Issue UUID
 * @param data - Update data
 * @param actorId - User making the update
 * @returns Updated issue
 * @throws Error if issue not found
 */
export async function updateIssue(
  issueId: string,
  data: UpdateIssueData,
  actorId: string
): Promise<Issue> {
  // Get current issue for change tracking
  const currentIssue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
  });

  if (!currentIssue) {
    throw new Error("Issue not found");
  }

  // Build update object and track changes
  const updates: Partial<Issue> = {
    updatedAt: new Date(),
    updatedBy: actorId, // Audit: track who updated
  };
  const changes: FieldChange[] = [];

  if (data.title !== undefined && data.title !== currentIssue.title) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Issue title is required");
    }
    updates.title = data.title.trim();
    changes.push({ field: "title", from: currentIssue.title, to: updates.title });
  }

  if (data.description !== undefined && data.description !== currentIssue.description) {
    updates.description = data.description;
    changes.push({ field: "description", from: currentIssue.description, to: data.description });
  }

  if (data.type !== undefined && data.type !== currentIssue.type) {
    updates.type = data.type;
    changes.push({ field: "type", from: currentIssue.type, to: data.type });
  }

  if (data.priority !== undefined && data.priority !== currentIssue.priority) {
    updates.priority = data.priority;
    changes.push({ field: "priority", from: currentIssue.priority, to: data.priority });
  }

  if (data.status !== undefined && data.status !== currentIssue.status) {
    updates.status = data.status;
    changes.push({ field: "status", from: currentIssue.status, to: data.status });
  }

  if (data.assigneeId !== undefined && data.assigneeId !== currentIssue.assigneeId) {
    updates.assigneeId = data.assigneeId;
    changes.push({ field: "assigneeId", from: currentIssue.assigneeId, to: data.assigneeId });
  }

  if (data.coverImageUrl !== undefined && data.coverImageUrl !== currentIssue.coverImageUrl) {
    updates.coverImageUrl = data.coverImageUrl;
  }

  if (data.page !== undefined && data.page !== currentIssue.page) {
    updates.page = data.page;
  }

  if (data.figmaLink !== undefined && data.figmaLink !== currentIssue.figmaLink) {
    updates.figmaLink = data.figmaLink;
  }

  if (data.jiraLink !== undefined && data.jiraLink !== currentIssue.jiraLink) {
    updates.jiraLink = data.jiraLink;
  }

  // Only update if there are changes
  if (Object.keys(updates).length === 1) {
    // Only updatedAt, no actual changes
    return currentIssue as Issue;
  }

  // Update issue
  const [updated] = await db
    .update(issues)
    .set(updates)
    .where(eq(issues.id, issueId))
    .returning();

  // Log activities for tracked changes
  for (const change of changes) {
    const activityType = `${change.field}_changed` as
      | "status_changed"
      | "priority_changed"
      | "type_changed"
      | "title_changed"
      | "description_changed"
      | "assignee_changed";

    await logActivity({
      issueId,
      teamId: currentIssue.teamId,
      projectId: currentIssue.projectId,
      actorId,
      type: activityType,
      changes: [change],
    });
  }

  // Fire-and-forget notifications for assignment and status changes
  try {
    // Get project and team details for notification metadata
    const projectData = await db
      .select({
        projectKey: projects.key,
        projectName: projects.name,
        teamSlug: teams.slug,
      })
      .from(projects)
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .where(eq(projects.id, currentIssue.projectId))
      .limit(1);

    const project = projectData[0];

    if (project) {
      // Notification for assignment change
      const assigneeChange = changes.find((c) => c.field === "assigneeId");
      if (assigneeChange && assigneeChange.to) {
        await createNotification({
          recipientId: assigneeChange.to as string,
          actorId,
          type: "issue_assigned",
          entityType: "issue",
          entityId: issueId,
          metadata: {
            target_url: buildTargetUrl("issue_assigned", {
              team_slug: project.teamSlug,
              project_key: project.projectKey,
              issue_key: currentIssue.issueKey,
            }),
            issue_title: updated.title,
            issue_key: currentIssue.issueKey,
            project_name: project.projectName,
            project_key: project.projectKey,
            team_slug: project.teamSlug,
          },
        });
      }

      // Notification for status change (notify assignee and reporter)
      const statusChange = changes.find((c) => c.field === "status");
      if (statusChange) {
        const recipients = [
          currentIssue.assigneeId,
          currentIssue.reporterId,
        ].filter((id): id is string => id !== null && id !== actorId);

        for (const recipientId of recipients) {
          await createNotification({
            recipientId,
            actorId,
            type: "issue_status_changed",
            entityType: "issue",
            entityId: issueId,
            metadata: {
              target_url: buildTargetUrl("issue_status_changed", {
                team_slug: project.teamSlug,
                project_key: project.projectKey,
                issue_key: currentIssue.issueKey,
              }),
              issue_title: updated.title,
              issue_key: currentIssue.issueKey,
              project_name: project.projectName,
              project_key: project.projectKey,
              team_slug: project.teamSlug,
              old_status: statusChange.from as string,
              new_status: statusChange.to as string,
            },
          });
        }
      }
    }
  } catch (notificationError) {
    // Fire-and-forget: Log error but don't block
    logger.error("Failed to create issue notifications", {
      issueId,
      error: notificationError instanceof Error ? notificationError.message : "Unknown error",
    });
  }

  logger.info("issue.updated", {
    issueId,
    actorId,
    changedFields: changes.map((c) => c.field),
  });

  return updated as Issue;
}

/**
 * Delete an issue (hard delete with cascade)
 *
 * Per design decision in BACKEND_ARCHITECTURE.md, issues use hard delete.
 * Attachments and activities are cascade deleted via FK constraints.
 *
 * @param issueId - Issue UUID
 * @param actorId - User performing the deletion
 * @throws Error if issue not found
 */
export async function deleteIssue(
  issueId: string,
  actorId: string
): Promise<void> {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { id: true, projectId: true, issueKey: true },
  });

  if (!issue) {
    throw new Error("Issue not found");
  }

  // Delete issue (cascade deletes attachments and activities)
  await db.delete(issues).where(eq(issues.id, issueId));

  logger.info("issue.deleted", {
    issueId,
    projectId: issue.projectId,
    issueKey: issue.issueKey,
    actorId,
  });
}
