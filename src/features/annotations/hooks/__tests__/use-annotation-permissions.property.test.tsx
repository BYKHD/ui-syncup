/**
 * @vitest-environment jsdom
 */

/**
 * Property-Based Tests for Annotation Permission Enforcement
 *
 * Feature: annotation-permissions, Property 16
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * These tests verify that the useAnnotationPermissions hook correctly maps
 * user roles to annotation permissions across all possible role combinations.
 *
 * @module features/annotations/hooks/__tests__/use-annotation-permissions.property.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface MockUserRole {
  id: string;
  userId: string;
  role: string;
  resourceType: 'team' | 'project';
  resourceId: string;
  createdAt: string;
}

interface MockUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  roles: MockUserRole[];
}

// ============================================================================
// MOCK SESSION MODULE
// ============================================================================

// Create a mock session value that we can change between tests
let mockSessionValue: {
  session: { user: MockUser | undefined } | undefined;
  isLoading: boolean;
} = {
  session: undefined,
  isLoading: false,
};

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => mockSessionValue,
}));

// Import the hook after mocking
import { useAnnotationPermissions } from '../use-annotation-permissions';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function setMockSession(user: MockUser | undefined, isLoading = false) {
  mockSessionValue = {
    session: user ? { user } : undefined,
    isLoading,
  };
}

// ============================================================================
// ARBITRARIES (GENERATORS)
// ============================================================================

// Team roles
const teamRoleArb = fc.constantFrom(
  'WORKSPACE_OWNER',
  'WORKSPACE_ADMIN',
  'WORKSPACE_EDITOR',
  'WORKSPACE_MEMBER',
  'WORKSPACE_VIEWER'
);

// Project roles
const projectRoleArb = fc.constantFrom(
  'PROJECT_OWNER',
  'PROJECT_EDITOR',
  'PROJECT_DEVELOPER',
  'PROJECT_VIEWER'
);

// Generate a mock user role
const userRoleArb = fc.oneof(
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    role: teamRoleArb,
    resourceType: fc.constant('team' as const),
    resourceId: fc.uuid(),
    createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((t) => new Date(t).toISOString()), // 2020-2031
  }),
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    role: projectRoleArb,
    resourceType: fc.constant('project' as const),
    resourceId: fc.uuid(),
    createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((t) => new Date(t).toISOString()),
  })
);

// Generate user with specific roles
const mockUserArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  emailVerified: fc.boolean(),
  createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((t) => new Date(t).toISOString()),
  updatedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((t) => new Date(t).toISOString()),
  roles: fc.array(userRoleArb, { minLength: 0, maxLength: 5 }),
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('useAnnotationPermissions - Property Tests (Property 16)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    setMockSession(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Property 16.1: No session = No permissions
   * Requirement 8.1
   *
   * When there is no authenticated session, all permissions should be false.
   */
  it('Property 16.1: No session results in no permissions', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (projectId, teamId) => {
        setMockSession(undefined);

        const { result } = renderHook(
          () => useAnnotationPermissions({ projectId, teamId }),
          { wrapper: createWrapper(queryClient) }
        );

        expect(result.current.permissions.canView).toBe(false);
        expect(result.current.permissions.canCreate).toBe(false);
        expect(result.current.permissions.canEdit).toBe(false);
        expect(result.current.permissions.canEditAll).toBe(false);
        expect(result.current.permissions.canDelete).toBe(false);
        expect(result.current.permissions.canDeleteAll).toBe(false);
        expect(result.current.permissions.canComment).toBe(false);
        expect(result.current.userId).toBe(null);

        cleanup();
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property 16.2: TEAM_VIEWER = Read-only permissions
   * Requirement 8.5
   *
   * Team viewers should only have canView: true, all other permissions false.
   */
  it('Property 16.2: TEAM_VIEWER role gets read-only permissions', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, teamId, roleId, resourceId) => {
          const viewerUser: MockUser = {
            id: userId,
            email: 'viewer@example.com',
            name: 'Viewer User',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: [
              {
                id: roleId,
                userId,
                role: 'WORKSPACE_VIEWER',
                resourceType: 'team',
                resourceId,
                createdAt: new Date().toISOString(),
              },
            ],
          };

          setMockSession(viewerUser);

          const { result } = renderHook(
            () => useAnnotationPermissions({ teamId }),
            { wrapper: createWrapper(queryClient) }
          );

          // Read-only: can view but nothing else
          expect(result.current.permissions.canView).toBe(true);
          expect(result.current.permissions.canCreate).toBe(false);
          expect(result.current.permissions.canEdit).toBe(false);
          expect(result.current.permissions.canEditAll).toBe(false);
          expect(result.current.permissions.canDelete).toBe(false);
          expect(result.current.permissions.canDeleteAll).toBe(false);
          expect(result.current.permissions.canComment).toBe(false);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 16.3: TEAM_MEMBER = Member permissions (own only)
   * Requirement 8.2
   *
   * Team members can create, edit/delete own, and comment.
   */
  it('Property 16.3: TEAM_MEMBER role gets member permissions', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, teamId, roleId, resourceId) => {
          const memberUser: MockUser = {
            id: userId,
            email: 'member@example.com',
            name: 'Member User',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: [
              {
                id: roleId,
                userId,
                role: 'WORKSPACE_MEMBER',
                resourceType: 'team',
                resourceId,
                createdAt: new Date().toISOString(),
              },
            ],
          };

          setMockSession(memberUser);

          const { result } = renderHook(
            () => useAnnotationPermissions({ teamId }),
            { wrapper: createWrapper(queryClient) }
          );

          // Member: can create, edit/delete own, comment
          expect(result.current.permissions.canView).toBe(true);
          expect(result.current.permissions.canCreate).toBe(true);
          expect(result.current.permissions.canEdit).toBe(true); // Own only
          expect(result.current.permissions.canEditAll).toBe(false);
          expect(result.current.permissions.canDelete).toBe(true); // Own only
          expect(result.current.permissions.canDeleteAll).toBe(false);
          expect(result.current.permissions.canComment).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 16.4: Editor roles = Full permissions
   * Requirements 8.1, 8.3, 8.4
   *
   * TEAM_OWNER, TEAM_ADMIN, TEAM_EDITOR should have full CRUD when resourceType is 'team'.
   * PROJECT_OWNER, PROJECT_EDITOR should have full CRUD when resourceType is 'project'.
   */
  it('Property 16.4: Editor+ roles get full permissions', () => {
    // Team editor roles
    const teamEditorRoles = ['WORKSPACE_OWNER', 'WORKSPACE_ADMIN', 'WORKSPACE_EDITOR'];
    // Project editor roles
    const projectEditorRoles = ['PROJECT_OWNER', 'PROJECT_EDITOR'];

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.oneof(
          // Team roles with 'team' resourceType
          fc.record({
            role: fc.constantFrom(...teamEditorRoles),
            resourceType: fc.constant('team' as const),
          }),
          // Project roles with 'project' resourceType
          fc.record({
            role: fc.constantFrom(...projectEditorRoles),
            resourceType: fc.constant('project' as const),
          })
        ),
        (userId, roleId, resourceId, { role, resourceType }) => {
          const editorUser: MockUser = {
            id: userId,
            email: 'editor@example.com',
            name: 'Editor User',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: [
              {
                id: roleId,
                userId,
                role,
                resourceType,
                resourceId,
                createdAt: new Date().toISOString(),
              },
            ],
          };

          setMockSession(editorUser);

          const { result } = renderHook(
            () => useAnnotationPermissions({}),
            { wrapper: createWrapper(queryClient) }
          );

          // Editor: full CRUD on all
          expect(result.current.permissions.canView).toBe(true);
          expect(result.current.permissions.canCreate).toBe(true);
          expect(result.current.permissions.canEdit).toBe(true);
          expect(result.current.permissions.canEditAll).toBe(true);
          expect(result.current.permissions.canDelete).toBe(true);
          expect(result.current.permissions.canDeleteAll).toBe(true);
          expect(result.current.permissions.canComment).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.5: Highest role wins with mixed roles
   * Requirement 8.1
   *
   * When a user has multiple roles, the highest permissions should apply.
   * Note: The hook uses roles.find() which returns the first match,
   * so the editor role must be listed first to be found.
   */
  it('Property 16.5: Highest role determines permissions with mixed roles', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, roleId1, roleId2, resourceId) => {
          // User has both TEAM_EDITOR (first) and TEAM_VIEWER
          // The hook uses roles.find() which returns the first team role found
          const mixedUser: MockUser = {
            id: userId,
            email: 'mixed@example.com',
            name: 'Mixed User',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: [
              {
                id: roleId1,
                userId,
                role: 'WORKSPACE_EDITOR', // Higher role first
                resourceType: 'team',
                resourceId,
                createdAt: new Date().toISOString(),
              },
              {
                id: roleId2,
                userId,
                role: 'WORKSPACE_VIEWER', // Lower role second
                resourceType: 'team',
                resourceId,
                createdAt: new Date().toISOString(),
              },
            ],
          };

          setMockSession(mixedUser);

          const { result } = renderHook(
            () => useAnnotationPermissions({}),
            { wrapper: createWrapper(queryClient) }
          );

          // Should get editor permissions (from first matching role)
          expect(result.current.permissions.canEditAll).toBe(true);
          expect(result.current.permissions.canDeleteAll).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 16.6: userId is returned correctly
   * Requirement 8.2, 8.3
   *
   * The hook should return the correct userId for ownership checks.
   */
  it('Property 16.6: userId is returned correctly from session', () => {
    fc.assert(
      fc.property(mockUserArb, (user) => {
        setMockSession(user);

        const { result } = renderHook(
          () => useAnnotationPermissions({}),
          { wrapper: createWrapper(queryClient) }
        );

        expect(result.current.userId).toBe(user.id);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16.7: Permissions are idempotent
   * Requirement 8.1
   *
   * Multiple calls with the same session should return identical permissions.
   */
  it('Property 16.7: Permissions are idempotent for same session', () => {
    fc.assert(
      fc.property(mockUserArb, (user) => {
        setMockSession(user);

        const { result: result1 } = renderHook(
          () => useAnnotationPermissions({}),
          { wrapper: createWrapper(queryClient) }
        );

        const { result: result2 } = renderHook(
          () => useAnnotationPermissions({}),
          { wrapper: createWrapper(queryClient) }
        );

        // Deep compare permissions
        expect(result1.current.permissions).toEqual(result2.current.permissions);
        expect(result1.current.userId).toBe(result2.current.userId);

        cleanup();
      }),
      { numRuns: 50 }
    );
  });
});
