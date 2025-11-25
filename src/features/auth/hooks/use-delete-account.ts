"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient, ApiError } from "@/lib/api-client";
import { successResponseSchema, type SuccessResponse, type ErrorResponse } from "../api/types";
import { useInvalidateSession } from "./use-session";

type UseDeleteAccountOptions = {
  onSuccess?: () => void;
  redirectTo?: string;
};

/**
 * Delete account API call
 */
async function deleteAccount(): Promise<SuccessResponse> {
  const response = await apiClient<SuccessResponse>("/api/auth/delete-account", {
    method: "DELETE",
  });

  // Validate response with Zod schema
  return successResponseSchema.parse(response);
}

/**
 * Hook for user account deletion (DEV ONLY)
 *
 * Features:
 * - React Query mutation to DELETE /api/auth/delete-account
 * - Clears session cache on success
 * - Redirects to sign-in page
 * - Deletes all user data (sessions, roles, verification tokens, user record)
 *
 * WARNING: This is a destructive operation and cannot be undone.
 * This hook is intended for development/testing only.
 *
 * @param options Configuration options
 * @returns Mutation state and delete account handler
 */
export function useDeleteAccount(options: UseDeleteAccountOptions = {}) {
  const { onSuccess, redirectTo = "/sign-in" } = options;
  const router = useRouter();
  const invalidateSession = useInvalidateSession();

  // Delete account mutation
  const mutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      // Clear session cache
      invalidateSession();

      // Call custom success handler
      onSuccess?.();

      // Redirect to sign-in page
      router.push(redirectTo);
    },
    onError: (error: unknown) => {
      // On error, clear session cache (in case of partial deletion)
      invalidateSession();

      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;

        // Log error
        console.error("Delete account error:", errorPayload?.error?.message || "Unknown error");
      } else {
        console.error("Delete account error:", error);
      }
    },
  });

  const deleteUserAccount = () => {
    mutation.mutate();
  };

  return {
    deleteAccount: deleteUserAccount,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
