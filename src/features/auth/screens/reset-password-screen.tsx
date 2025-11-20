"use client";

import { ResetPasswordForm } from "../components/reset-password-form";
import { AuthCard } from "../components/auth-card";
import type { SuccessResponse } from "../api/types";

type ResetPasswordScreenProps = {
  token?: string;
  onSuccess?: (data: SuccessResponse) => void;
};

export default function ResetPasswordScreen({
  token,
  onSuccess,
}: ResetPasswordScreenProps) {
  return (
    <AuthCard
      footer={
        <>
          <p>Remember your password?</p>
          <a
            href="/sign-in"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </a>
        </>
      }
    >
      <ResetPasswordForm token={token} onSuccess={onSuccess} />
    </AuthCard>
  );
}
