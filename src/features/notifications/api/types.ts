/**
 * NOTIFICATION API DTOs & SCHEMAS
 * Zod validation schemas for all notification API request/response payloads
 */

import { z } from "zod";

// ============================================================================
// SHARED SCHEMAS (re-exported from server types for consistency)
// ============================================================================

export const NotificationTypeSchema = z.enum([
  "mention",
  "comment_created",
  "reply",
  "issue_assigned",
  "issue_status_changed",
  "project_invitation",
  "team_invitation",
  "role_updated",
]);

export const EntityTypeSchema = z.enum(["issue", "project", "comment", "team"]);

// ============================================================================
// METADATA SCHEMA
// ============================================================================

export const NotificationMetadataSchema = z.object({
  target_url: z.string(),
  issue_title: z.string().optional(),
  issue_key: z.string().optional(),
  comment_preview: z.string().optional(),
  comment_id: z.string().optional(),
  project_name: z.string().optional(),
  project_key: z.string().optional(),
  team_name: z.string().optional(),
  team_slug: z.string().optional(),
  old_role: z.string().optional(),
  new_role: z.string().optional(),
  old_status: z.string().optional(),
  new_status: z.string().optional(),
  invitation_id: z.string().optional(),
  actor_name: z.string().optional(),
  actor_avatar_url: z.string().optional(),
});

// ============================================================================
// NOTIFICATION SCHEMA
// ============================================================================

export const NotificationSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  actorId: z.string().nullable(),
  type: NotificationTypeSchema,
  entityType: EntityTypeSchema,
  entityId: z.string(),
  metadata: NotificationMetadataSchema,
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const GetNotificationsParamsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  unreadOnly: z.boolean().default(false),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const GetNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  totalUnread: z.number(),
});

export const GetUnreadCountResponseSchema = z.object({
  count: z.number(),
});

export const MarkAsReadResponseSchema = z.object({
  success: z.boolean(),
});

export const MarkAllAsReadResponseSchema = z.object({
  updated: z.number(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type NotificationMetadata = z.infer<typeof NotificationMetadataSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type GetNotificationsParams = z.infer<typeof GetNotificationsParamsSchema>;
export type GetNotificationsResponse = z.infer<typeof GetNotificationsResponseSchema>;
export type GetUnreadCountResponse = z.infer<typeof GetUnreadCountResponseSchema>;
export type MarkAsReadResponse = z.infer<typeof MarkAsReadResponseSchema>;
export type MarkAllAsReadResponse = z.infer<typeof MarkAllAsReadResponseSchema>;
