"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { useSignUp } from "../hooks/use-sign-up";
import type { SuccessResponse } from "../api/types";
import { PasswordStrengthIndicator } from "./password-strength-indicator";
import { SocialLoginButtons } from "./social-login-buttons";

type SignUpFormProps = {
  onSuccess?: (data: SuccessResponse) => void;
  callbackUrl?: string;
};

export function SignUpForm({ onSuccess, callbackUrl }: SignUpFormProps) {
  const { form, status, message, handleSubmit, isLoading, isLongLoading } = useSignUp({
    onSuccess,
    callbackUrl,
  });

  const {
    register,
    formState: { errors },
    watch,
  } = form;

  const password = watch("password");

  return (
    <Card className="border-muted bg-background">
      <CardHeader className="pb-0">
        <CardTitle>Team owner details</CardTitle>
        <CardDescription>
          We&apos;ll use these fields to personalize your team shell.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {message && status !== "success" && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              {...register("name")}
              disabled={isLoading}
              placeholder="Avery Lee"
              required
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              autoComplete="email"
              {...register("email")}
              disabled={isLoading}
              placeholder="avery@team.com"
              type="email"
              required
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Create a password</Label>
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
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
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

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading 
              ? (isLongLoading ? "Still working..." : "Creating team…")
              : "Create account"}
          </Button>
        </form>

        {/* Social login section */}
        <div className="relative py-4">
          <Separator />
          <span className="absolute inset-0 flex items-center justify-center text-xs uppercase text-muted-foreground">
            <span className="bg-background px-2">Or sign up with</span>
          </span>
        </div>

        <SocialLoginButtons 
          disabled={isLoading}
          onError={(_error: string) => {
            // Error is already handled by the component
          }}
        />

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to the mock Terms of Service & Privacy Policy.
        </p>
      </CardContent>
    </Card>
  );
}

