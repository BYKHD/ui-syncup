import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as fc from "fast-check";
import React from "react";
import { useInvalidateSession } from "../use-session";

/**
 * Property-Based Tests for Session Management
 * 
 * These tests use fast-check to generate random inputs and verify
 * that session caching and invalidation behave correctly.
 */

describe("Session Cache Management - Property-Based Tests", () => {
  /**
   * Feature: authentication-system, Property 29: Auth state changes invalidate cache
   * Validates: Requirements 10.2
   * 
   * For any sign-in or sign-out action, cached session data should be invalidated
   * and re-fetched to reflect the new authentication state.
   * 
   * This test verifies the core mechanism: that calling invalidateSession
   * properly calls QueryClient.invalidateQueries with the correct query key.
   * 
   * This is the fundamental behavior that ensures cache invalidation works correctly.
   */
  it("Property 29: Auth state changes invalidate cache", () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.string({ minLength: 3, maxLength: 50 }).map(s => `${s}@example.com`),
          name: fc.string({ minLength: 1, maxLength: 120 }),
        }),
        (userData) => {
          // Create a QueryClient with a spy on invalidateQueries
          const queryClient = new QueryClient();
          const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          );

          // Render the invalidation hook
          const { result } = renderHook(() => useInvalidateSession(), { wrapper });

          // Call the invalidation function (simulating sign-in/sign-out)
          result.current();

          // Verify QueryClient.invalidateQueries was called with the session query key
          // This is the core property: invalidation triggers a cache clear
          expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ["auth", "session"],
          });

          // Verify it was called exactly once
          expect(invalidateSpy).toHaveBeenCalledTimes(1);

          // Cleanup
          invalidateSpy.mockRestore();
          queryClient.clear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 29 (multiple invalidations): Multiple invalidations work correctly
   * 
   * Verifies that calling invalidateSession multiple times correctly
   * triggers cache invalidation each time.
   */
  it("Property 29 (multiple invalidations): Multiple cache invalidations work correctly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (numInvalidations) => {
          const queryClient = new QueryClient();
          const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          );

          const { result } = renderHook(() => useInvalidateSession(), { wrapper });

          // Call invalidation multiple times
          for (let i = 0; i < numInvalidations; i++) {
            result.current();
          }

          // Verify invalidateQueries was called the correct number of times
          expect(invalidateSpy).toHaveBeenCalledTimes(numInvalidations);

          // Verify each call had the correct query key
          for (let i = 0; i < numInvalidations; i++) {
            expect(invalidateSpy).toHaveBeenNthCalledWith(i + 1, {
              queryKey: ["auth", "session"],
            });
          }

          // Cleanup
          invalidateSpy.mockRestore();
          queryClient.clear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 29 (query key consistency): Query key remains consistent
   * 
   * Verifies that the session query key used for invalidation is always
   * the same, ensuring cache invalidation targets the correct data.
   */
  it("Property 29 (query key consistency): Session query key is consistent", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (numTests) => {
          const queryKeys: unknown[][] = [];

          for (let i = 0; i < numTests; i++) {
            const queryClient = new QueryClient();
            const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

            const wrapper = ({ children }: { children: React.ReactNode }) => (
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => useInvalidateSession(), { wrapper });
            result.current();

            // Extract the query key from the spy call
            const call = invalidateSpy.mock.calls[0];
            if (call && call[0] && typeof call[0] === "object" && "queryKey" in call[0]) {
              queryKeys.push((call[0] as { queryKey: unknown[] }).queryKey);
            }

            invalidateSpy.mockRestore();
            queryClient.clear();
          }

          // Verify all query keys are identical
          const firstKey = JSON.stringify(queryKeys[0]);
          for (const key of queryKeys) {
            expect(JSON.stringify(key)).toBe(firstKey);
          }

          // Verify the query key structure
          expect(queryKeys[0]).toEqual(["auth", "session"]);
        }
      ),
      { numRuns: 50 }
    );
  });
});
