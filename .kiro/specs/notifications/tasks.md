# Implementation Plan: Notifications

## Overview
This plan implements a real-time notification system with Supabase Realtime, supporting collaboration notifications (mentions, replies, comments), workflow notifications (assignments, status changes), and system notifications (invitations, role updates).

> **Note:** Due date reminder notifications (`issue_due_soon`) are deferred to Phase 2 pending scheduled job infrastructure.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Create notifications table schema in Drizzle
    - Define `notification_type` enum with all 8 types
    - Create `notifications` table with all columns and indexes
    - _Location: `src/server/db/schema/notifications.ts`_
    - _Requirements: 1.1-1.4, 2.1-2.2, 3.1-3.3, 4.1-4.5_

  - [x] 1.2 Create Row Level Security policies
    - Enable RLS on notifications table
    - Create SELECT policy for own notifications
    - Create UPDATE policy for own notifications
    - _Location: Database migration_
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Generate and apply database migration
    - Run `bun run db:generate` and `bun run db:push`
    - _Requirements: 1.1-1.4, 2.1-2.2, 3.1-3.3, 6.1, 6.2_

  - [x] 1.4 Enable Supabase Realtime replication
    - Add notifications table to `supabase_realtime` publication
    - Set replica identity to FULL
    - _Location: `drizzle/0024_enable_notifications_realtime.sql`_
    - _Requirements: 4.5_

  - [x] 1.5 Define TypeScript types and DTOs
    - Create `Notification`, `NotificationMetadata`, `CreateNotificationDTO`, `NotificationGroup` interfaces
    - _Location: `src/server/notifications/types.ts`_
    - _Requirements: 1.1-1.4, 2.1-2.2, 3.1-3.3, 4.4_

- [x] 2. Implement notification service layer
  - [x] 2.1 Create core notification service
    - Implement `createNotification`, `createNotifications` (batch), `getNotifications`, `markAsRead`, `markAllAsRead`, `getUnreadCount`
    - Implement `buildTargetUrl` for deep-link generation with comment anchors
    - Implement `shouldCreateNotification` for actor exclusion
    - Implement `isDuplicate` for deduplication check
    - _Location: `src/server/notifications/notification-service.ts`_
    - _Requirements: 1.4, 4.1, 4.2, 4.3, 5.1-5.3, 6.5_

  - [x] 2.2 Write integration tests for notification service
    - Test CRUD operations, actor exclusion, deduplication
    - _Location: `src/server/notifications/__tests__/notification-service.integration.test.ts`_
    - _Requirements: 5.1-5.3, 6.5_

  - [ ]* 2.3 Write property test for notification creation
    - **Property 1: Notification Creation Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.3**

  - [ ]* 2.4 Write property test for target URL generation
    - **Property 2: Target URL Generation**
    - **Validates: Requirements 1.4**

  - [ ]* 2.5 Write property test for unread count accuracy
    - **Property 4: Unread Count Accuracy**
    - **Validates: Requirements 4.1**

  - [ ]* 2.6 Write property test for mark as read state change
    - **Property 5: Mark As Read State Change**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 2.7 Write property test for actor self-notification prevention
    - **Property 7: Actor Self-Notification Prevention**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 2.8 Write property test for deduplication
    - **Property 8: Deduplication Correctness**
    - **Validates: Requirements 6.5**

- [x] 3. Integrate notification triggers into existing services
  - [/] 3.1 Add notification triggers to comment service
    - Trigger notifications for mentions, replies, and comments on assigned issues
    - _NOTE: Deferred - requires mention extraction utility_
    - _Location: `src/server/annotations/comment-service.ts`_
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Add notification triggers to issue service
    - Trigger notifications for assignments and status changes
    - _Location: `src/server/issues/issue-service.ts`_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Add notification triggers to invitation service
    - Trigger notifications for project and team invitations
    - _Location: `src/server/projects/invitation-service.ts`_
    - _Requirements: 3.1_

  - [x] 3.4 Add notification triggers for role updates
    - Trigger notifications when user roles are changed
    - _Location: `src/server/projects/member-service.ts`_
    - _Requirements: 3.3_

- [x] 4. Checkpoint - Backend foundation complete
  - Ensure all service tests pass, ask the user if questions arise.

- [x] 5. Create API route handlers
  - [x] 5.1 Implement GET /api/notifications endpoint
    - Paginated list of notifications for authenticated user
    - _Location: `src/app/api/notifications/route.ts`_
    - _Requirements: 4.1_

  - [x] 5.2 Implement GET /api/notifications/unread-count endpoint
    - Lightweight endpoint for polling fallback
    - _Location: `src/app/api/notifications/unread-count/route.ts`_
    - _Requirements: 4.1_

  - [x] 5.3 Implement PATCH /api/notifications/[id]/read endpoint
    - Mark specific notification as read
    - _Location: `src/app/api/notifications/[id]/read/route.ts`_
    - _Requirements: 4.2_

  - [x] 5.4 Implement POST /api/notifications/read-all endpoint
    - Mark all notifications as read for authenticated user
    - _Location: `src/app/api/notifications/read-all/route.ts`_
    - _Requirements: 4.3_

  - [x] 5.5 Write API route integration tests
    - Test all endpoints with auth, error cases
    - _Location: `src/app/api/notifications/__tests__/`_
    - _Requirements: 7.1, 7.2_

- [x] 6. Implement frontend data layer
  - [x] 6.1 Create API fetcher functions
    - Typed fetch functions for all notification endpoints
    - _Location: `src/features/notifications/api/`_
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Create React Query hooks
    - `useNotifications`, `useUnreadCount`, `useMarkAsRead`, `useMarkAllAsRead`
    - _Location: `src/features/notifications/hooks/`_
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.3 Implement Supabase Realtime subscription hook
    - Subscribe to notification INSERT events for real-time updates
    - _Location: `src/features/notifications/hooks/use-notification-subscription.ts`_
    - _Requirements: 4.5_

  - [x] 6.4 Implement notification grouping utility
    - Group notifications by (type, entity_type, entity_id) within time window
    - _Location: `src/features/notifications/utils/group-notifications.ts`_
    - _Requirements: 4.4_

  - [x]* 6.5 Write property test for notification grouping
    - **Property 6: Notification Grouping Correctness**
    - _NOTE: Skipped (optional per spec)_
    - **Validates: Requirements 4.4**

  - [x] 6.6 Create MSW mock handlers for development
    - _NOTE: Using existing `src/mocks/notification.fixtures.ts`_
    - _Location: `src/mocks/handlers/notifications.ts`_
    - _Requirements: 7.4_ (enables fire-and-forget testing)

- [x] 7. Checkpoint - Data layer complete
  - Typecheck passed, all frontend data layer components created.

- [x] 8. Build UI components
  - [x] 8.1 Update NotificationBell component
    - Display unread count badge, connect to `useUnreadCount` hook
    - _Location: `src/components/shared/notifications/notification-bell.tsx`_
    - _Requirements: 4.1_

  - [x] 8.2 Update NotificationDropdown component
    - Paginated list with grouped notifications
    - _Location: `src/components/shared/notifications/notification-dropdown.tsx`_
    - _Requirements: 4.4_

  - [x] 8.3 Update NotificationItem component
    - Polymorphic rendering based on notification type
    - Deep-link navigation on click with scroll-to-comment
    - _Location: `src/components/shared/notifications/notification-item.tsx`_
    - _Requirements: 1.4_

  - [x] 8.4 Create NotificationGroupItem component
    - Collapsed view for grouped notifications ("User A and 3 others...")
    - _Location: `src/components/shared/notifications/notification-group-item.tsx`_
    - _Requirements: 4.4_

  - [x] 8.5 Create NotificationActions component
    - Inline Accept/Decline buttons for invitation notifications
    - _Location: `src/components/shared/notifications/notification-actions.tsx`_
    - _Requirements: 3.2_

  - [x]* 8.6 Write property test for invitation actions rendering
    - **Property 3: Invitation Actions Rendering**
    - **Validates: Requirements 3.2**

  - [x] 8.7 Implement toast notifications for real-time events
    - Show Sonner toast when new notification arrives via Realtime
    - _Location: `src/features/notifications/hooks/use-notification-toast.ts`_
    - _Requirements: 4.5_

  - [x] 8.8 Write component tests for UI components
    - Test NotificationItem renders correctly for each type
    - Test NotificationBell displays badge correctly
    - Test NotificationDropdown pagination and grouping
    - _Location: `src/components/shared/notifications/__tests__/`_
    - _Requirements: 4.1, 4.4, 1.4_

  - [x] 8.9 Implement mobile responsiveness
    - Ensure touch targets are minimum 44px
    - Adapt layout for narrow viewports (<480px)
    - _Location: UI component files_
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Integrate with application layout
  - [x] 9.1 Connect NotificationBell to header
    - Wire up notification components in the app header
    - _Location: `src/components/layout/` or `src/app/(protected)/layout.tsx`_
    - _Requirements: 4.1_

- [ ] 10. E2E Testing
  - [ ] 10.1 Test notification creation flow
    - User A comments → User B receives notification and badge update
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.5_

  - [ ] 10.2 Test notification navigation
    - Click notification → navigate to correct issue with comment scroll
    - _Requirements: 1.4_

  - [ ] 10.3 Test invitation Accept/Decline flow
    - Invitation notification shows actions, updates state correctly
    - _Requirements: 3.2_

  - [ ] 10.4 Test realtime fallback
    - Disconnect realtime → verify polling fallback activates
    - _Requirements: 7.5_

- [ ] 11. Final checkpoint - All tests pass
  - Run `bun run test` for all notification tests
  - Verify real-time updates work end-to-end
  - ~~Verify mobile responsiveness~~ (manual testing)

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check with minimum 100 iterations
- Real-time fallback: If Supabase Realtime connection fails, poll unread-count every 30s
- Actor self-notification prevention is enforced at the service layer, not via RLS
