"use client";

import type { UseFormReturn } from "react-hook-form";

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

import type { SignUpSchema } from "../utils/validators";
import { PasswordStrengthIndicator } from "./password-strength-indicator";

type SignUpFormProps = {
  form: UseFormReturn<SignUpSchema>;
  status: "idle" | "submitting";
  message: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function SignUpForm({
  form,
  status,
  message,
  onSubmit,
}: SignUpFormProps) {
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
          We&apos;ll use these fields to personalize your workspace shell.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {message && (
          <Alert>
            <AlertTitle>All set</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              {...register("name")}
              disabled={status === "submitting"}
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
              disabled={status === "submitting"}
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
              disabled={status === "submitting"}
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
              disabled={status === "submitting"}
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
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Creating workspace…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to the mock Terms of Service & Privacy Policy.
        </p>
      </CardContent>
    </Card>
  );
}
