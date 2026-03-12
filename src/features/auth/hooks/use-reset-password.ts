"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { resetPasswordSchema, type ResetPasswordSchema } from "../utils/validators";
import { apiClient, ApiError } from "@/lib/api-client";
import { successResponseSchema, type SuccessResponse, type ErrorResponse } from "../api/types";

type SubmissionStatus = "idle" | "submitting" | "success";

type UseResetPasswordOptions = {
  token?: string;
  onSuccess?: (data: SuccessResponse) => void;
  redirectTo?: string;
};

/**
 * Reset password API call
 */
async function resetPassword(data: ResetPasswordSchema): Promise<SuccessResponse> {
  const response = await apiClient<SuccessResponse>("/api/auth/reset-password", {
    method: "POST",
    body: {
      token: data.token,
      password: data.password,
    },
  });

  // Validate response with Zod schema
  return successResponseSchema.parse(response);
}

/**
 * Hook for password reset flow
 * 
 * Features:
 * - React Query mutation to POST /api/auth/reset-password
 * - Handles validation errors (400)
 * - Handles token errors (expired, already used)
 * - Redirects to sign-in on success
 * 
 * Validates: Requirements 6.2, 6.3, 6.4
 * 
 * @param options Configuration options
 * @returns Form state, handlers, and mutation state
 */
export function useResetPassword(options: UseResetPasswordOptions = {}) {
  const { token = "", onSuccess, redirectTo = "/sign-in" } = options;
  const router = useRouter();

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Reset password mutation
  const mutation = useMutation({
    mutationFn: resetPassword,
    onMutate: () => {
      setStatus("submitting");
      setMessage(null);
    },
    onSuccess: (data) => {
      setStatus("success");
      setMessage(data.message || "Password reset successfully. You can now sign in with your new password.");
      
      // Call custom success handler
      onSuccess?.(data);
      
      // Redirect to sign-in after a short delay
      setTimeout(() => {
        router.push(redirectTo);
      }, 2000);
    },
    onError: (error: unknown) => {
      setStatus("idle");
      
      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;
        
        // Handle validation errors (400)
        if (error.status === 400) {
          const fieldError = errorPayload?.error;
          if (fieldError?.field) {
            // Set field-specific error
            form.setError(fieldError.field as keyof ResetPasswordSchema, {
              type: "manual",
              message: fieldError.message,
            });
          } else {
            setMessage(fieldError?.message || "Invalid input. Please check your information.");
          }
          return;
        }
        
        // Handle gone errors (410) - token already used
        if (error.status === 410) {
          setMessage(
            errorPayload?.error?.message || 
            "This password reset link has already been used. Please request a new one."
          );
          return;
        }
        
        // Handle unauthorized errors (401) - invalid or expired token
        if (error.status === 401) {
          setMessage(
            errorPayload?.error?.message || 
            "This password reset link is invalid or has expired. Please request a new one."
          );
          return;
        }
        
        // Handle other errors
        setMessage(
          errorPayload?.error?.message || 
          "An unexpected error occurred. Please try again."
        );
      } else {
        // Handle network or other errors
        setMessage("Unable to connect. Please check your internet connection.");
      }
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return {
    form,
    status,
    message,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
