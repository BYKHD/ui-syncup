"use client";

import { useSignIn } from "../hooks/use-sign-in";
import { SignInForm } from "../components/sign-in-form";
import { AuthCard } from "../components/auth-card";
import type { SessionResponse } from "../api/types";

type SignInScreenProps = {
  description?: string;
  invitedEmail?: string;
  /** Initial OAuth error from URL redirect */
  initialOAuthError?: string | null;
  onSuccess?: (data: SessionResponse) => void;
};

export default function SignInScreen({
  description = "Sign in to your account to continue",
  invitedEmail = "",
  initialOAuthError,
  onSuccess,
}: SignInScreenProps) {
  const {
    form,
    status,
    message,
    retryAfter,
    oauthStatus,
    oauthError,
    handleSubmit,
    handleOAuthSignIn,
  } = useSignIn({ defaultEmail: invitedEmail, onSuccess });

  // Use initial error from URL if no runtime error
  const displayedOAuthError = oauthError || initialOAuthError || null;

  return (
    <AuthCard
      footer={
        <>
          <p>Don&apos;t have an account?</p>
          <a href="/sign-up" className="font-medium text-primary hover:underline">
            Sign up
          </a>
        </>
      }
    >
      <SignInForm
        form={form}
        status={status}
        message={message}
        retryAfter={retryAfter}
        onSubmit={handleSubmit}
        onOAuthSignIn={handleOAuthSignIn}
        oauthStatus={oauthStatus}
        oauthError={displayedOAuthError}
        description={description}
        invitedEmail={invitedEmail}
      />
    </AuthCard>
  );
}
