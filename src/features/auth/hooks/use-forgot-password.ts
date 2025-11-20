"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { forgotPasswordSchema, type ForgotPasswordSchema } from "../utils/validators";
import { apiClient, ApiError } from "@/lib/api-client";
import { successResponseSchema, type SuccessResponse, type ErrorResponse } from "../api/types";

type SubmissionStatus = "idle" | "submitting" | "success";

type UseForgotPasswordOptions = {
  defaultEmail?: string;
  onSuccess?: (data: SuccessResponse) => void;
};

/**
 * Forgot password API call
 */
async function forgotPassword(data: ForgotPasswordSchema): Promise<SuccessResponse> {
  const response = await apiClient<SuccessResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: {
      email: data.email,
    },
  });

  // Validate response with Zod schema
  return successResponseSchema.parse(response);
}

/**
 * Hook for forgot password flow
 * 
 * Features:
 * - React Query mutation to POST /api/auth/forgot-password
 * - Handles validation errors (400)
 * - Handles rate limit errors (429) with retry-after
 * - Displays success message (always, for security)
 * 
 * Validates: Requirements 6.1, 6.5
 * 
 * @param options Configuration options
 * @returns Form state, handlers, and mutation state
 */
export function useForgotPassword(options: UseForgotPasswordOptions = {}) {
  const { defaultEmail = "", onSuccess } = options;

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Forgot password mutation
  const mutation = useMutation({
    mutationFn: forgotPassword,
    onMutate: () => {
      setStatus("submitting");
      setMessage(null);
      setRetryAfter(null);
    },
    onSuccess: (data) => {
      setStatus("success");
      setMessage(
        data.message || 
        "If an account exists with this email, a password reset link has been sent."
      );
      
      // Call custom success handler
      onSuccess?.(data);
      
      // Reset form on success
      form.reset();
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
            form.setError(fieldError.field as keyof ForgotPasswordSchema, {
              type: "manual",
              message: fieldError.message,
            });
          } else {
            setMessage(fieldError?.message || "Invalid email address. Please check and try again.");
          }
          return;
        }
        
        // Handle rate limit errors (429)
        if (error.status === 429) {
          const retryAfterHeader = errorPayload?.error?.details as number | undefined;
          if (retryAfterHeader) {
            setRetryAfter(retryAfterHeader);
          }
          setMessage(
            errorPayload?.error?.message || 
            "Too many password reset requests. Please try again later."
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
    retryAfter,
    handleSubmit,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
