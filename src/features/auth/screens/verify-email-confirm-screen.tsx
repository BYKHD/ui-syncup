"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RiLoader4Line,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiInformationLine,
  RiAlertLine,
} from "@remixicon/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { AuthCard } from "../components/auth-card";
import { useVerifyEmailToken } from "../hooks/use-verify-email-token";

type VerifyEmailConfirmScreenProps = {
  token?: string;
};

/**
 * Verify Email Confirmation Screen
 *
 * Handles email verification when users click the link from their email.
 * Features:
 * - Auto-verifies token on mount
 * - Shows verification states: verifying, success, expired, already verified, error
 * - Auto-redirects to sign-in after successful verification
 * - Provides "Request New Link" button for expired/error states
 * - Clean, centered layout with shadcn components and Remix Icons
 */
export default function VerifyEmailConfirmScreen({ token }: VerifyEmailConfirmScreenProps) {
  const router = useRouter();
  const { status, message, retry } = useVerifyEmailToken({ token, autoVerify: true });

  // Auto-redirect to sign-in after 3 seconds on success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // Handle missing token
  if (!token) {
    return (
      <AuthCard
        footer={
          <>
            <p>Need a verification link?</p>
            <Link href="/verify-email" className="font-medium text-primary hover:underline">
              Request one
            </Link>
          </>
        }
      >
        <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <RiAlertLine className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Invalid Verification Link</h2>
              <p className="text-sm text-muted-foreground">
                The verification link appears to be incomplete or invalid.
              </p>
            </div>
          </div>

          <Button asChild className="w-full">
            <Link href="/verify-email">Request New Verification Link</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  // Verifying state
  if (status === "verifying") {
    return (
      <AuthCard
        footer={
          <>
            <p>Need help?</p>
            <Link href="/verify-email" className="font-medium text-primary hover:underline">
              Request new link
            </Link>
          </>
        }
      >
        <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <RiLoader4Line className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Verifying Your Email</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        </div>
      </AuthCard>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <AuthCard
        footer={
          <>
            <p>Ready to get started?</p>
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in now
            </Link>
          </>
        }
      >
        <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
              <RiCheckboxCircleLine className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Email Verified!</h2>
              <p className="text-sm text-muted-foreground">
                Your email has been verified successfully.
              </p>
            </div>
          </div>

          <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
            <RiCheckboxCircleLine className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {message || "Your account is now active. You can sign in to start using the platform."}
            </AlertDescription>
          </Alert>

          <Button asChild className="w-full">
            <Link href="/sign-in">Continue to Sign In</Link>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Redirecting automatically in 3 seconds...
          </p>
        </div>
      </AuthCard>
    );
  }

  // Already verified state
  if (status === "already_verified") {
    return (
      <AuthCard
        footer={
          <>
            <p>Already have an account?</p>
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
              <RiInformationLine className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Already Verified</h2>
              <p className="text-sm text-muted-foreground">
                This email has already been verified.
              </p>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
            <RiInformationLine className="h-4 w-4" />
            <AlertTitle>Already Verified</AlertTitle>
            <AlertDescription>
              {message || "Your email is already verified. You can sign in to your account."}
            </AlertDescription>
          </Alert>

          <Button asChild className="w-full">
            <Link href="/sign-in">Go to Sign In</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  // Expired token state
  if (status === "expired") {
    return (
      <AuthCard
        footer={
          <>
            <p>Remember your password?</p>
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
              <RiTimeLine className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Link Expired</h2>
              <p className="text-sm text-muted-foreground">
                This verification link has expired or is invalid.
              </p>
            </div>
          </div>

          <Alert className="border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100">
            <RiTimeLine className="h-4 w-4" />
            <AlertTitle>Verification Link Expired</AlertTitle>
            <AlertDescription>
              {message || "Verification links expire after a certain period for security. Please request a new one."}
            </AlertDescription>
          </Alert>

          <Button asChild className="w-full">
            <Link href="/verify-email">Request New Verification Link</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  // Error state
  return (
    <AuthCard
      footer={
        <>
          <p>Need help?</p>
          <Link href="/verify-email" className="font-medium text-primary hover:underline">
            Request new link
          </Link>
        </>
      }
    >
      <div className="flex w-full flex-col gap-6 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <RiAlertLine className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Verification Failed</h2>
            <p className="text-sm text-muted-foreground">
              We couldn't verify your email address.
            </p>
          </div>
        </div>

        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <RiAlertLine className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {message || "An error occurred during verification. Please try again."}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          <Button onClick={retry} className="w-full">
            Try Again
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/verify-email">Request New Verification Link</Link>
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}
