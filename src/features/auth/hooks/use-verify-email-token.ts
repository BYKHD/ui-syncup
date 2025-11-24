"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { successResponseSchema, type SuccessResponse, type ErrorResponse } from "../api/types";

type VerificationStatus = "verifying" | "success" | "expired" | "already_verified" | "error";

type UseVerifyEmailTokenOptions = {
  token?: string;
  autoVerify?: boolean;
};

/**
 * Verify email token API call
 */
async function verifyEmailToken(token: string): Promise<SuccessResponse> {
  const response = await apiClient<SuccessResponse>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });

  // Validate response with Zod schema
  return successResponseSchema.parse(response);
}

/**
 * Hook for email verification via token
 *
 * Features:
 * - React Query mutation to GET /api/auth/verify-email?token=xxx
 * - Auto-verifies on mount if token provided
 * - Handles token errors (expired, invalid, already used)
 * - Tracks verification status with detailed states
 *
 * @param options Configuration options
 * @returns Verification state and handlers
 */
export function useVerifyEmailToken(options: UseVerifyEmailTokenOptions = {}) {
  const { token = "", autoVerify = true } = options;

  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [message, setMessage] = useState<string | null>(null);

  // Verify email mutation
  const mutation = useMutation({
    mutationFn: verifyEmailToken,
    onMutate: () => {
      setStatus("verifying");
      setMessage(null);
    },
    onSuccess: (data) => {
      setStatus("success");
      setMessage(data.message || "Your email has been verified successfully!");
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;

        // Handle gone errors (410) - token already used / email already verified
        if (error.status === 410) {
          setStatus("already_verified");
          setMessage(
            errorPayload?.error?.message ||
            "This email has already been verified. You can sign in to your account."
          );
          return;
        }

        // Handle unauthorized errors (401) - invalid or expired token
        if (error.status === 401) {
          setStatus("expired");
          setMessage(
            errorPayload?.error?.message ||
            "This verification link is invalid or has expired. Please request a new one."
          );
          return;
        }

        // Handle bad request (400) - missing or malformed token
        if (error.status === 400) {
          setStatus("error");
          setMessage(
            errorPayload?.error?.message ||
            "Invalid verification link. Please check the link and try again."
          );
          return;
        }

        // Handle other errors
        setStatus("error");
        setMessage(
          errorPayload?.error?.message ||
          "An unexpected error occurred during verification. Please try again."
        );
      } else {
        // Handle network or other errors
        setStatus("error");
        setMessage("Unable to connect. Please check your internet connection and try again.");
      }
    },
  });

  // Auto-verify on mount if token is provided
  useEffect(() => {
    if (token && autoVerify && !mutation.isSuccess && !mutation.isPending) {
      mutation.mutate(token);
    }
  }, [token, autoVerify]); // Intentionally omitting mutation to avoid re-triggering

  const retry = () => {
    if (token) {
      mutation.mutate(token);
    }
  };

  return {
    status,
    message,
    retry,
    isVerifying: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
