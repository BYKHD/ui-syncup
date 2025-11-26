"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signInSchema, type SignInSchema } from "../utils/validators";
import { apiClient, ApiError } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { sessionResponseSchema, type SessionResponse, type ErrorResponse } from "../api/types";
import { useInvalidateSession } from "./use-session";

type SubmissionStatus = "idle" | "submitting" | "success";
type OAuthStatus = "idle" | "loading" | "error";

type UseSignInOptions = {
  defaultEmail?: string;
  onSuccess?: (data: SessionResponse) => void;
  redirectTo?: string;
};

/**
 * Sign in API call
 */
async function signIn(credentials: SignInSchema): Promise<SessionResponse> {
  const response = await apiClient<SessionResponse>("/api/auth/login", {
    method: "POST",
    body: credentials,
  });

  // Validate response with Zod schema
  try {
    return sessionResponseSchema.parse(response);
  } catch (error) {
    // Log validation errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sign-in] Response validation failed:', error);
      console.error('[Sign-in] Response data:', response);
    }
    throw error;
  }
}

/**
 * Hook for user sign-in
 * 
 * Features:
 * - React Query mutation to POST /api/auth/login
 * - Invalidates session cache on success
 * - Handles validation errors
 * - Handles rate limit errors with retry-after
 * - Redirects to projects page on success (configurable)
 * 
 * @param options Configuration options
 * @returns Form state, handlers, and mutation state
 */
export function useSignIn(options: UseSignInOptions = {}) {
  const { defaultEmail = "", onSuccess, redirectTo = "/projects" } = options;
  const router = useRouter();
  const invalidateSession = useInvalidateSession();

  const form = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  });

  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>("idle");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isLongLoading, setIsLongLoading] = useState(false);

  // Sign-in mutation
  const mutation = useMutation({
    mutationFn: signIn,
    onMutate: () => {
      setStatus("submitting");
      setMessage(null);
      setErrorCode(null);
      setRetryAfter(null);
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
      setMessage("Signed in successfully");
      
      // Invalidate session cache to trigger refetch
      invalidateSession();
      
      // Call custom success handler
      onSuccess?.(data);
      
      // Use router.refresh() to reload server components with new session
      router.refresh();
      
      // Navigate after a brief delay to ensure cookie is processed
      // This prevents the "Unable to connect" error from premature navigation
      setTimeout(() => {
        router.push(redirectTo);
      }, 150);
    },
    onError: (error: unknown, variables, context) => {
      if (context?.timerId) clearTimeout(context.timerId);
      setIsLongLoading(false);
      setStatus("idle");
      
      if (error instanceof ApiError) {
        const errorPayload = error.payload as ErrorResponse | null;
        
        // Handle rate limit errors (429)
        if (error.status === 429) {
          const retryAfterHeader = errorPayload?.error?.details as number | undefined;
          if (retryAfterHeader) {
            setRetryAfter(retryAfterHeader);
          }
          setMessage(
            errorPayload?.error?.message || 
            "Too many sign-in attempts. Please try again later."
          );
          return;
        }
        
        // Handle validation errors (400)
        if (error.status === 400) {
          const fieldError = errorPayload?.error;
          if (fieldError?.field) {
            // Set field-specific error
            form.setError(fieldError.field as keyof SignInSchema, {
              type: "manual",
              message: fieldError.message,
            });
          } else {
            setMessage(fieldError?.message || "Invalid input. Please check your credentials.");
          }
          return;
        }
        
        // Handle authentication errors (401)
        if (error.status === 401) {
          setMessage(
            errorPayload?.error?.message || 
            "Invalid email or password"
          );
          return;
        }
        
        // Handle forbidden errors (403) - email not verified
        if (error.status === 403) {
          const code = errorPayload?.error?.code || null;
          setErrorCode(code);

          // Redirect to verify-email page if email is not verified
          if (code === "EMAIL_NOT_VERIFIED") {
            const email = form.getValues("email");
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
          }

          setMessage(
            errorPayload?.error?.message ||
            "Please verify your email address before signing in"
          );
          return;
        }
        
        // Handle other errors
        setMessage(
          errorPayload?.error?.message || 
          "An unexpected error occurred. Please try again."
        );
      } else if (error instanceof Error) {
        // Check if it's an abort error (navigation during fetch)
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          // Ignore abort errors - they happen during navigation
          console.log('[Sign-in] Request aborted during navigation (expected)');
          return;
        }
        
        // Handle other network errors
        setMessage("Unable to connect. Please check your internet connection.");
      } else {
        // Unknown error type
        setMessage("An unexpected error occurred. Please try again.");
      }
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  const handleOAuthSignIn = async () => {
    setOauthStatus("loading");
    setOauthError(null);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
      // Redirect is handled by better-auth
    } catch (error) {
      setOauthStatus("error");
      setOauthError(
        error instanceof Error ? error.message : "Failed to sign in with Google"
      );
    }
  };

  return {
    form,
    status,
    message,
    errorCode,
    retryAfter,
    oauthStatus,
    oauthError,
    handleSubmit,
    handleOAuthSignIn,
    isLoading: mutation.isPending,
    isLongLoading,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
