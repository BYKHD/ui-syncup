/**
 * Audit Service Types
 * @description Types for admin action audit logging
 * @requirements Requirement 10.6 - Log admin configuration changes
 */

/**
 * Admin audit event types
 */
export type AdminAuditEventType =
  // Instance settings
  | 'instance.settings.updated'
  | 'instance.settings.exported'
  | 'instance.settings.imported'
  // Member management
  | 'member.invited'
  | 'member.invitation.accepted'
  | 'member.invitation.revoked'
  | 'member.removed'
  | 'member.role.changed'
  // Team management
  | 'team.created'
  | 'team.updated'
  | 'team.deleted';

/**
 * Change record showing before and after values
 */
export interface AuditFieldChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Structured admin audit event
 */
export interface AdminAuditEvent {
  /** Unique event identifier */
  eventId: string;
  /** Type of admin action */
  eventType: AdminAuditEventType;
  /** ISO timestamp */
  timestamp: string;
  /** User who performed the action */
  userId: string;
  /** Optional user email (hashed for PII protection) */
  userEmail?: string;
  /** Resource type affected (e.g., 'instance', 'member', 'team') */
  resourceType?: string;
  /** Resource identifier */
  resourceId?: string;
  /** List of field changes with before/after values */
  changes?: AuditFieldChange[];
  /** Additional context metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Context passed to logAdminAction
 */
export interface AdminAuditContext {
  /** User who performed the action */
  userId: string;
  /** Optional user email (will be hashed) */
  userEmail?: string;
  /** Resource type affected */
  resourceType?: string;
  /** Resource identifier */
  resourceId?: string;
  /** Field changes with before/after values */
  changes?: AuditFieldChange[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
