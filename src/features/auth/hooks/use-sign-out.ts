"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient, ApiError } from "@/lib/api-client";
import { successResponseSchema, type SuccessResponse, type ErrorResponse } from "../api/types";
import { useInvalidateSession } from "./use-session";

type UseSignOutOptions = {
  onSuccess?: () => void;
  redirectTo?: string;
};

/**
 * Sign out API call
 */
async function signOut(): Promise<SuccessResponse> {
  const response = await apiClient<SuccessResponse>("/api/auth/logout", {
    method: "POST",
  });

  // Validate response with Zod schema
  return successResponseSchema.parse(response);
}

/**
 * Hook for user sign-out
 * 
 * Features:
 * - React Query mutation to POST /api/auth/logout
 * - Clears session cache on success
 * - Redirects to sign-in page
 * 
 * Validates: Requirements 5.1, 5.2
 * 
 * @param options Configuration options
 * @returns Mutation state and sign-out handler
 */
export function useSignOut(options: UseSignOutOptions = {}) {
  const { onSuccess, redirectTo = "/sign-in" } = options;
  const router = useRouter();
  const invalidateSession = useInvalidateSession();

  // Sign-out mutation
  const mutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Clear session cache
      invalidateSession();
      
      // Call custom success handler
      onSuccess?.();
      
      // Redirect to sign-in page
      router.push(redirectTo);
    },
    onError: (error: unknown) => {
      // Even on error, clear session cache and redirect
      // This handles cases where the session is already invalid
      invalidateSession();
      
      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;
        
        // Log error but still redirect
        console.error("Sign-out error:", errorPayload?.error?.message || "Unknown error");
      } else {
        console.error("Sign-out error:", error);
      }
      
      // Always redirect to sign-in on sign-out attempt
      router.push(redirectTo);
    },
  });

  const signOutUser = () => {
    mutation.mutate();
  };

  return {
    signOut: signOutUser,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
