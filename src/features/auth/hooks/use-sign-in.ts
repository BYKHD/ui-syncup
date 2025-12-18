"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signInSchema, type SignInSchema } from "../utils/validators";
import { authClient } from "@/lib/auth-client";
import { useInvalidateSession } from "./use-session";

type SubmissionStatus = "idle" | "submitting" | "success";
type OAuthStatus = "idle" | "loading" | "error";

// Response type from better-auth signIn.email
interface SignInResponse {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
}

type UseSignInOptions = {
  defaultEmail?: string;
  onSuccess?: (data: SignInResponse) => void;
  redirectTo?: string;
};

/**
 * Sign in using better-auth's email/password method
 */
async function signIn(credentials: SignInSchema): Promise<SignInResponse> {
  const result = await authClient.signIn.email({
    email: credentials.email,
    password: credentials.password,
    rememberMe: true,
  });
  
  if (result.error) {
    throw result.error;
  }
  
  return {
    user: {
      id: result.data?.user?.id ?? '',
      email: result.data?.user?.email ?? '',
      name: result.data?.user?.name ?? '',
      emailVerified: result.data?.user?.emailVerified ?? false,
    },
  };
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
      
      // Handle better-auth errors
      // better-auth errors have: status, message, code properties
      const betterAuthError = error as { status?: number; message?: string; code?: string } | null;
      
      if (betterAuthError && typeof betterAuthError === 'object') {
        const status = betterAuthError.status;
        const message = betterAuthError.message;
        const code = betterAuthError.code;
        
        // Handle rate limit errors (429)
        if (status === 429) {
          setMessage(
            message || "Too many sign-in attempts. Please try again later."
          );
          return;
        }
        
        // Handle validation errors (400)
        if (status === 400) {
          setMessage(message || "Invalid input. Please check your credentials.");
          return;
        }
        
        // Handle authentication errors (401)
        if (status === 401) {
          setMessage(message || "Invalid email or password");
          return;
        }
        
        // Handle forbidden errors (403) - email not verified
        if (status === 403 || code === "EMAIL_NOT_VERIFIED") {
          setErrorCode(code || "EMAIL_NOT_VERIFIED");
          
          // Redirect to verify-email page if email is not verified
          const email = form.getValues("email");
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        
        // Handle other errors with message
        if (message) {
          setMessage(message);
          return;
        }
      }
      
      // Handle standard Error objects
      if (error instanceof Error) {
        // Check if it's an abort error (navigation during fetch)
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          console.log('[Sign-in] Request aborted during navigation (expected)');
          return;
        }
        
        setMessage(error.message || "Unable to connect. Please check your internet connection.");
        return;
      }
      
      // Unknown error type
      setMessage("An unexpected error occurred. Please try again.");
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
