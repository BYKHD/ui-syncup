# Implementation Plan

## Phase 0: Issues Core Infrastructure (Prerequisites)

> **Note:** The Issues feature currently has ready-to-wire UI with mock data. This phase creates the backend infrastructure required before annotation integration.

- [x] 0. Create Issues database schema
  - [x] 0.1 Create Drizzle migration for issues table
    - Add `issues` table with columns: id, project_id, issue_key, issue_number, title, description, type, priority, status, assignee_id, reporter_id, cover_image_url, page, figma_link, jira_link, created_at, updated_at
    - Add unique constraints on (project_id, issue_number) and (project_id, issue_key)
    - Add indexes on project_id, status, assignee_id
    - _Prerequisite for annotation integration_
  - [x] 0.2 Create Drizzle migration for issue_attachments table
    - Add `issue_attachments` table with columns: id, issue_id, file_name, file_size, file_type, url, thumbnail_url, width, height, review_variant, annotations (JSONB), uploaded_by_id, created_at
    - Add file size constraint (max 10MB)
    - Add index on issue_id
    - _Prerequisite for annotation integration_
  - [x] 0.3 Create Drizzle migration for issue_activities table
    - Add `issue_activities` table with columns: id, issue_id, actor_id, type, changes (JSONB), comment, created_at
    - Add indexes on issue_id and created_at
    - _Prerequisite for annotation integration_
  - [x] 0.4 Create Drizzle schema definitions in src/server/db/schema
    - Define issues schema in `src/server/db/schema/issues.ts`
    - Define issueAttachments schema in `src/server/db/schema/issue-attachments.ts`
    - Define issueActivities schema in `src/server/db/schema/issue-activities.ts`
    - Export from schema index
    - _Prerequisite for annotation integration_

- [x] 1. Create Issues server services
  - [x] 1.1 Create issue service in src/server/issues/issue-service.ts
    - Implement getIssueById, getIssueByKey functions
    - Implement createIssue with auto-incrementing issue_number
    - Implement updateIssue with field-level updates
    - Implement deleteIssue with cascade
    - _Prerequisite for annotation integration_
  - [x] 1.2 Create attachment service in src/server/issues/attachment-service.ts
    - Implement getAttachmentsByIssue function
    - Implement createAttachment with R2 upload
    - Implement deleteAttachment with R2 cleanup
    - Enforce 10MB per file, 50MB total per issue limits
    - _Prerequisite for annotation integration_
  - [x] 1.3 Create activity service in src/server/issues/activity-service.ts
    - Implement logActivity function
    - Implement getActivitiesByIssue with pagination
    - Support all activity types (created, status_changed, etc.)
    - _Prerequisite for annotation integration_

- [x] 2. Create Issues API routes
  - [x] 2.1 Create GET/POST /api/projects/[projectId]/issues
    - List issues with filtering and pagination
    - Create new issue with validation
    - RBAC: PROJECT_VIEWER+ for GET, PROJECT_EDITOR+ for POST
    - _Prerequisite for annotation integration_
  - [x] 2.2 Create GET/PATCH/DELETE /api/issues/[issueId]
    - Get issue details with attachments
    - Update issue fields
    - Delete issue with cascade
    - RBAC: PROJECT_VIEWER+ for GET, PROJECT_DEVELOPER+ for PATCH, PROJECT_EDITOR+ for DELETE
    - _Prerequisite for annotation integration_
  - [x] 2.3 Create GET /api/issues/[issueId]/activities
    - Get paginated activities
    - RBAC: PROJECT_VIEWER+
    - _Prerequisite for annotation integration_
  - [x] 2.4 Create POST/DELETE /api/issues/[issueId]/attachments
    - Upload attachment with presigned URL
    - Delete attachment
    - RBAC: PROJECT_EDITOR+
    - _Prerequisite for annotation integration_

- [x] 3. Wire Issues UI to real API
  - [x] 3.1 Update useIssueDetails hook to use real API
    - Replace mock getIssueDetails with real endpoint
    - _Prerequisite for annotation integration_
  - [x] 3.2 Update useIssueActivities hook to use real API
    - Replace mock getIssueActivities with real endpoint
    - _Prerequisite for annotation integration_
  - [x] 3.3 Update useIssueUpdate hook to use real API
    - Replace mock updateIssue with real endpoint
    - _Prerequisite for annotation integration_
  - [x] 3.4 Update useIssueDelete hook to use real API
    - Replace mock deleteIssue with real endpoint
    - _Prerequisite for annotation integration_

- [ ]* 3.5 (Optional) Write property test for issue key generation
  - Test that issue keys follow `{PROJECT_KEY}-{NUMBER}` format
  - Test that issue_number auto-increments correctly per project
  - **Validates: Issue Key Design Decision**

- [ ]* 3.6 (Optional) Write property test for attachment size limits
  - Test that files > 10MB are rejected
  - Test that total > 50MB per issue is rejected
  - **Validates: Attachment Limits Design Decision**

- [ ]* 3.7 (Optional) Write property test for issue CRUD round-trip
  - Test that created issues can be fetched with identical data
  - Test that updated issues reflect changes correctly
  - **Validates: Data Integrity**

- [ ] 4. Checkpoint - Issues Core Complete
  - Ensure all tests pass, ask the user if questions arise.

## Phase 1: Annotation Database Extensions & Types

- [ ] 5. Extend database schema for annotation features
  - [ ] 5.1 Create Drizzle migration for annotation_read_status table
    - Add table with user_id, attachment_id, annotation_id, last_read_at columns
    - Add composite primary key and indexes
    - _Requirements: 3.5_
  - [ ] 5.2 Add constraint for max 50 annotations per attachment
    - Add CHECK constraint on issue_attachments.annotations JSONB array length
    - Add GIN index for efficient JSONB queries
    - _Requirements: 13.5_

- [ ] 6. Create and update TypeScript types and Zod schemas
  - [ ] 6.1 Create annotation API schemas in src/features/annotations/api/schemas.ts
    - Define PositionSchema, PinShapeSchema, BoxShapeSchema, AnnotationShapeSchema
    - Define CreateAnnotationSchema, UpdateAnnotationSchema
    - Define CreateCommentSchema, UpdateCommentSchema
    - _Requirements: 10.1, 10.2_
  - [ ] 6.2 Update annotation types for JSONB structure
    - Update AttachmentAnnotation type to include authorId instead of nested author
    - Add AnnotationComment type with authorId
    - _Requirements: 13.2_
  - [ ] 6.3 Create AnnotationPermissions interface
    - Define canView, canCreate, canEdit, canEditAll, canDelete, canDeleteAll, canComment
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ] 6.4 Extend ActivityType with annotation activity types
    - Add annotation_created, annotation_updated, annotation_commented, annotation_deleted
    - Define AnnotationActivityMetadata interface
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ]* 6.5 Write property test for Zod schema validation (Property 20)
  - Test coordinate bounds validation (0-1 range)
  - Test required field validation
  - **Validates: Requirements 10.1, 10.2**

## Phase 2: Annotation Server-Side Services

- [ ] 7. Create annotation service layer
  - [ ] 7.1 Create annotation service in src/server/annotations/annotation-service.ts
    - Implement getAnnotationsByAttachment function
    - Implement createAnnotation function with JSONB array append
    - Implement updateAnnotation function with JSONB path update
    - Implement deleteAnnotation function with JSONB array removal
    - Implement annotation count limit check (max 50)
    - _Requirements: 1.4, 2.1, 4.3, 4.5, 13.3, 13.5_
  - [ ] 7.2 Create comment service functions in annotation-service.ts
    - Implement addComment function
    - Implement updateComment function (author-only check)
    - Implement deleteComment function (author-only check)
    - _Requirements: 3.2, 11.1, 11.2, 11.3, 11.4_
  - [ ] 7.3 Create permission checking utilities
    - Implement checkAnnotationPermission function
    - Implement checkCommentPermission function
    - Map team/project roles to annotation permissions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ] 7.4 Create input sanitization utility
    - Implement sanitizeComment function using DOMPurify
    - Strip all HTML tags from user input
    - _Requirements: 10.3_

- [ ]* 7.5 Write property test for annotation persistence round-trip (Property 2)
  - Test that created annotations can be fetched with identical data
  - **Validates: Requirements 1.4, 4.5**

- [ ] 7.6 Write property test for XSS sanitization (Property 21)
  - Test that XSS payloads are sanitized from comments
  - **Validates: Requirements 10.3**

- [ ] 7.7 Write property test for annotation count limit (Property 28)
  - Test that 51st annotation is rejected
  - **Validates: Requirements 13.5**

- [ ] 8. Create activity logging for annotations
  - [ ] 8.1 Extend activity service for annotation events
    - Implement logAnnotationCreated function
    - Implement logAnnotationUpdated function with change details
    - Implement logAnnotationCommented function with preview
    - Implement logAnnotationDeleted function
    - _Requirements: 7.1, 7.2, 7.3, 12.1, 12.2, 12.3, 12.4_
  - [ ] 8.2 Add activity filtering by annotation types
    - Support filtering by annotation_created, annotation_updated, annotation_commented, annotation_deleted
    - _Requirements: 12.5_

- [ ]* 8.3 Write property test for activity timeline integration (Property 8)
  - Test that annotation operations create corresponding activity entries
  - **Validates: Requirements 3.3, 7.1, 7.2, 7.3, 7.4**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Annotation API Routes

- [ ] 10. Create annotation API routes
  - [ ] 10.1 Create POST /api/issues/[issueId]/attachments/[attachmentId]/annotations
    - Validate request body with CreateAnnotationSchema
    - Check user permissions
    - Create annotation via service
    - Log activity
    - Return created annotation with author info
    - _Requirements: 1.2, 1.3, 1.4, 7.1, 10.1, 10.2_
  - [ ] 10.2 Create GET /api/issues/[issueId]/attachments/[attachmentId]/annotations
    - Fetch all annotations for attachment
    - Include author information for each annotation
    - _Requirements: 2.1, 2.2_
  - [ ] 10.3 Create PATCH /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]
    - Validate request body with UpdateAnnotationSchema
    - Check user permissions (own vs all)
    - Update annotation via service
    - Log activity with changes
    - _Requirements: 4.1, 4.2, 4.5, 12.2_
  - [ ] 10.4 Create DELETE /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]
    - Check user permissions (own vs all)
    - Delete annotation and cascade comments
    - Log activity
    - _Requirements: 4.3, 4.4, 7.3, 12.3_

- [ ] 11. Create comment API routes
  - [ ] 11.1 Create POST /api/issues/.../annotations/[annotationId]/comments
    - Validate request body with CreateCommentSchema
    - Sanitize comment text
    - Add comment to annotation
    - Log activity
    - _Requirements: 3.2, 10.3, 11.1, 11.5, 12.4_
  - [ ] 11.2 Create PATCH /api/issues/.../annotations/[annotationId]/comments/[commentId]
    - Validate author ownership
    - Update comment text
    - _Requirements: 11.2, 11.4_
  - [ ] 11.3 Create DELETE /api/issues/.../annotations/[annotationId]/comments/[commentId]
    - Validate author ownership
    - Remove comment from annotation
    - Log activity
    - _Requirements: 11.3, 11.5_

- [ ]* 11.4 Write property test for comment edit round-trip (Property 22)
  - Test that edited comments preserve createdAt and update updatedAt
  - **Validates: Requirements 11.2, 11.4**

- [ ] 11.5 Write property test for comment delete authorization (Property 23)
  - Test that only comment authors can delete their comments
  - **Validates: Requirements 11.3**

- [ ] 12. Create read status API route
  - [ ] 12.1 Create POST /api/issues/.../annotations/[annotationId]/read
    - Update or insert read status for user
    - _Requirements: 3.5_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Client-Side Integration Hooks

- [ ] 14. Create annotation integration hooks
  - [ ] 14.1 Create useAnnotationIntegration hook
    - Integrate with useAnnotationsWithHistory
    - Add API persistence layer
    - Handle optimistic updates with rollback
    - Manage tool state and edit mode
    - _Requirements: 1.4, 1.5, 4.5, 5.1_
  - [ ] 14.2 Create useAnnotationComments hook
    - Fetch and cache comments
    - Handle add, update, delete mutations
    - Track unread status
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [ ] 14.3 Create useAnnotationPermissions hook
    - Derive permissions from user role
    - Return AnnotationPermissions object
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ]* 14.4 Write property test for history tracking (Property 11)
  - Test that all annotation actions create history entries
  - **Validates: Requirements 4.1, 4.2, 4.4, 5.1**

- [ ]* 14.5 Write property test for undo/redo round-trip (Property 13)
  - Test that undo restores previous state and redo reapplies
  - **Validates: Requirements 5.2, 5.3, 5.4**

## Phase 5: UI Component Integration

- [ ] 15. Create AnnotatedAttachmentView component
  - [ ] 15.1 Create AnnotatedAttachmentView wrapper component
    - Combine CenteredCanvasView with annotation capabilities
    - Wire useAnnotationIntegration hook
    - Pass permissions to child components
    - _Requirements: 1.1, 2.2_
  - [ ] 15.2 Integrate AnnotationToolbar with permissions
    - Show/hide tools based on permissions
    - Disable toolbar for TEAM_VIEWER role
    - _Requirements: 8.1, 8.5_
  - [ ] 15.3 Integrate AnnotationLayer with selection and permissions
    - Handle annotation selection
    - Show edit controls based on permissions
    - Display unread indicators
    - _Requirements: 2.3, 2.4, 3.5, 8.2, 8.3_

- [ ] 15.4 Write property test for role-based permission enforcement (Property 16)
  - Test that UI reflects correct permissions for each role
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 16. Create AnnotationThreadPanel component
  - [ ] 16.1 Create AnnotationThreadPanel component
    - Display comments in chronological order
    - Show author information and timestamps
    - Handle comment submission
    - _Requirements: 3.1, 3.4_
  - [ ] 16.2 Add mobile-optimized layout
    - Use drawer/sheet on mobile breakpoints
    - _Requirements: 9.4_

- [ ]* 16.3 Write property test for comment chronological ordering (Property 9)
  - Test that comments are displayed in ascending order by createdAt
  - **Validates: Requirements 3.4**

- [ ] 17. Integrate with Issue Details Screen
  - [ ] 17.1 Update IssueDetailsScreen to use AnnotatedAttachmentView
    - Replace current attachment view with annotated version
    - Pass issue and attachment data
    - _Requirements: 1.1_
  - [ ] 17.2 Add annotation activities to activity timeline
    - Display annotation activity entries with icons
    - Handle click to navigate to annotation
    - _Requirements: 7.4, 7.5_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Keyboard Shortcuts & History

- [ ] 19. Implement keyboard shortcuts
  - [ ] 19.1 Update useKeyboardShortcuts hook for annotation tools
    - Add 'E' for toggle edit mode
    - Add '1'/'C' for cursor tool
    - Add '2'/'P' for pin tool
    - Add '3'/'B' for box tool
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 19.2 Ensure toolbar reflects keyboard shortcut changes
    - Sync active tool state with toolbar display
    - _Requirements: 6.5_

- [ ]* 19.3 Write property test for keyboard shortcut toolbar sync (Property 15)
  - Test that toolbar reflects active tool after shortcut
  - **Validates: Requirements 6.5**

- [ ] 20. Implement history empty state handling
  - [ ] 20.1 Update AnnotationToolbar for empty history state
    - Disable undo button when history stack is empty
    - Disable redo button when redo stack is empty
    - _Requirements: 5.5_

- [ ]* 20.2 Write property test for history stack empty state (Property 14)
  - Test that undo/redo buttons are disabled when stacks are empty
  - **Validates: Requirements 5.5**

## Phase 7: Responsive & Touch Support

- [ ] 21. Implement responsive annotation scaling
  - [ ] 21.1 Ensure annotations use normalized coordinates (0-1)
    - Verify all annotation positions are stored as percentages
    - _Requirements: 9.1, 9.3_
  - [ ] 21.2 Update AnnotationLayer for viewport changes
    - Recalculate pixel positions on resize
    - Maintain relative positions on image
    - _Requirements: 9.3_

- [ ]* 21.3 Write property test for responsive annotation scaling (Property 17)
  - Test that normalized coordinates maintain relative position across viewport sizes
  - **Validates: Requirements 9.1, 9.3**

- [ ] 22. Implement touch gesture support
  - [ ] 22.1 Add touch event handlers to AnnotationCanvas
    - Support touch for pin creation
    - Support touch drag for box creation
    - _Requirements: 9.2_
  - [ ] 22.2 Prevent gesture conflicts
    - Distinguish between pan and annotation gestures
    - _Requirements: 9.5_

- [ ]* 22.3 Write property test for touch gesture handling (Property 18)
  - Test that touch interactions correctly distinguish pan vs annotation
  - **Validates: Requirements 9.2, 9.5**

## Phase 8: Error Handling & Edge Cases

- [ ] 23. Implement error handling
  - [ ] 23.1 Add client-side error handling
    - Show toast on network failure
    - Enable retry for failed saves
    - Handle permission denied errors
    - _Requirements: 8.4, 10.5_
  - [ ] 23.2 Add server-side error responses
    - Return proper HTTP status codes
    - Include descriptive error messages
    - _Requirements: 10.5_

- [ ] 24. Handle attachment deletion cascade
  - [ ] 24.1 Ensure annotations are deleted with attachment
    - Verify JSONB annotations are removed when attachment is deleted
    - No orphan data in annotation_read_status
    - _Requirements: 13.4_

- [ ]* 24.2 Write property test for attachment deletion cascade (Property 27)
  - Test that deleting attachment removes all embedded annotations
  - **Validates: Requirements 13.4**

- [ ] 25. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
