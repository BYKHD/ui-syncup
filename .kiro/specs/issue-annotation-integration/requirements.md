# Requirements Document

## Introduction

This document specifies the requirements for integrating the annotations feature with the issues feature in UI SyncUp. Both features currently exist as ready-to-wire visual mockups with complete UI components, hooks, and mock data. The integration will enable users to create visual annotations (pins and boxes) directly on issue attachments, linking annotations to issues and enabling threaded discussions on specific UI elements.

## Glossary

- **Issue System**: The issue tracking feature that manages UI/UX issues with workflow states (Open → In Progress → In Review → Resolved → Archived)
- **Annotation System**: The visual feedback feature that enables pin-based and box-based annotations on images with undo/redo support
- **Attachment**: An image or mockup file associated with an issue
- **Pin Annotation**: A point-based marker placed on an image at specific coordinates
- **Box Annotation**: A rectangular region marked on an image with position and dimensions
- **Annotation Thread**: A series of comments and replies associated with a specific annotation
- **Canvas View**: The image display area where annotations are created and rendered
- **Issue Details Screen**: The main screen component that displays issue information, attachments, and activities
- **Annotation Layer**: The component that renders all annotations on top of an image
- **History Manager**: The system that tracks annotation changes for undo/redo functionality
- **Draft State**: Temporary annotation data during creation before it is committed

## Requirements

### Requirement 1

**User Story:** As a designer, I want to create pin and box annotations on issue attachments, so that I can provide precise visual feedback on specific UI elements.

#### Acceptance Criteria

1. WHEN viewing an issue with image attachments THEN the Issue System SHALL display the Annotation System canvas with annotation tools
2. WHEN a user selects the pin tool and clicks on an attachment THEN the Annotation System SHALL create a Pin Annotation at the clicked coordinates
3. WHEN a user selects the box tool and drags on an attachment THEN the Annotation System SHALL create a Box Annotation with the defined region
4. WHEN a user creates an annotation THEN the Issue System SHALL persist the annotation data linked to the attachment and issue
5. WHEN annotation data is persisted THEN the Annotation System SHALL clear the Draft State and add the annotation to the History Manager

### Requirement 2

**User Story:** As a developer, I want to view all annotations on an issue attachment, so that I can understand the specific feedback points.

#### Acceptance Criteria

1. WHEN an issue attachment is loaded THEN the Issue System SHALL fetch all associated annotations from the database
2. WHEN annotations are fetched THEN the Annotation System SHALL render all Pin Annotations and Box Annotations on the Annotation Layer
3. WHEN multiple annotations overlap THEN the Annotation System SHALL display them with proper z-index ordering based on creation time
4. WHEN an annotation is selected THEN the Annotation System SHALL highlight the selected annotation and display its associated thread

### Requirement 3

**User Story:** As a team member, I want to comment on annotations, so that I can participate in threaded discussions about specific UI elements.

#### Acceptance Criteria

1. WHEN a user clicks on an annotation THEN the Issue System SHALL display the Annotation Thread panel with existing comments
2. WHEN a user submits a comment on an annotation THEN the Issue System SHALL create a new comment linked to the annotation
3. WHEN a comment is created THEN the Issue System SHALL update the activity timeline with the annotation comment event
4. WHEN viewing an Annotation Thread THEN the Issue System SHALL display all comments in chronological order with author information
5. WHEN an annotation has unread comments THEN the Annotation System SHALL display a visual indicator on the annotation marker

### Requirement 4

**User Story:** As a user, I want to edit and delete annotations, so that I can correct mistakes or remove outdated feedback.

#### Acceptance Criteria

1. WHEN a user with edit permissions drags an annotation THEN the Annotation System SHALL update the annotation position and push the change to the History Manager
2. WHEN a user with edit permissions resizes a Box Annotation THEN the Annotation System SHALL update the annotation dimensions and push the change to the History Manager
3. WHEN a user with delete permissions deletes an annotation THEN the Issue System SHALL remove the annotation and its Annotation Thread from the database
4. WHEN an annotation is deleted THEN the Annotation System SHALL remove it from the Annotation Layer and push the deletion to the History Manager
5. WHEN annotation changes are made THEN the Issue System SHALL persist the updated annotation data to the database

### Requirement 5

**User Story:** As a user, I want undo and redo functionality for annotations, so that I can easily correct mistakes during annotation creation and editing.

#### Acceptance Criteria

1. WHEN a user creates, moves, resizes, or deletes an annotation THEN the Annotation System SHALL add the action to the History Manager
2. WHEN a user triggers undo (Cmd+Z) THEN the Annotation System SHALL revert the last annotation action and update the Annotation Layer
3. WHEN a user triggers redo (Cmd+Shift+Z) THEN the Annotation System SHALL reapply the last undone action and update the Annotation Layer
4. WHEN undo or redo is triggered THEN the Issue System SHALL persist the resulting annotation state to the database
5. WHEN the history stack is empty THEN the Annotation System SHALL disable the undo button in the toolbar

### Requirement 6

**User Story:** As a user, I want keyboard shortcuts for annotation tools, so that I can work efficiently without constantly switching between mouse and keyboard.

#### Acceptance Criteria

1. WHEN a user presses 'E' THEN the Annotation System SHALL toggle edit mode on or off
2. WHEN a user presses '1' or 'C' THEN the Annotation System SHALL activate the cursor tool
3. WHEN a user presses '2' or 'P' THEN the Annotation System SHALL activate the pin tool
4. WHEN a user presses '3' or 'B' THEN the Annotation System SHALL activate the box tool
5. WHEN keyboard shortcuts are triggered THEN the Annotation System SHALL update the toolbar to reflect the active tool

### Requirement 7

**User Story:** As a project manager, I want to see annotation activity in the issue timeline, so that I can track visual feedback discussions alongside other issue activities.

#### Acceptance Criteria

1. WHEN an annotation is created THEN the Issue System SHALL add an "annotation created" activity entry to the issue timeline
2. WHEN an annotation receives a comment THEN the Issue System SHALL add an "annotation commented" activity entry to the issue timeline
3. WHEN an annotation is deleted THEN the Issue System SHALL add an "annotation deleted" activity entry to the issue timeline
4. WHEN viewing the activity timeline THEN the Issue System SHALL display annotation activities with appropriate icons and descriptions
5. WHEN an annotation activity is clicked THEN the Issue System SHALL navigate to the attachment and highlight the referenced annotation

### Requirement 8

**User Story:** As a user with limited permissions, I want appropriate access controls on annotations, so that I can only perform actions I'm authorized for.

#### Acceptance Criteria

1. WHEN a user with TEAM_VIEWER role views an issue THEN the Annotation System SHALL display annotations in read-only mode without annotation tools
2. WHEN a user with TEAM_MEMBER role views an issue THEN the Annotation System SHALL allow creating annotations and commenting but not editing others' annotations
3. WHEN a user with TEAM_EDITOR role views an issue THEN the Annotation System SHALL allow creating, editing, and deleting any annotation
4. WHEN a user attempts an unauthorized annotation action THEN the Issue System SHALL prevent the action and display an appropriate error message
5. WHEN annotation permissions change THEN the Annotation System SHALL update the toolbar to show only available tools

### Requirement 9

**User Story:** As a developer, I want annotations to be responsive across devices, so that users can provide feedback from any device.

#### Acceptance Criteria

1. WHEN viewing annotations on mobile devices THEN the Annotation System SHALL scale annotations proportionally to the image size
2. WHEN creating annotations on touch devices THEN the Annotation System SHALL support touch gestures for creating pins and boxes
3. WHEN the viewport size changes THEN the Annotation System SHALL recalculate annotation positions to maintain accuracy
4. WHEN viewing on small screens THEN the Issue System SHALL provide a mobile-optimized layout for the Annotation Thread panel
5. WHEN touch interactions occur THEN the Annotation System SHALL prevent conflicts between pan gestures and annotation creation

### Requirement 10

**User Story:** As a system administrator, I want annotation data to be properly validated and sanitized, so that the system remains secure and data integrity is maintained.

#### Acceptance Criteria

1. WHEN annotation data is received from the client THEN the Issue System SHALL validate coordinates are within image boundaries
2. WHEN annotation data is received from the client THEN the Issue System SHALL validate all required fields are present using Zod schemas
3. WHEN comment text is submitted THEN the Issue System SHALL sanitize the input to prevent XSS attacks
4. WHEN annotation data is persisted THEN the Issue System SHALL ensure foreign key relationships to issues and attachments are valid
5. WHEN invalid annotation data is detected THEN the Issue System SHALL reject the request and return a descriptive error message

### Requirement 11

**User Story:** As a developer, I want dedicated API endpoints for annotation comments, so that I can add, edit, and delete comments without replacing the entire annotation payload.

#### Acceptance Criteria

1. WHEN a user submits a comment on an annotation THEN the Issue System SHALL provide a POST endpoint to add the comment to the annotation's comments array
2. WHEN a user edits their own comment THEN the Issue System SHALL provide a PATCH endpoint to update the comment text
3. WHEN a user deletes their own comment THEN the Issue System SHALL provide a DELETE endpoint to remove the comment
4. WHEN a comment operation is performed THEN the Issue System SHALL update only the affected comment within the JSONB structure
5. WHEN a comment is added or deleted THEN the Issue System SHALL create an activity entry for the annotation thread

### Requirement 12

**User Story:** As a system architect, I want annotation activities to be tracked with specific activity types, so that the activity timeline accurately reflects annotation-related events.

#### Acceptance Criteria

1. WHEN an annotation is created THEN the Issue System SHALL log an activity with type `annotation_created` including the annotation ID and type (pin/box)
2. WHEN an annotation is updated (moved/resized) THEN the Issue System SHALL log an activity with type `annotation_updated` including the changes made
3. WHEN an annotation is deleted THEN the Issue System SHALL log an activity with type `annotation_deleted` including the annotation label
4. WHEN a comment is added to an annotation THEN the Issue System SHALL log an activity with type `annotation_commented` including a preview of the comment
5. WHEN querying activities THEN the Issue System SHALL support filtering by annotation-related activity types

### Requirement 13

**User Story:** As a system architect, I want annotation data stored as JSONB within attachments, so that annotations are efficiently fetched with their parent attachment without additional joins.

#### Acceptance Criteria

1. WHEN an attachment is created THEN the Issue System SHALL initialize the annotations JSONB column as an empty array `[]`
2. WHEN an attachment is fetched THEN the Issue System SHALL return the complete annotations array with all nested comments
3. WHEN annotations are updated THEN the Issue System SHALL use PostgreSQL JSONB operators for atomic updates
4. WHEN an attachment is deleted THEN the Issue System SHALL cascade delete all embedded annotations (no orphan data)
5. WHEN annotations exceed reasonable limits THEN the Issue System SHALL enforce a maximum of 50 annotations per attachment
