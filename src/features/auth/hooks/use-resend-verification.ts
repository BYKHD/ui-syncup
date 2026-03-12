"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

interface ResendVerificationRequest {
  email: string;
}

interface ResendVerificationResponse {
  message: string;
}

/**
 * Resend verification email API call
 */
async function resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
  return await apiClient<ResendVerificationResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: data as unknown as Record<string, unknown>,
  });
}

/**
 * Hook for resending verification emails
 *
 * Features:
 * - React Query mutation to POST /api/auth/resend-verification
 * - Handles rate limiting with retry-after from server
 * - Client-side 60-second countdown to prevent spam
 * - Shows toast notifications
 * - Tracks loading and error states
 *
 * @returns Mutation state, resend handler, and countdown timer
 */
export function useResendVerification() {
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const mutation = useMutation({
    mutationFn: resendVerification,
    onMutate: () => {
      setRetryAfter(null);
    },
    onSuccess: () => {
      // Start 60-second countdown after successful send
      setCountdown(60);

      toast.success("Verification email sent", {
        description: "Please check your inbox and spam folder.",
      });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        const errorPayload = error.payload as any;

        // Handle rate limit errors (429)
        if (error.status === 429) {
          const retryTime = errorPayload?.error?.retryAfter || 60;
          setRetryAfter(retryTime);
          setCountdown(retryTime); // Also set countdown to match server rate limit

          toast.error("Too many requests", {
            description: `Please wait ${retryTime} seconds before trying again.`,
          });
          return;
        }

        // Handle validation errors (400)
        if (error.status === 400) {
          toast.error("Invalid email", {
            description: errorPayload?.error?.message || "Please provide a valid email address.",
          });
          return;
        }

        // Handle other errors
        toast.error("Failed to send verification email", {
          description: errorPayload?.error?.message || "Please try again later.",
        });
      } else {
        // Network or unexpected errors
        toast.error("Connection error", {
          description: "Please check your internet connection and try again.",
        });
      }
    },
  });

  /**
   * Resend verification email for the given email address
   */
  const resend = useCallback((email: string) => {
    if (countdown > 0) {
      toast.error("Please wait", {
        description: `You can resend in ${countdown} seconds.`,
      });
      return;
    }
    mutation.mutate({ email });
  }, [countdown, mutation]);

  /**
   * Reset countdown (useful for testing or special cases)
   */
  const resetCountdown = useCallback(() => {
    setCountdown(0);
  }, []);

  return {
    resend,
    resetCountdown,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    retryAfter,
    countdown,
    canResend: countdown === 0 && !mutation.isPending,
  };
}
