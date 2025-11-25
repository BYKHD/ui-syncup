"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react";

import { useForgotPassword } from "../hooks/use-forgot-password";
import type { SuccessResponse } from "../api/types";

type ForgotPasswordFormProps = {
  defaultEmail?: string;
  onSuccess?: (data: SuccessResponse) => void;
};

/**
 * Forgot password form component
 * 
 * Features:
 * - Email input with validation
 * - Success message display (always shown for security)
 * - Loading state during submission
 * - Rate limit error handling with retry-after
 * - Field-specific validation errors
 * 
 * Validates: Requirements 6.1, 6.5
 */
export function ForgotPasswordForm({
  defaultEmail,
  onSuccess,
}: ForgotPasswordFormProps) {
  const { form, status, message, retryAfter, handleSubmit, isLoading } =
    useForgotPassword({
      defaultEmail,
      onSuccess,
    });

  const {
    register,
    formState: { errors },
  } = form;

  // Determine if we should show an error or success message
  const isError = status === "idle" && message !== null;
  const isSuccess = status === "success" && message !== null;

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Reset Your Password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </p>
      </div>

      {/* Success message */}
      {isSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          <RiCheckboxCircleLine className="h-4 w-4" />
          <AlertTitle>Check Your Email</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Error message (validation, rate limit) */}
      {isError && (
        <Alert variant="destructive">
          <RiAlertLine className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {message}
            {retryAfter && (
              <span className="mt-1 block text-xs">
                Please wait {retryAfter} seconds before trying again.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            autoComplete="email"
            {...register("email")}
            disabled={isLoading}
            placeholder="Enter your email"
            type="email"
            required
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending reset link…" : "Send Reset Link"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        <a
          href="/sign-in"
          className="text-primary hover:underline"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
