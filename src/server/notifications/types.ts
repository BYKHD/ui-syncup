/**
 * Notification Types and DTOs
 *
 * Domain types for the notification system following the design specification.
 * These types are used by the notification service layer and API endpoints.
 */

import { z } from "zod";

// ============================================================================
// Notification Type Literals
// ============================================================================

/**
 * Notification type literals matching the database enum
 *
 * Categories:
 * - Collaboration: mention, comment_created, reply
 * - Workflow: issue_assigned, issue_status_changed
 * - System/Access: project_invitation, team_invitation, role_updated
 */
export type NotificationType =
  | "mention"
  | "comment_created"
  | "reply"
  | "issue_assigned"
  | "issue_status_changed"
  | "project_invitation"
  | "team_invitation"
  | "role_updated";

/**
 * All valid notification types as a constant array
 */
export const NOTIFICATION_TYPES = [
  "mention",
  "comment_created",
  "reply",
  "issue_assigned",
  "issue_status_changed",
  "project_invitation",
  "team_invitation",
  "role_updated",
] as const;

/**
 * Entity type literals for polymorphic relation
 */
export type EntityType = "issue" | "project" | "comment" | "team";

/**
 * All valid entity types as a constant array
 */
export const ENTITY_TYPES = ["issue", "project", "comment", "team"] as const;

// ============================================================================
// Metadata Structures
// ============================================================================

/**
 * Metadata structure stored in JSONB column
 * Contains denormalized data for rendering without extra fetches
 *
 * The target_url field is required and contains the deep-link URL for navigation.
 * Other fields are optional and depend on the notification type.
 */
export interface NotificationMetadata {
  // Deep-link URL for navigation (required)
  target_url: string;

  // Issue-related metadata
  issue_title?: string;
  issue_key?: string;

  // Comment-related metadata
  comment_preview?: string;
  comment_id?: string; // For scroll-to-comment anchor

  // Project-related metadata
  project_name?: string;
  project_key?: string;

  // Team-related metadata
  team_name?: string;
  team_slug?: string;

  // Role change metadata
  old_role?: string;
  new_role?: string;

  // Status change metadata
  old_status?: string;
  new_status?: string;

  // Invitation metadata
  invitation_id?: string; // For Accept/Decline actions

  // Actor information (denormalized for display)
  actor_name?: string;
  actor_avatar_url?: string;
}

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Full notification object returned from queries
 */
export interface Notification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  metadata: NotificationMetadata;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * DTO for creating a new notification
 */
export interface CreateNotificationDTO {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  metadata: NotificationMetadata;
}

/**
 * Grouped notifications for UI display
 * Groups by (type, entity_type, entity_id) within time window
 */
export interface NotificationGroup {
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  notifications: Notification[];
  latestAt: Date;
  actorNames: string[]; // "User A and 3 others"
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Options for paginated notification queries
 */
export interface NotificationQueryOptions {
  limit?: number;
  cursor?: string; // ISO timestamp for cursor-based pagination
  unreadOnly?: boolean;
}

/**
 * Paginated notification response
 */
export interface PaginatedNotifications {
  notifications: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
  totalUnread: number;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Zod schema for notification type enum
 */
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

/**
 * Zod schema for entity type enum
 */
export const EntityTypeSchema = z.enum(["issue", "project", "comment", "team"]);

/**
 * Zod schema for notification metadata
 */
export const NotificationMetadataSchema = z.object({
  target_url: z.string().min(1),
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

/**
 * Zod schema for creating a notification
 */
export const CreateNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  type: NotificationTypeSchema,
  entityType: EntityTypeSchema,
  entityId: z.string().uuid(),
  metadata: NotificationMetadataSchema,
});

/**
 * Zod schema for notification query options
 */
export const NotificationQueryOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().datetime().optional(),
  unreadOnly: z.boolean().optional().default(false),
});
