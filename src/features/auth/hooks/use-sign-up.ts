"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { signUpSchema, type SignUpSchema } from "../utils/validators";
import type { SuccessResponse } from "../api/types";
import { authClient } from "@/lib/auth-client";

type SubmissionStatus = "idle" | "submitting" | "success";

// Internal response type for the signUp fn
interface SignUpResponse {
  message: string;
}

type UseSignUpOptions = {
  defaultValues?: Partial<SignUpSchema>;
  onSuccess?: (data: SuccessResponse) => void;
  callbackUrl?: string;
};

/**
 * Sign up using better-auth's email/password method.
 * If a callbackUrl is provided, stores it server-side first so it can be
 * embedded in the verification email URL (cross-device safe).
 */
async function signUp(data: SignUpSchema, callbackUrl?: string): Promise<SignUpResponse> {
  if (callbackUrl) {
    await fetch('/api/auth/signup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, callbackUrl }),
    }).catch(() => {
      // Silent fail — localStorage remains the same-device fallback
    });
  }

  const result = await authClient.signUp.email({
    name: data.name,
    email: data.email,
    password: data.password,
  });
  
  if (result.error) {
    throw result.error;
  }
  
  return {
    message: "Account created successfully! Please check your email to verify your account.",
  };
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
  const { defaultValues, onSuccess, callbackUrl } = options;

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
    mutationFn: (data: SignUpSchema) => signUp(data, callbackUrl),
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

      // Persist callbackUrl so it survives the email-verification round-trip
      if (callbackUrl) {
        localStorage.setItem('invitation_callback_url', callbackUrl);
      }

      // Call custom success handler — pass the submitted email via data.data
      // so callers (sign-up-screen) can show the success screen regardless of
      // whether better-auth treated this as a new account or a re-send.
      onSuccess?.({ message: data.message, data: { email: variables.email } });

      // Reset form on success
      form.reset();
    },
    onError: (error: unknown, variables, context) => {
      if (context?.timerId) clearTimeout(context.timerId);
      setIsLongLoading(false);
      setStatus("idle");
      
      // Handle better-auth errors
      const betterAuthError = error as { status?: number; message?: string; code?: string } | null;
      
      if (betterAuthError && typeof betterAuthError === 'object') {
        const status = betterAuthError.status;
        const message = betterAuthError.message;
        const code = betterAuthError.code;
        
        // Handle validation errors (400)
        if (status === 400) {
          setMessage(message || "Invalid input. Please check your information.");
          return;
        }
        
        // Handle duplicate email errors (409 or USER_ALREADY_EXISTS code)
        if (status === 409 || code === "USER_ALREADY_EXISTS") {
          setMessage(
            message || "An account with this email already exists. Please sign in instead."
          );
          // Also set field error on email field
          form.setError("email", {
            type: "manual",
            message: "This email is already registered",
          });
          return;
        }
        
        // Handle rate limit errors (429)
        if (status === 429) {
          setMessage(
            message || "Too many registration attempts. Please try again later."
          );
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
        setMessage(error.message || "Unable to connect. Please check your internet connection.");
        return;
      }
      
      // Handle network or other errors
      setMessage("Unable to connect. Please check your internet connection.");
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
        callbackURL: callbackUrl ?? "/projects",
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
