# Implementation Plan: [Feature Name]

## Overview

[Brief description of the implementation approach and key milestones]

## Status Legend

- [x] Completed
- [/] In Progress
- [ ] Not Started
- [ ]* Optional (can be skipped for faster MVP)

---

## Phase 1: Database & Types

- [ ] 1.1 Create database schema
  - Define table structure in `src/server/db/schema/[feature].ts`
  - Add indexes for frequently queried columns
  - Define foreign key relationships
  - _Requirements: [X.Y]_
  - _Location: `src/server/db/schema/[feature].ts`_

- [ ] 1.2 Update schema index
  - Export new table from `src/server/db/schema/index.ts`
  - _Requirements: [X.Y]_
  - _Location: `src/server/db/schema/index.ts`_

- [ ] 1.3 Generate and apply migration
  - Run `bun run db:generate` to create migration
  - Review generated SQL
  - Run `bun run db:push` to apply migration
  - _Requirements: [X.Y]_
  - _Location: `drizzle/migrations/`_

- [ ] 1.4 Define service types
  - Create TypeScript interfaces in `src/server/[domain]/types.ts`
  - Define input/output types for service functions
  - _Requirements: [X.Y]_
  - _Location: `src/server/[domain]/types.ts`_

---

## Phase 2: Service Layer

- [ ] 2.1 Implement core service functions
  - Create `src/server/[domain]/[feature]-service.ts`
  - Implement CRUD operations
  - Add input validation with Zod
  - Add structured logging
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/server/[domain]/[feature]-service.ts`_

- [ ]* 2.2 Write integration tests for service layer
  - Test CRUD operations
  - Test validation logic
  - Test error handling
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/server/[domain]/__tests__/[feature].integration.test.ts`_

- [ ]* 2.3 Write property test: [Property Name]
  - **Property [N]: [Property description]**
  - **Validates: Requirements [X.Y]**
  - Use `fast-check` with 100+ iterations
  - _Location: `src/server/[domain]/__tests__/[feature].property.test.ts`_

---

## Phase 3: API Routes

- [ ] 3.1 Create API route handlers
  - Implement GET/POST/PATCH/DELETE endpoints
  - Add authentication checks with `getServerSession()`
  - Add RBAC authorization checks
  - Implement consistent error responses
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/app/api/[resource]/route.ts`_

- [ ]* 3.2 Write API route tests
  - Test authentication requirements
  - Test authorization rules
  - Test request/response formats
  - Test error cases
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/app/api/[resource]/__tests__/route.test.ts`_

---

## Phase 4: Feature API Layer

- [ ] 4.1 Create API fetcher functions
  - Implement typed fetch functions in `src/features/[domain]/api/[feature].ts`
  - Add Zod validation for responses
  - Handle errors appropriately
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/api/[feature].ts`_

- [ ] 4.2 Define DTO schemas
  - Create Zod schemas for request/response types
  - Export TypeScript types from schemas
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/api/types.ts`_

- [ ] 4.3 Update barrel exports
  - Export API functions from `src/features/[domain]/api/index.ts`
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/api/index.ts`_

---

## Phase 5: React Query Hooks

- [ ] 5.1 Create query hooks
  - Implement `use[Entity]` for fetching single entity
  - Implement `use[Entities]` for fetching list
  - Configure cache settings
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/hooks/use-[entity].ts`_

- [ ] 5.2 Create mutation hooks
  - Implement `useCreate[Entity]` mutation
  - Implement `useUpdate[Entity]` mutation
  - Implement `useDelete[Entity]` mutation
  - Add optimistic updates where appropriate
  - Invalidate queries on success
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/features/[domain]/hooks/use-[action]-[entity].ts`_

- [ ] 5.3 Update barrel exports
  - Export hooks from `src/features/[domain]/hooks/index.ts`
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/hooks/index.ts`_

- [ ]* 5.4 Write hook tests
  - Test query hook behavior
  - Test mutation hook behavior
  - Test cache invalidation
  - Test error handling
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/features/[domain]/hooks/__tests__/use-[entity].test.ts`_

---

## Phase 6: UI Components (Mock Data)

- [ ] 6.1 Set up MSW handlers (optional but recommended)
  - Create mock API responses in `src/mocks/handlers/[feature].ts`
  - Simulate loading states with delays
  - Simulate error states
  - _Requirements: [X.Y]_
  - _Location: `src/mocks/handlers/[feature].ts`_

- [ ] 6.2 Create list component
  - Implement `[Entity]List` component
  - Handle loading state
  - Handle error state
  - Handle empty state
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/components/[entity]-list.tsx`_

- [ ] 6.3 Create detail component
  - Implement `[Entity]Detail` component
  - Display all entity fields
  - Handle loading/error states
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/components/[entity]-detail.tsx`_

- [ ] 6.4 Create form component
  - Implement `[Entity]Form` component
  - Use React Hook Form + Zod validation
  - Handle submission states
  - Display validation errors
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/features/[domain]/components/[entity]-form.tsx`_

- [ ] 6.5 Create dialog/modal components
  - Implement create/edit dialogs
  - Implement delete confirmation
  - Handle open/close states
  - _Requirements: [X.Y]_
  - _Location: `src/features/[domain]/components/[entity]-dialog.tsx`_

- [ ]* 6.6 Write component tests
  - Test rendering with different props
  - Test user interactions
  - Test loading/error/empty states
  - Test form validation
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/features/[domain]/components/__tests__/[component].test.tsx`_

- [ ]* 6.7 Write property test: [UI Property Name]
  - **Property [N]: [Property description]**
  - **Validates: Requirements [X.Y]**
  - Test UI behavior across various inputs
  - _Location: `src/features/[domain]/components/__tests__/[component].property.test.tsx`_

---

## Phase 7: Integration & Screens

- [ ] 7.1 Create feature screen
  - Implement `[Feature]Screen` in `src/features/[domain]/screens/`
  - Compose components and hooks
  - Handle screen-level state
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `src/features/[domain]/screens/[feature]-screen.tsx`_

- [ ] 7.2 Connect to page route
  - Update page in `src/app/(protected)/[route]/page.tsx`
  - Add authentication/authorization checks
  - Pass necessary props to screen
  - _Requirements: [X.Y]_
  - _Location: `src/app/(protected)/[route]/page.tsx`_

- [ ] 7.3 Update navigation
  - Add links to sidebar/navigation
  - Update breadcrumbs if applicable
  - _Requirements: [X.Y]_
  - _Location: `src/components/shared/sidebar/` or relevant nav component_

---

## Phase 8: Polish & Optimization

- [ ] 8.1 Responsive design
  - Test on mobile devices
  - Adjust layouts for small screens
  - Ensure touch-friendly interactions
  - _Requirements: [X.Y]_

- [ ] 8.2 Accessibility review
  - Add ARIA labels
  - Test keyboard navigation
  - Test with screen reader
  - Ensure proper focus management
  - _Requirements: [X.Y]_

- [ ] 8.3 Performance optimization
  - Review bundle size
  - Add code splitting if needed
  - Optimize database queries
  - Review React Query cache settings
  - _Requirements: [X.Y]_

- [ ]* 8.4 Write E2E tests
  - Test complete user flows
  - Test error scenarios
  - Test edge cases
  - _Requirements: [X.Y], [X.Z]_
  - _Location: `tests/e2e/[feature].spec.ts`_

---

## Phase 9: Final Verification

- [ ] 9.1 Run full test suite
  - Execute `bun run test`
  - Ensure all tests pass
  - Review coverage report
  - _Requirements: All_

- [ ] 9.2 Manual testing
  - Test all user flows manually
  - Test on different browsers
  - Test on mobile devices
  - Verify error handling
  - _Requirements: All_

- [ ] 9.3 Code review
  - Review code for best practices
  - Check for security issues
  - Verify RBAC implementation
  - Ensure proper error handling
  - _Requirements: All_

- [ ] 9.4 Update documentation
  - Update API documentation if needed
  - Update user-facing documentation
  - Add inline code comments where needed
  - _Requirements: All_

---

## Checkpoint Tasks

Throughout implementation, pause at these checkpoints:

- [ ] Checkpoint 1: After Phase 2
  - Ensure all service tests pass
  - Verify database schema is correct
  - Ask user if questions arise

- [ ] Checkpoint 2: After Phase 5
  - Ensure API routes work correctly
  - Verify hooks integrate properly
  - Ask user if questions arise

- [ ] Checkpoint 3: After Phase 7
  - Ensure UI components render correctly
  - Verify complete user flows work
  - Ask user if questions arise

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate service + database operations
- E2E tests validate complete user journeys

---

## Change Log

| Date | Change | Impact | Affected Tasks |
|------|--------|--------|----------------|
| YYYY-MM-DD | [Description] | [High/Medium/Low] | [Task numbers] |
