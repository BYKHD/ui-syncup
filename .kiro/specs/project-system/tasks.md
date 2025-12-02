# Implementation Plan

## Phase 1: Database Schema & Core Infrastructure

- [ ] 1. Update database schema for projects
  - [x] 1.1 Create migration to update projects table
    - Add `team_id` (FK to teams), `key`, `slug`, `icon`, `visibility`, `status`, `deleted_at` columns
    - Remove `owner_id`, `is_active` columns
    - Add partial unique indexes on (team_id, key) and (team_id, slug) WHERE deleted_at IS NULL
    - Add composite index on (team_id, status, visibility) for performance
    - _Requirements: 9.1, 9.3, 9.4, 9.6, 9.7_
  - [x] 1.2 Create project_members table migration
    - Create table with id, project_id (FK), user_id (FK), role, joined_at
    - Add unique constraint on (project_id, user_id)
    - Add indexes on project_id and user_id
    - _Requirements: 9.2_
  - [x] 1.3 Update Drizzle schema definitions
    - Update `src/server/db/schema/projects.ts` with new columns and enums
    - Create `src/server/db/schema/project-members.ts` with project members table
    - Export new schema from `src/server/db/schema/index.ts`
    - _Requirements: 9.1, 9.2_

- [x] 2. Create project server services
  - [x] 2.1 Create project service utilities
    - Create `src/server/projects/` directory structure
    - Implement slug generation utility with URL-friendly output
    - Implement project validation functions
    - _Requirements: 3.2_
  - [x] 2.2 Write property test for slug generation
    - **Property 7: Slug generation**
    - **Validates: Requirements 3.2**
  - [x] 2.3 Implement project service core functions
    - Create `src/server/projects/project-service.ts`
    - Implement `listProjects` with efficient aggregation (single query for stats)
    - Implement `getProject` with user role and canJoin logic
    - Implement `createProject` with transaction (project + owner member)
    - Implement `updateProject` for settings changes
    - Implement `deleteProject` with soft delete (set deleted_at)
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.3, 2.4, 3.1, 3.2, 4.1, 4.3, 4.4, 5.1, 5.3, 5.4_
  - [x] 2.4 Write property tests for project service
    - **Property 1: Project Visibility Access Control**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 2.5 Write property test for project stats
    - **Property 2: Project Statistics Completeness**
    - **Validates: Requirements 1.3**
  - [x] 2.6 Write property test for soft deletion
    - **Property 10: Soft Deletion**
    - **Validates: Requirements 5.1, 5.3**
  - [x] 2.7 Write property test for default values
    - **Property 17: Default Values**
    - **Validates: Requirements 9.6, 9.7**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Project Member Service

- [x] 4. Implement project member service
  - [x] 4.1 Create member service
    - Create `src/server/projects/member-service.ts`
    - Implement `listMembers` with user details
    - Implement `addMember` with role assignment
    - Implement `updateMemberRole` with auto-promotion logic
    - Implement `removeMember` with sole owner protection
    - Implement `joinProject` for public projects (as viewer)
    - Implement `leaveProject` with sole owner protection
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 4.2 Write property test for join project
    - **Property 11: Join Project as Viewer**
    - **Validates: Requirements 6.1**
  - [x] 4.3 Write property test for leave project
    - **Property 12: Leave Project**
    - **Validates: Requirements 7.1, 7.3**
  - [x] 4.4 Write property test for member role update
    - **Property 14: Member Role Update with Auto-Promotion**
    - **Validates: Requirements 8.2, 8.5**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: API Route Handlers

- [x] 6. Implement project list and create API routes
  - [x] 6.1 Create projects API route handler
    - Create `src/app/api/projects/route.ts`
    - Implement GET handler with filters, pagination, and RBAC
    - Implement POST handler with validation and RBAC (PROJECT_CREATE permission)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.1, 3.3, 3.4_
  - [x] 6.2 Write property test for pagination
    - **Property 4: Pagination Correctness**
    - **Validates: Requirements 1.5**
  - [x] 6.3 Write property test for filter correctness
    - **Property 3: Filter Correctness & Performance**
    - **Validates: Requirements 1.4**

- [x] 7. Implement project detail API routes
  - [x] 7.1 Create project detail route handler
    - Create `src/app/api/projects/[id]/route.ts`
    - Implement GET handler with RBAC (PROJECT_VIEW permission)
    - Implement PATCH handler with RBAC (PROJECT_UPDATE permission)
    - Implement DELETE handler with RBAC (PROJECT_DELETE permission)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 5.1, 5.2_
  - [x] 7.2 Write property test for project detail response
    - **Property 5: Project Detail Response Correctness**
    - **Validates: Requirements 2.1, 2.3, 2.4**
  - [x] 7.3 Write property test for visibility change
    - **Property 9: Visibility Change Member Preservation**
    - **Validates: Requirements 4.3, 4.4**

- [x] 8. Implement project member API routes
  - [x] 8.1 Create project members route handler
    - Create `src/app/api/projects/[id]/members/route.ts`
    - Implement GET handler for member list
    - _Requirements: 8.1_
  - [x] 8.2 Create join project route handler
    - Create `src/app/api/projects/[id]/join/route.ts`
    - Implement POST handler for joining public projects
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.3 Create leave project route handler
    - Create `src/app/api/projects/[id]/members/me/route.ts`
    - Implement DELETE handler for leaving project
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 8.4 Create member management route handler
    - Create `src/app/api/projects/[id]/members/[memberId]/route.ts`
    - Implement PATCH handler for role updates with RBAC
    - Implement DELETE handler for member removal with RBAC
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 8.5 Write property test for member list
    - **Property 13: Member List Retrieval**
    - **Validates: Requirements 8.1**
  - [x] 8.6 Write property test for member removal
    - **Property 15: Member Removal**
    - **Validates: Requirements 8.3**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Schema Validation & Serialization

- [x] 10. Implement Zod schema validation
  - [x] 10.1 Create server-side Zod schemas
    - Create `src/server/projects/schemas.ts` with request/response validation
    - Ensure schemas match frontend types in `src/features/projects/api/types.ts`
    - _Requirements: 9.8, 9.9_
  - [x] 10.2 Write property test for schema validation
    - **Property 18: Schema Validation**
    - **Validates: Requirements 9.8, 9.9**
  - [x] 10.3 Write property test for serialization round-trip
    - **Property 19: Serialization Round-Trip**
    - **Validates: Requirements 10.1, 10.2**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Frontend Wiring

- [x] 12. Wire frontend API callers to real endpoints
  - [x] 12.1 Update project API callers
    - Update `src/features/projects/api/get-projects.ts` to use real fetch
    - Update `src/features/projects/api/get-project.ts` to use real fetch
    - Update `src/features/projects/api/create-project.ts` to use real fetch
    - Update `src/features/projects/api/update-project.ts` to use real fetch
    - Update `src/features/projects/api/delete-project.ts` to use real fetch
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
  - [x] 12.2 Update member API callers
    - Update `src/features/projects/api/get-project-members.ts` to use real fetch
    - Update `src/features/projects/api/join-project.ts` to use real fetch
    - Update `src/features/projects/api/leave-project.ts` to use real fetch
    - Update `src/features/projects/api/update-member-role.ts` to use real fetch
    - Update `src/features/projects/api/remove-member.ts` to use real fetch
    - _Requirements: 6.1, 7.1, 8.1, 8.2, 8.3_

- [x] 13. Wire frontend hooks to real API
  - [x] 13.1 Update query hooks
    - Update `src/features/projects/hooks/use-projects.ts` to use React Query with real API
    - Update `src/features/projects/hooks/use-project.ts` to use React Query with real API
    - Update `src/features/projects/hooks/use-project-members.ts` to use React Query with real API
    - _Requirements: 1.1, 2.1, 8.1_
  - [x] 13.2 Update mutation hooks
    - Update `src/features/projects/hooks/use-create-project.ts` to use React Query mutation
    - Update `src/features/projects/hooks/use-update-project.ts` to use React Query mutation
    - Update `src/features/projects/hooks/use-delete-project.ts` to use React Query mutation
    - Update `src/features/projects/hooks/use-join-project.ts` to use React Query mutation
    - Update `src/features/projects/hooks/use-leave-project.ts` to use React Query mutation
    - Update `src/features/projects/hooks/use-update-member-role.ts` to use React Query mutation
    - Update `src/features/projects/hooks/use-remove-member.ts` to use React Query mutation
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 8.2, 8.3_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Integration & Transactional Integrity

- [ ] 15. Implement transactional integrity
  - [ ] 15.1 Wrap critical operations in transactions
    - Ensure createProject uses transaction for project + member creation
    - Ensure deleteProject uses transaction for soft delete
    - _Requirements: 9.5_
  - [ ]* 15.2 Write property test for transactional integrity
    - **Property 6b: Transactional Integrity**
    - **Validates: Requirements 9.5**
  - [ ]* 15.3 Write property test for project creation with owner
    - **Property 6: Project Creation with Owner Assignment**
    - **Validates: Requirements 3.1, 3.5**
  - [ ]* 15.4 Write property test for project update
    - **Property 8: Project Update Correctness**
    - **Validates: Requirements 4.1**
  - [ ]* 15.5 Write property test for schema completeness
    - **Property 16: Schema Completeness**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 16. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
