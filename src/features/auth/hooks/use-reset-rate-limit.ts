"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type ResetRateLimitOptions = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

type ResetRateLimitParams = {
  key?: string; // Optional: specific key to reset (e.g., "signin:email:user@example.com")
};

/**
 * Reset rate limits API call
 */
async function resetRateLimit(params?: ResetRateLimitParams): Promise<{ message: string; cleared: string }> {
  const response = await apiClient<{ message: string; cleared: string }>(
    "/api/auth/dev/reset-rate-limit",
    {
      method: "POST",
      body: params || {},
    }
  );

  return response;
}

/**
 * Hook for resetting rate limits (dev only)
 * 
 * @param options Configuration options
 * @returns Mutation state and reset function
 */
export function useResetRateLimit(options: ResetRateLimitOptions = {}) {
  const { onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: resetRateLimit,
    onSuccess: (data) => {
      onSuccess?.();
    },
    onError: (error: unknown) => {
      onError?.(error);
    },
  });

  return {
    resetRateLimit: mutation.mutate,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
