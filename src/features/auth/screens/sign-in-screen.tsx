"use client";

import { useSignIn } from "../hooks/use-sign-in";
import { SignInForm } from "../components/sign-in-form";
import { AuthCard } from "../components/auth-card";
import type { SessionResponse } from "../api/types";

type SignInScreenProps = {
  description?: string;
  invitedEmail?: string;
  onSuccess?: (data: SessionResponse) => void;
};

export default function SignInScreen({
  description = "Sign in to your account to continue",
  invitedEmail = "",
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
        oauthError={oauthError}
        description={description}
        invitedEmail={invitedEmail}
      />
    </AuthCard>
  );
}
