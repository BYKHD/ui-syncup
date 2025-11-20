/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as fc from "fast-check";
import React from "react";
import type { Role } from "@/config/roles";
import type { UserRole } from "../../api/types";
import { RoleGate } from "../role-gate";

/**
 * Property-Based Tests for RoleGate Component
 * 
 * These tests use fast-check to generate random inputs and verify
 * that permission checks behave correctly across all possible inputs.
 * 
 * Uses dependency injection for the useSession hook to avoid mocking issues.
 */

describe("RoleGate Component - Property-Based Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Arbitraries (generators) for property-based testing
   */

  // Generate valid role strings
  const roleArb = fc.constantFrom(
    "TEAM_OWNER",
    "TEAM_ADMIN",
    "TEAM_EDITOR",
    "TEAM_MEMBER",
    "TEAM_VIEWER",
    "PROJECT_OWNER",
    "PROJECT_EDITOR",
    "PROJECT_DEVELOPER",
    "PROJECT_VIEWER"
  ) as fc.Arbitrary<Role>;

  // Generate resource types
  const resourceTypeArb = fc.constantFrom("team", "project") as fc.Arbitrary<
    "team" | "project"
  >;

  // Generate user role objects
  const userRoleArb = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    role: roleArb,
    resourceType: resourceTypeArb,
    resourceId: fc.uuid(),
    createdAt: fc
      .integer({ min: Date.parse("2020-01-01"), max: Date.now() })
      .map((timestamp) => new Date(timestamp).toISOString()),
  }) as fc.Arbitrary<UserRole>;

  // Generate user objects with roles
  const userWithRolesArb = fc.record({
    id: fc.uuid(),
    email: fc
      .string({ minLength: 3, maxLength: 50 })
      .map((s) => `${s}@example.com`),
    name: fc.string({ minLength: 1, maxLength: 120 }),
    emailVerified: fc.boolean(),
    createdAt: fc
      .integer({ min: Date.parse("2020-01-01"), max: Date.now() })
      .map((timestamp) => new Date(timestamp).toISOString()),
    updatedAt: fc
      .integer({ min: Date.parse("2020-01-01"), max: Date.now() })
      .map((timestamp) => new Date(timestamp).toISOString()),
    roles: fc.array(userRoleArb, { minLength: 0, maxLength: 10 }),
  });

  /**
   * Feature: authentication-system, Property 31: Permission hooks return correct boolean results
   * Validates: Requirements 10.4
   * 
   * For any permission check, the hook should return a boolean based on RBAC rules.
   * 
   * This test verifies that RoleGate correctly checks if a user has any of the
   * required roles and renders children or fallback accordingly.
   */
  it("Property 31: Permission checks return correct boolean results", () => {
    fc.assert(
      fc.property(
        userWithRolesArb,
        fc.array(roleArb, { minLength: 1, maxLength: 5 }),
        (user, requiredRoles) => {
          // Create a mock useSession hook for this iteration
          const mockUseSession = () => ({
            user,
            isLoading: false,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );

          // Determine expected result: user should have at least one required role
          const userRoleStrings = user.roles?.map((r) => r.role) || [];
          const hasRequiredRole = requiredRoles.some((role) =>
            userRoleStrings.includes(role)
          );

          // Render RoleGate with injected useSession
          const { container } = render(
            <RoleGate
              roles={requiredRoles}
              fallback={<div>Unauthorized</div>}
              useSession={mockUseSession}
            >
              <div>Authorized Content</div>
            </RoleGate>,
            { wrapper }
          );

          // Verify correct rendering based on permission check
          const authorizedContent = container.textContent?.includes(
            "Authorized Content"
          );
          const unauthorizedContent = container.textContent?.includes(
            "Unauthorized"
          );

          if (hasRequiredRole) {
            expect(authorizedContent).toBe(true);
            expect(unauthorizedContent).toBe(false);
          } else {
            expect(authorizedContent).toBe(false);
            expect(unauthorizedContent).toBe(true);
          }

          // Cleanup for next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31 (resource filtering): Resource type filtering works correctly
   * 
   * Verifies that when resourceType is specified, only roles for that
   * resource type are considered in the permission check.
   */
  it("Property 31 (resource filtering): Resource type filtering works correctly", () => {
    fc.assert(
      fc.property(
        userWithRolesArb,
        fc.array(roleArb, { minLength: 1, maxLength: 5 }),
        resourceTypeArb,
        (user, requiredRoles, resourceType) => {
          const mockUseSession = () => ({
            user,
            isLoading: false,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );

          // Filter user roles by resource type
          const filteredRoles =
            user.roles?.filter((r) => r.resourceType === resourceType) || [];
          const filteredRoleStrings = filteredRoles.map((r) => r.role);
          const hasRequiredRole = requiredRoles.some((role) =>
            filteredRoleStrings.includes(role)
          );

          const { container } = render(
            <RoleGate
              roles={requiredRoles}
              resourceType={resourceType}
              fallback={<div>Unauthorized</div>}
              useSession={mockUseSession}
            >
              <div>Authorized Content</div>
            </RoleGate>,
            { wrapper }
          );

          const authorizedContent = container.textContent?.includes(
            "Authorized Content"
          );
          const unauthorizedContent = container.textContent?.includes(
            "Unauthorized"
          );

          if (hasRequiredRole) {
            expect(authorizedContent).toBe(true);
            expect(unauthorizedContent).toBe(false);
          } else {
            expect(authorizedContent).toBe(false);
            expect(unauthorizedContent).toBe(true);
          }

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31 (resource ID filtering): Resource ID filtering works correctly
   * 
   * Verifies that when both resourceType and resourceId are specified,
   * only roles for that specific resource are considered.
   */
  it("Property 31 (resource ID filtering): Resource ID filtering works correctly", () => {
    fc.assert(
      fc.property(
        userWithRolesArb,
        fc.array(roleArb, { minLength: 1, maxLength: 5 }),
        resourceTypeArb,
        fc.uuid(),
        (user, requiredRoles, resourceType, resourceId) => {
          const mockUseSession = () => ({
            user,
            isLoading: false,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );

          // Filter user roles by resource type and ID
          const filteredRoles =
            user.roles?.filter(
              (r) =>
                r.resourceType === resourceType && r.resourceId === resourceId
            ) || [];
          const filteredRoleStrings = filteredRoles.map((r) => r.role);
          const hasRequiredRole = requiredRoles.some((role) =>
            filteredRoleStrings.includes(role)
          );

          const { container } = render(
            <RoleGate
              roles={requiredRoles}
              resourceType={resourceType}
              resourceId={resourceId}
              fallback={<div>Unauthorized</div>}
              useSession={mockUseSession}
            >
              <div>Authorized Content</div>
            </RoleGate>,
            { wrapper }
          );

          const authorizedContent = container.textContent?.includes(
            "Authorized Content"
          );
          const unauthorizedContent = container.textContent?.includes(
            "Unauthorized"
          );

          if (hasRequiredRole) {
            expect(authorizedContent).toBe(true);
            expect(unauthorizedContent).toBe(false);
          } else {
            expect(authorizedContent).toBe(false);
            expect(unauthorizedContent).toBe(true);
          }

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31 (no roles): Users with no roles are always unauthorized
   * 
   * Verifies that users with empty roles array are always denied access.
   */
  it("Property 31 (no roles): Users with no roles are always unauthorized", () => {
    fc.assert(
      fc.property(
        fc.array(roleArb, { minLength: 1, maxLength: 5 }),
        (requiredRoles) => {
          const userWithoutRoles = {
            id: "user-123",
            email: "test@example.com",
            name: "Test User",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: [],
          };

          const mockUseSession = () => ({
            user: userWithoutRoles,
            isLoading: false,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );

          const { container } = render(
            <RoleGate
              roles={requiredRoles}
              fallback={<div>Unauthorized</div>}
              useSession={mockUseSession}
            >
              <div>Authorized Content</div>
            </RoleGate>,
            { wrapper }
          );

          // User with no roles should always be unauthorized
          const authorizedContent = container.textContent?.includes(
            "Authorized Content"
          );
          const unauthorizedContent = container.textContent?.includes(
            "Unauthorized"
          );

          expect(authorizedContent).toBe(false);
          expect(unauthorizedContent).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31 (loading state): Loading state renders nothing
   * 
   * Verifies that while session is loading, RoleGate renders nothing
   * to avoid flashing unauthorized content.
   */
  it("Property 31 (loading state): Loading state renders nothing", () => {
    fc.assert(
      fc.property(
        fc.array(roleArb, { minLength: 1, maxLength: 5 }),
        (requiredRoles) => {
          const mockUseSession = () => ({
            user: undefined,
            isLoading: true,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );

          const { container } = render(
            <RoleGate
              roles={requiredRoles}
              fallback={<div>Unauthorized</div>}
              useSession={mockUseSession}
            >
              <div>Authorized Content</div>
            </RoleGate>,
            { wrapper }
          );

          // While loading, nothing should be rendered
          expect(container.textContent).toBe("");
          expect(container.firstChild).toBeNull();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31 (no user): No user renders fallback
   * 
   * Verifies that when there's no authenticated user, fallback is rendered.
   */
  it("Property 31 (no user): No user renders fallback", () => {
    fc.assert(
      fc.property(
        fc.array(roleArb, { minLength: 1, maxLength: 5 }),
        (requiredRoles) => {
          const mockUseSession = () => ({
            user: undefined,
            isLoading: false,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          );

          const { container } = render(
            <RoleGate
              roles={requiredRoles}
              fallback={<div>Unauthorized</div>}
              useSession={mockUseSession}
            >
              <div>Authorized Content</div>
            </RoleGate>,
            { wrapper }
          );

          // No user should render fallback
          const authorizedContent = container.textContent?.includes(
            "Authorized Content"
          );
          const unauthorizedContent = container.textContent?.includes(
            "Unauthorized"
          );

          expect(authorizedContent).toBe(false);
          expect(unauthorizedContent).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
