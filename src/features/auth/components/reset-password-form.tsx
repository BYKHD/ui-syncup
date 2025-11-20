"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react";

import { useResetPassword } from "../hooks/use-reset-password";
import { PasswordStrengthIndicator } from "./password-strength-indicator";
import type { SuccessResponse } from "../api/types";

type ResetPasswordFormProps = {
  token?: string;
  onSuccess?: (data: SuccessResponse) => void;
};

/**
 * Reset password form component
 * 
 * Features:
 * - Password and confirm password inputs
 * - Password strength indicator (reuses existing component)
 * - Validation error display (field-specific)
 * - Loading state during submission
 * - Success message with auto-redirect to sign-in
 * - Token error handling (expired, already used)
 * 
 * Validates: Requirements 6.2, 6.3, 6.4
 */
export function ResetPasswordForm({
  token,
  onSuccess,
}: ResetPasswordFormProps) {
  const { form, status, message, handleSubmit, isLoading } = useResetPassword({
    token,
    onSuccess,
  });

  const {
    register,
    formState: { errors },
    watch,
  } = form;

  const password = watch("password");

  // Determine if we should show an error or success message
  const isError = status === "idle" && message !== null;
  const isSuccess = status === "success" && message !== null;

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Create New Password</h2>
        <p className="text-sm text-muted-foreground">
          Enter a new password for your account
        </p>
      </div>

      {/* Success message */}
      {isSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          <RiCheckboxCircleLine className="h-4 w-4" />
          <AlertTitle>Password Reset Successful</AlertTitle>
          <AlertDescription>
            {message}
            <span className="mt-1 block text-xs">
              Redirecting to sign in...
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error message (validation, token errors) */}
      {isError && (
        <Alert variant="destructive">
          <RiAlertLine className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden token field */}
        <input type="hidden" {...register("token")} />

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            autoComplete="new-password"
            {...register("password")}
            disabled={isLoading}
            placeholder="Minimum 8 characters"
            type="password"
            required
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
          <PasswordStrengthIndicator password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            autoComplete="new-password"
            {...register("confirmPassword")}
            disabled={isLoading}
            placeholder="Re-enter your password"
            type="password"
            required
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Resetting password…" : "Reset Password"}
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
