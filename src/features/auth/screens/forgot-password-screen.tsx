"use client";

import Link from "next/link";

import { ForgotPasswordForm } from "../components/forgot-password-form";
import { AuthCard } from "../components/auth-card";
import type { SuccessResponse } from "../api/types";

type ForgotPasswordScreenProps = {
  defaultEmail?: string;
  onSuccess?: (data: SuccessResponse) => void;
};

export default function ForgotPasswordScreen({
  defaultEmail,
  onSuccess,
}: ForgotPasswordScreenProps) {
  return (
    <AuthCard
      footer={
        <>
          <p>Remember your password?</p>
          <Link
            href="/sign-in"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm defaultEmail={defaultEmail} onSuccess={onSuccess} />
    </AuthCard>
  );
}
