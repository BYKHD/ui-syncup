/**
 * Issue Configuration - Barrel Export
 *
 * Single source of truth for issue-related configuration.
 * Re-exports all issue config for clean imports.
 */

// Options (types, priorities, statuses, attachments)
export * from './options';

// Workflow (status transitions)
export * from './workflow';
