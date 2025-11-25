"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { signUpSchema, type SignUpSchema } from "../utils/validators";
import { apiClient, ApiError } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { successResponseSchema, type SuccessResponse, type ErrorResponse } from "../api/types";

type SubmissionStatus = "idle" | "submitting" | "success";

type UseSignUpOptions = {
  defaultValues?: Partial<SignUpSchema>;
  onSuccess?: (data: SuccessResponse) => void;
};

/**
 * Sign up API call
 */
async function signUp(data: SignUpSchema): Promise<SuccessResponse> {
  const response = await apiClient<SuccessResponse>("/api/auth/signup", {
    method: "POST",
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  // Validate response with Zod schema
  return successResponseSchema.parse(response);
}

/**
 * Hook for user sign-up
 * 
 * Features:
 * - React Query mutation to POST /api/auth/signup
 * - Handles validation errors (400)
 * - Handles duplicate email errors (409)
 * - Displays success message
 * 
 * @param options Configuration options
 * @returns Form state, handlers, and mutation state
 */
export function useSignUp(options: UseSignUpOptions = {}) {
  const { defaultValues, onSuccess } = options;

  const form = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      email: defaultValues?.email || "",
      password: defaultValues?.password || "",
      confirmPassword: defaultValues?.confirmPassword || "",
    },
  });

  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isLongLoading, setIsLongLoading] = useState(false);

  // Sign-up mutation
  const mutation = useMutation({
    mutationFn: signUp,
    onMutate: () => {
      setStatus("submitting");
      setMessage(null);
      setIsLongLoading(false);
      
      // Set a timer to trigger "long loading" state if request takes too long
      const timerId = setTimeout(() => {
        setIsLongLoading(true);
      }, 2000);
      
      return { timerId };
    },
    onSuccess: (data, variables, context) => {
      if (context?.timerId) clearTimeout(context.timerId);
      setIsLongLoading(false);
      setStatus("success");
      setMessage(data.message || "Account created successfully! Please check your email to verify your account.");
      
      // Call custom success handler
      onSuccess?.(data);
      
      // Reset form on success
      form.reset();
    },
    onError: (error: unknown, variables, context) => {
      if (context?.timerId) clearTimeout(context.timerId);
      setIsLongLoading(false);
      setStatus("idle");
      
      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;
        
        // Handle validation errors (400)
        if (error.status === 400) {
          const fieldError = errorPayload?.error;
          if (fieldError?.field) {
            // Set field-specific error
            form.setError(fieldError.field as keyof SignUpSchema, {
              type: "manual",
              message: fieldError.message,
            });
          } else {
            setMessage(fieldError?.message || "Invalid input. Please check your information.");
          }
          return;
        }
        
        // Handle duplicate email errors (409)
        if (error.status === 409) {
          setMessage(
            errorPayload?.error?.message || 
            "An account with this email already exists. Please sign in instead."
          );
          // Also set field error on email field
          form.setError("email", {
            type: "manual",
            message: "This email is already registered",
          });
          return;
        }
        
        // Handle rate limit errors (429)
        if (error.status === 429) {
          setMessage(
            errorPayload?.error?.message || 
            "Too many registration attempts. Please try again later."
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

  const [oauthStatus, setOauthStatus] = useState<"idle" | "loading" | "error">("idle");
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleOAuthSignIn = async () => {
    setOauthStatus("loading");
    setOauthError(null);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/projects", // Redirect to projects after sign up
      });
    } catch (error) {
      setOauthStatus("error");
      setOauthError(
        error instanceof Error ? error.message : "Failed to sign up with Google"
      );
    }
  };

  return {
    form,
    status,
    message,
    handleSubmit,
    handleOAuthSignIn,
    oauthStatus,
    oauthError,
    isLoading: mutation.isPending,
    isLongLoading,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
