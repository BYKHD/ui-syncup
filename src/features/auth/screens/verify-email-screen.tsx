"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiMailLine, RiCheckboxCircleLine, RiTimeLine } from "@remixicon/react";

import { AuthCard } from "../components/auth-card";
import { useResendVerification } from "../hooks/use-resend-verification";

type VerifyEmailScreenProps = {
  defaultEmail?: string;
  callbackUrl?: string;
};

/**
 * Verify Email Screen
 *
 * Dedicated page for users to resend verification emails.
 * Features:
 * - Email input (pre-filled from URL params if available)
 * - Resend button with 60-second countdown
 * - Success/error state handling
 * - Clean, centered layout with shadcn components
 */
export default function VerifyEmailScreen({ defaultEmail = "", callbackUrl }: VerifyEmailScreenProps) {
  const searchParams = useSearchParams();
  const emailFromParams = searchParams?.get("email") || defaultEmail;
  const callbackUrlFromParams = callbackUrl ?? searchParams?.get("callbackUrl") ?? undefined;

  const [email, setEmail] = useState(emailFromParams);
  const { resend, countdown, canResend, isLoading, isSuccess } = useResendVerification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !canResend) return;

    // Re-store the signup intent so resend-verification/route.ts can embed
    // the callbackUrl in the new verification email URL (cross-device safe).
    if (callbackUrlFromParams) {
      await fetch('/api/auth/signup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), callbackUrl: callbackUrlFromParams }),
      }).catch(() => {
        // Silent fail — verification email will still be sent without callbackUrl
      });
    }

    resend(email.trim());
  };

  return (
    <AuthCard
      footer={
        <>
          <p>Already verified?</p>
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RiMailLine className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Verify Your Email</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email address to receive a new verification link
            </p>
          </div>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
            <RiCheckboxCircleLine className="h-4 w-4" />
            <AlertTitle>Email Sent</AlertTitle>
            <AlertDescription>
              We&apos;ve sent a verification link to <strong>{email}</strong>. Please check your inbox
              and spam folder.
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoFocus={!emailFromParams}
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Enter the email address you used to sign up
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!canResend || !email.trim() || isLoading}
          >
            {isLoading ? (
              "Sending..."
            ) : countdown > 0 ? (
              <span className="flex items-center gap-2">
                <RiTimeLine className="h-4 w-4" />
                Resend in {countdown}s
              </span>
            ) : (
              "Send Verification Email"
            )}
          </Button>

          {countdown > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              You can resend the email in {countdown} second{countdown !== 1 ? "s" : ""}
            </p>
          )}
        </form>

        {/* Info Box */}
        <div className="rounded-lg border border-muted bg-muted/30 p-4">
          <h3 className="mb-2 text-sm font-medium">Didn&apos;t receive the email?</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email address</li>
            <li>• Wait a few minutes for the email to arrive</li>
            <li>• Contact support if you continue to have issues</li>
          </ul>
        </div>

        {/* Back to Sign In */}
        <div className="text-center">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
