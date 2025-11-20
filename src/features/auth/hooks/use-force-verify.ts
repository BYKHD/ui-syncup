"use client";

import { useMutation } from "@tanstack/react-query";

import { apiClient, ApiError } from "@/lib/api-client";
import { type ErrorResponse } from "../api/types";
import { useInvalidateSession } from "./use-session";

type ForceVerifyResponse = {
  message: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
};

type UseForceVerifyOptions = {
  onSuccess?: (data: ForceVerifyResponse) => void;
  onError?: (error: unknown) => void;
};

/**
 * Force verify email API call
 */
async function forceVerify(): Promise<ForceVerifyResponse> {
  const response = await apiClient<ForceVerifyResponse>("/api/auth/dev/force-verify", {
    method: "POST",
  });

  return response;
}

/**
 * Hook for forcing email verification (DEV ONLY)
 *
 * Features:
 * - React Query mutation to POST /api/auth/dev/force-verify
 * - Invalidates session cache on success (to refresh emailVerified status)
 * - Bypasses normal verification token flow
 *
 * WARNING: This bypasses the normal verification flow and should only be
 * used in development/testing environments.
 *
 * @param options Configuration options
 * @returns Mutation state and force verify handler
 */
export function useForceVerify(options: UseForceVerifyOptions = {}) {
  const { onSuccess, onError } = options;
  const invalidateSession = useInvalidateSession();

  // Force verify mutation
  const mutation = useMutation({
    mutationFn: forceVerify,
    onSuccess: (data) => {
      // Invalidate session cache to refresh emailVerified status
      invalidateSession();

      // Call custom success handler
      onSuccess?.(data);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;

        // Log error
        console.error("Force verify error:", errorPayload?.error?.message || "Unknown error");
      } else {
        console.error("Force verify error:", error);
      }

      // Call custom error handler
      onError?.(error);
    },
  });

  const forceVerifyEmail = () => {
    mutation.mutate();
  };

  return {
    forceVerify: forceVerifyEmail,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}
