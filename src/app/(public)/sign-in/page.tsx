"use client";

import { useSearchParams } from "next/navigation";

import { AuthCard, SignInForm } from "@features/auth/components";
import { useSignIn } from "@features/auth/hooks";

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

export default function SignInPage() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  const invitedEmail = searchParams.get("email") ?? "";

  const description = invitationToken
    ? invitationCopy.invited
    : invitationCopy.default;

  const {
    form,
    status,
    message,
    oauthStatus,
    oauthError,
    handleSubmit,
    handleOAuthSignIn,
  } = useSignIn({
    defaultEmail: invitedEmail,
  });

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
