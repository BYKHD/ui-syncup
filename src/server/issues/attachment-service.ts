/**
 * Attachment Service
 *
 * Manages issue attachments including file storage with R2 integration
 * and size limit enforcement.
 */

import { db } from "@/lib/db";
import { issueAttachments } from "@/server/db/schema/issue-attachments";
import { users } from "@/server/db/schema/users";
import { eq, sum, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ATTACHMENT_LIMITS } from "@/features/issues/config";
import { logAttachmentActivity } from "./activity-service";
import type {
  IssueAttachment,
  AttachmentWithUploader,
  CreateAttachmentData,
} from "./types";

// ============================================================================
// CONSTANTS (re-exported from config for backward compatibility)
// ============================================================================

/**
 * Maximum file size per attachment: 10MB
 */
export const MAX_FILE_SIZE = ATTACHMENT_LIMITS.MAX_FILE_SIZE;

/**
 * Maximum total attachment size per issue: 50MB
 */
export const MAX_TOTAL_SIZE_PER_ISSUE = ATTACHMENT_LIMITS.MAX_TOTAL_SIZE_PER_ISSUE;

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all attachments for an issue with uploader information
 *
 * @param issueId - Issue UUID
 * @returns List of attachments with uploader details
 */
export async function getAttachmentsByIssue(
  issueId: string
): Promise<AttachmentWithUploader[]> {
  const rows = await db
    .select({
      attachment: issueAttachments,
      uploadedBy: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      },
    })
    .from(issueAttachments)
    .innerJoin(users, eq(issueAttachments.uploadedById, users.id))
    .where(eq(issueAttachments.issueId, issueId));

  return rows.map((row) => ({
    ...row.attachment,
    uploadedBy: row.uploadedBy,
  }));
}

/**
 * Get a single attachment by ID with uploader information
 *
 * @param attachmentId - Attachment UUID
 * @returns Attachment with uploader or null if not found
 */
export async function getAttachment(
  attachmentId: string
): Promise<AttachmentWithUploader | null> {
  const rows = await db
    .select({
      attachment: issueAttachments,
      uploadedBy: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      },
    })
    .from(issueAttachments)
    .innerJoin(users, eq(issueAttachments.uploadedById, users.id))
    .where(eq(issueAttachments.id, attachmentId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...row.attachment,
    uploadedBy: row.uploadedBy,
  };
}

/**
 * Get total attachment size for an issue
 *
 * @param issueId - Issue UUID
 * @returns Total bytes of all attachments
 */
export async function getTotalAttachmentSize(issueId: string): Promise<number> {
  const result = await db
    .select({ total: sum(issueAttachments.fileSize) })
    .from(issueAttachments)
    .where(eq(issueAttachments.issueId, issueId));

  return Number(result[0]?.total ?? 0);
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create an attachment record
 *
 * Validates file size limits before creating the record.
 * Note: Actual R2 upload should happen before calling this function.
 *
 * @param data - Attachment creation data
 * @param actorId - User creating the attachment (for activity logging)
 * @returns Created attachment
 * @throws Error if size limits exceeded
 */
export async function createAttachment(
  data: CreateAttachmentData,
  actorId: string
): Promise<IssueAttachment> {
  const {
    teamId,
    projectId,
    issueId,
    uploadedById,
    fileName,
    fileSize,
    fileType,
    url,
    thumbnailUrl,
    width,
    height,
    reviewVariant,
    annotations,
  } = data;

  // Validate file size (schema also enforces this)
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(
      `File size ${formatBytes(fileSize)} exceeds maximum of ${formatBytes(MAX_FILE_SIZE)}`
    );
  }

  if (fileSize <= 0) {
    throw new Error("File size must be greater than 0");
  }

  // Check total size limit for the issue
  const currentTotal = await getTotalAttachmentSize(issueId);
  if (currentTotal + fileSize > MAX_TOTAL_SIZE_PER_ISSUE) {
    throw new Error(
      `Adding this file would exceed the ${formatBytes(MAX_TOTAL_SIZE_PER_ISSUE)} limit per issue. ` +
        `Current usage: ${formatBytes(currentTotal)}`
    );
  }

  // Create attachment record with denormalized tenant fields
  const [attachment] = await db
    .insert(issueAttachments)
    .values({
      teamId, // Denormalized for multi-tenant queries
      projectId, // Denormalized for multi-tenant queries
      issueId,
      uploadedById,
      fileName,
      fileSize,
      fileType,
      url,
      thumbnailUrl: thumbnailUrl ?? null,
      width: width ?? null,
      height: height ?? null,
      reviewVariant: reviewVariant ?? "as_is",
      annotations: annotations ?? sql`'[]'::jsonb`,
    })
    .returning();

  // Log activity with denormalized fields
  await logAttachmentActivity(teamId, projectId, issueId, actorId, "added", {
    id: attachment.id,
    fileName,
  });

  logger.info("issue.attachment.created", {
    attachmentId: attachment.id,
    issueId,
    fileName,
    fileSize,
    uploadedById,
  });

  return attachment as IssueAttachment;
}

/**
 * Delete an attachment record
 *
 * Note: R2 cleanup should happen after this function succeeds.
 *
 * @param attachmentId - Attachment UUID
 * @param actorId - User deleting the attachment (for activity logging)
 * @throws Error if attachment not found
 */
export async function deleteAttachment(
  attachmentId: string,
  actorId: string
): Promise<void> {
  // Get attachment for logging before deletion (including tenant fields)
  const attachment = await db.query.issueAttachments.findFirst({
    where: eq(issueAttachments.id, attachmentId),
    columns: { id: true, teamId: true, projectId: true, issueId: true, fileName: true, url: true },
  });

  if (!attachment) {
    throw new Error("Attachment not found");
  }

  // Delete record
  await db.delete(issueAttachments).where(eq(issueAttachments.id, attachmentId));

  // Log activity with denormalized fields
  await logAttachmentActivity(
    attachment.teamId,
    attachment.projectId,
    attachment.issueId,
    actorId,
    "removed",
    {
      id: attachment.id,
      fileName: attachment.fileName,
    }
  );

  logger.info("issue.attachment.deleted", {
    attachmentId,
    issueId: attachment.issueId,
    fileName: attachment.fileName,
    actorId,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate R2 storage path for an attachment
 *
 * Path format: issues/{teamId}/{projectId}/{issueId}/{uuid}-{filename}
 * Note: The bucket is ui-syncup-attachments
 *
 * @param teamId - Team UUID (for path hierarchy)
 * @param projectId - Project UUID (for path hierarchy)
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param fileName - Original file name
 * @returns R2 storage key
 */
export function generateR2Path(
  teamId: string,
  projectId: string,
  issueId: string,
  attachmentId: string,
  fileName: string
): string {
  // Sanitize filename (remove path separators, limit length)
  const sanitizedName = fileName
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);

  return `issues/${teamId}/${projectId}/${issueId}/${attachmentId}-${sanitizedName}`;
}

/**
 * Check if a file type is an image
 *
 * @param fileType - MIME type string
 * @returns True if the file type is an image
 */
export function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}
