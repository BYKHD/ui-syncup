"use client";

import type { UseFormReturn } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react";

import type { SignInSchema } from "../utils/validators";
import { SocialLoginButtons } from "./social-login-buttons";

type SignInFormProps = {
  form: UseFormReturn<SignInSchema>;
  status: "idle" | "submitting" | "success";
  message: string | null;
  retryAfter?: number | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onOAuthSignIn: () => void;
  oauthStatus: "idle" | "loading" | "error";
  oauthError: string | null;
  description?: string;
  invitedEmail?: string;
  isLongLoading?: boolean;
  redirectTo?: string;
};

export function SignInForm({
  form,
  status,
  message,
  retryAfter,
  onSubmit,
  onOAuthSignIn,
  oauthStatus,
  oauthError,
  description = "Sign in to your account to continue",
  invitedEmail,
  isLongLoading = false,
  redirectTo,
}: SignInFormProps) {
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
        <h2 className="text-xl font-semibold">Welcome Back</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Success message */}
      {isSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          <RiCheckboxCircleLine className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Error message (authentication, validation, rate limit) */}
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

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            autoComplete="email"
            {...register("email")}
            disabled={status === "submitting" || Boolean(invitedEmail)}
            placeholder="Enter your email"
            type="email"
            required
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            autoComplete="current-password"
            {...register("password")}
            disabled={status === "submitting"}
            placeholder="Enter your password"
            type="password"
            required
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={status === "submitting"}
        >
          {status === "submitting" 
            ? (isLongLoading ? "Still working..." : "Signing in…") 
            : "Sign In"}
        </Button>
      </form>

      <div className="relative py-4">
        <Separator />
        <span className="absolute inset-0 flex items-center justify-center text-xs uppercase text-muted-foreground">
          <span className="bg-background px-2">Or continue with</span>
        </span>
      </div>

      {oauthError && (
        <Alert variant="destructive">
          <AlertTitle>Social sign-in</AlertTitle>
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      )}

      <SocialLoginButtons
        redirectTo={redirectTo}
        disabled={status === "submitting" || oauthStatus === "loading"}
        onError={(_error: string) => {
          // Error is already handled by the component, but parent can also react
        }}
      />
    </div>
  );
}
