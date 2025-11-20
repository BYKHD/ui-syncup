"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { sessionResponseSchema, type SessionResponse } from "../api/types";

const SESSION_QUERY_KEY = ["auth", "session"] as const;
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches the current user session from /api/auth/me
 */
async function fetchSession(): Promise<SessionResponse> {
  const response = await apiClient<SessionResponse>("/api/auth/me", {
    method: "GET",
  });

  // Validate response with Zod schema
  return sessionResponseSchema.parse(response);
}

/**
 * Hook to access the current user session
 * 
 * Features:
 * - Caches session data for 5 minutes
 * - Automatic retry with exponential backoff
 * - Returns loading, error, and data states
 * 
 * @returns Query result with session data, loading state, and error
 */
export function useSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: (failureCount, error) => {
      // Don't retry on 401 (not authenticated)
      if (error instanceof Error && "status" in error && error.status === 401) {
        return false;
      }
      // Retry up to 3 times with exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
  });

  /**
   * Invalidates the session cache, forcing a refetch
   * Should be called after sign-in, sign-out, or other auth state changes
   */
  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  };

  return {
    ...query,
    session: query.data,
    user: query.data?.user,
    isAuthenticated: !!query.data?.user,
    invalidateSession,
  };
}

/**
 * Hook to invalidate session cache from any component
 * Useful for sign-in/sign-out flows
 */
export function useInvalidateSession() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  };
}
