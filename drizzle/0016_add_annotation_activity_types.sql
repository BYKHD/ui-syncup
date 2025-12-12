-- Migration: Add annotation activity types to issue_activity_type enum
-- Task: 8.1 - Extend activity service for annotation events
-- Requirements: 7.1, 7.2, 7.3, 12.1, 12.2, 12.3, 12.4

-- Add new annotation activity types to the enum
ALTER TYPE issue_activity_type ADD VALUE IF NOT EXISTS 'annotation_created';
ALTER TYPE issue_activity_type ADD VALUE IF NOT EXISTS 'annotation_updated';
ALTER TYPE issue_activity_type ADD VALUE IF NOT EXISTS 'annotation_commented';
ALTER TYPE issue_activity_type ADD VALUE IF NOT EXISTS 'annotation_deleted';
