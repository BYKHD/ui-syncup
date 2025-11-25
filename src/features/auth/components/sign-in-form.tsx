"use client";

import type { UseFormReturn } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react";

import type { SignInSchema } from "../utils/validators";

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
          {status === "submitting" ? "Signing in…" : "Sign In"}
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
          <AlertTitle>Google sign-in</AlertTitle>
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        className="w-full"
        type="button"
        onClick={onOAuthSignIn}
        disabled={oauthStatus === "loading" || status === "submitting"}
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {oauthStatus === "loading"
          ? "Signing in with Google…"
          : "Continue with Google"}
      </Button>
    </div>
  );
}
