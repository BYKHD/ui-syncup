"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
};

type SessionsResponse = {
  sessions: Session[];
  total: number;
};

const SESSIONS_QUERY_KEY = ["auth", "sessions"] as const;

/**
 * Fetches all active sessions for the current user
 */
async function fetchSessions(): Promise<SessionsResponse> {
  const response = await apiClient<SessionsResponse>("/api/auth/dev/sessions", {
    method: "GET",
  });

  return response;
}

/**
 * Hook to list all active sessions for the current user (DEV ONLY)
 * 
 * Features:
 * - Fetches all sessions from /api/auth/dev/sessions
 * - Shows session details (IP, user agent, expiration)
 * - Indicates which session is current
 * 
 * WARNING: This hook is intended for development/testing only.
 * 
 * @returns Query result with sessions data, loading state, and error
 */
export function useSessions() {
  const query = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: fetchSessions,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    retry: false, // Don't retry on error
  });

  return {
    ...query,
    sessions: query.data?.sessions || [],
    total: query.data?.total || 0,
  };
}
