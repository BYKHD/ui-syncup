"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signInSchema, type SignInSchema } from "../utils/validators";

type SubmissionStatus = "idle" | "submitting" | "success";
type OAuthStatus = "idle" | "loading" | "error";

type UseSignInOptions = {
  defaultEmail?: string;
  onSuccess?: (data: SignInSchema) => void;
};

export function useSignIn(options: UseSignInOptions = {}) {
  const { defaultEmail = "", onSuccess } = options;

  const form = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  });

  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>("idle");
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit((data) => {
    setMessage(null);
    setStatus("submitting");

    // Mock API call
    setTimeout(() => {
      setStatus("success");
      setMessage(
        "Signed in successfully. Dashboard access is mocked in this build."
      );
      onSuccess?.(data);
    }, 700);
  });

  const handleOAuthSignIn = () => {
    setOauthStatus("loading");
    setOauthError(null);

    // Mock OAuth flow
    setTimeout(() => {
      setOauthStatus("error");
      setOauthError("Mock Google sign-in is disabled in preview builds.");
    }, 600);
  };

  return {
    form,
    status,
    message,
    oauthStatus,
    oauthError,
    handleSubmit,
    handleOAuthSignIn,
  };
}
