"use client";

import type { SignInSchema } from "../utils/validators";
import { useSignIn } from "../hooks/use-sign-in";
import { SignInForm } from "../components/sign-in-form";
import { AuthCard } from "../components/auth-card";

type SignInScreenProps = {
  description?: string;
  invitedEmail?: string;
  onSuccess?: (data: SignInSchema) => void;
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
