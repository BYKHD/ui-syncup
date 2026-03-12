/**
 * Audit Service
 * @description Structured audit logging for admin actions
 * @requirements Requirement 10.6 - Log admin configuration changes
 */

import { createHash, randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import type {
  AdminAuditEventType,
  AdminAuditEvent,
  AdminAuditContext,
} from './types';

/**
 * Hash email for PII protection in logs
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
}

/**
 * Log an admin action with structured format.
 * 
 * This function creates a structured audit event and logs it as JSON
 * for easy parsing by log aggregation tools.
 * 
 * @param eventType - The type of admin action
 * @param context - Context including userId, changes, and metadata
 * 
 * @example
 * ```ts
 * logAdminAction('instance.settings.updated', {
 *   userId: session.id,
 *   userEmail: session.email,
 *   resourceType: 'instance',
 *   changes: [
 *     { field: 'instanceName', before: 'Old Name', after: 'New Name' },
 *   ],
 * });
 * ```
 */
export function logAdminAction(
  eventType: AdminAuditEventType,
  context: AdminAuditContext
): void {
  const event: AdminAuditEvent = {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    userEmail: context.userEmail ? hashEmail(context.userEmail) : undefined,
    resourceType: context.resourceType,
    resourceId: context.resourceId,
    changes: context.changes,
    metadata: context.metadata,
  };

  // Log as structured JSON for log aggregation tools
  logger.info('[AUDIT]', JSON.stringify(event));
}

/**
 * Helper to create a change record
 */
export function createChange<T>(
  field: string,
  before: T | undefined,
  after: T | undefined
): { field: string; before?: T; after?: T } | null {
  // Only create change if values are different
  if (before === after) {
    return null;
  }
  return { field, before, after };
}

/**
 * Helper to filter out null changes
 */
export function filterChanges<T extends { field: string }>(
  changes: (T | null)[]
): T[] {
  return changes.filter((c): c is T => c !== null);
}
