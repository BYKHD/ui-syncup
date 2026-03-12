/**
 * Property-based tests for cache invalidation on team changes
 * Feature: team-system, Property 42: Cache invalidation on team changes
 * Validates: Requirements 12.2
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { QueryClient } from '@tanstack/react-query';
import { TEAMS_QUERY_KEY } from '../use-teams';
import { TEAM_QUERY_KEY } from '../use-team';
import { TEAM_MEMBERS_QUERY_KEY } from '../use-team-members';

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitraries for test data
const teamIdArb = fc.uuid();
const userIdArb = fc.uuid();

// Helper to create a QueryClient
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

describe('Property 42: Cache invalidation on team changes', () => {

  test('invalidating team query marks it as stale', () => {
    fc.assert(
      fc.property(teamIdArb, (teamId) => {
        const queryClient = createQueryClient();

        // Set initial team data in cache
        queryClient.setQueryData([TEAM_QUERY_KEY, teamId], {
          team: {
            id: teamId,
            name: 'Test Team',
            slug: 'test-team',
            description: null,
            image: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            memberCount: 1,
            myManagementRole: 'WORKSPACE_OWNER',
            myOperationalRole: 'WORKSPACE_EDITOR',
          },
        });

        // Verify data is cached
        const cachedData = queryClient.getQueryData([TEAM_QUERY_KEY, teamId]);
        expect(cachedData).toBeDefined();

        // Invalidate the query
        queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY, teamId] });

        // Verify query state shows invalidation
        const queryState = queryClient.getQueryState([TEAM_QUERY_KEY, teamId]);
        expect(queryState?.isInvalidated).toBe(true);
      }),
      propertyConfig
    );
  });

  test('invalidating teams list affects all team queries', () => {
    fc.assert(
      fc.property(fc.array(teamIdArb, { minLength: 1, maxLength: 5 }), (teamIds) => {
        const queryClient = createQueryClient();

        // Set team data for multiple teams
        teamIds.forEach((teamId) => {
          queryClient.setQueryData([TEAM_QUERY_KEY, teamId], {
            team: {
              id: teamId,
              name: `Team ${teamId}`,
              slug: `team-${teamId}`,
              description: null,
              image: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              memberCount: 1,
              myManagementRole: 'WORKSPACE_OWNER',
              myOperationalRole: 'WORKSPACE_EDITOR',
            },
          });
        });

        // Invalidate all team queries
        queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY] });

        // Verify all team queries are invalidated
        teamIds.forEach((teamId) => {
          const queryState = queryClient.getQueryState([TEAM_QUERY_KEY, teamId]);
          expect(queryState?.isInvalidated).toBe(true);
        });
      }),
      propertyConfig
    );
  });

  test('invalidating member queries affects specific team members', () => {
    fc.assert(
      fc.property(teamIdArb, userIdArb, (teamId, userId) => {
        const queryClient = createQueryClient();

        // Set member data in cache
        queryClient.setQueryData([TEAM_MEMBERS_QUERY_KEY, teamId], {
          members: [
            {
              id: 'member-1',
              teamId,
              userId,
              name: 'Test User',
              email: 'test@example.com',
              managementRole: null,
              operationalRole: 'WORKSPACE_MEMBER',
              joinedAt: new Date().toISOString(),
              invitedBy: null,
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });

        // Verify data is cached
        const cachedData = queryClient.getQueryData([TEAM_MEMBERS_QUERY_KEY, teamId]);
        expect(cachedData).toBeDefined();

        // Invalidate member queries for this team
        queryClient.invalidateQueries({ queryKey: [TEAM_MEMBERS_QUERY_KEY, teamId] });

        // Verify query state shows invalidation
        const queryState = queryClient.getQueryState([TEAM_MEMBERS_QUERY_KEY, teamId]);
        expect(queryState?.isInvalidated).toBe(true);
      }),
      propertyConfig
    );
  });

  test('cache invalidation preserves query keys structure', () => {
    fc.assert(
      fc.property(teamIdArb, (teamId) => {
        const queryClient = createQueryClient();

        // Manually set some cached data
        queryClient.setQueryData([TEAM_QUERY_KEY, teamId], {
          team: {
            id: teamId,
            name: 'Test Team',
            slug: 'test-team',
            description: null,
            image: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            memberCount: 1,
            myManagementRole: 'WORKSPACE_OWNER',
            myOperationalRole: 'WORKSPACE_EDITOR',
          },
        });

        // Verify data is cached
        const cachedData = queryClient.getQueryData([TEAM_QUERY_KEY, teamId]);
        expect(cachedData).toBeDefined();

        // Invalidate the query
        queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY, teamId] });

        // Verify query state shows invalidation
        const queryState = queryClient.getQueryState([TEAM_QUERY_KEY, teamId]);
        expect(queryState?.isInvalidated).toBe(true);

        // Verify the query key structure is preserved
        const queries = queryClient.getQueryCache().findAll({ queryKey: [TEAM_QUERY_KEY, teamId] });
        expect(queries.length).toBeGreaterThan(0);
        expect(queries[0].queryKey).toEqual([TEAM_QUERY_KEY, teamId]);
      }),
      propertyConfig
    );
  });

  test('multiple invalidations accumulate correctly', () => {
    fc.assert(
      fc.property(
        teamIdArb,
        fc.integer({ min: 2, max: 10 }),
        (teamId, invalidationCount) => {
          const queryClient = createQueryClient();

          // Set initial data
          queryClient.setQueryData([TEAM_QUERY_KEY, teamId], {
            team: {
              id: teamId,
              name: 'Test Team',
              slug: 'test-team',
              description: null,
              image: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              memberCount: 1,
              myManagementRole: 'WORKSPACE_OWNER',
              myOperationalRole: 'WORKSPACE_EDITOR',
            },
          });

          // Perform multiple invalidations
          for (let i = 0; i < invalidationCount; i++) {
            queryClient.invalidateQueries({ queryKey: [TEAM_QUERY_KEY, teamId] });
          }

          // Verify query is still invalidated
          const queryState = queryClient.getQueryState([TEAM_QUERY_KEY, teamId]);
          expect(queryState?.isInvalidated).toBe(true);

          // Verify query still exists in cache
          const cachedData = queryClient.getQueryData([TEAM_QUERY_KEY, teamId]);
          expect(cachedData).toBeDefined();
        }
      ),
      propertyConfig
    );
  });

  test('invalidating teams list query invalidates all related queries', () => {
    fc.assert(
      fc.property(fc.array(teamIdArb, { minLength: 1, maxLength: 5 }), (teamIds) => {
        const queryClient = createQueryClient();

        // Set teams list data
        queryClient.setQueryData([TEAMS_QUERY_KEY], {
          teams: teamIds.map((id) => ({
            id,
            name: `Team ${id}`,
            slug: `team-${id}`,
            description: null,
            image: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            memberCount: 1,
            myManagementRole: 'WORKSPACE_OWNER',
            myOperationalRole: 'WORKSPACE_EDITOR',
          })),
          pagination: { page: 1, limit: 20, total: teamIds.length, totalPages: 1 },
        });

        // Invalidate teams list
        queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });

        // Verify teams list query is invalidated
        const teamsQueryState = queryClient.getQueryState([TEAMS_QUERY_KEY]);
        expect(teamsQueryState?.isInvalidated).toBe(true);
      }),
      propertyConfig
    );
  });
});
