"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Separator } from "@components/ui/separator";

type AuthField = "email" | "password";
type AuthFormData = Record<AuthField, string>;
type FormErrors = Partial<Record<AuthField, string>>;
type SubmissionStatus = "idle" | "submitting" | "success";
type OAuthStatus = "idle" | "loading" | "error";

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

const validate = (data: AuthFormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!data.email.includes("@")) {
    errors.email = "Enter a valid email address";
  }

  if (!data.password.trim()) {
    errors.password = "Password is required";
  } else if (data.password.length < 8) {
    errors.password = "Use at least 8 characters";
  }

  return errors;
};

export default function SignInPage() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  const invitedEmail = searchParams.get("email") ?? "";

  const [formData, setFormData] = useState<AuthFormData>({
    email: invitedEmail,
    password: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>("idle");
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleChange =
    (field: AuthField) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
      if (formErrors[field]) {
        setFormErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const nextErrors = validate(formData);
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
      setFeedback("Signed in successfully. Dashboard access is mocked in this build.");
    }, 700);
  };

  const handleOAuthSignIn = () => {
    setOauthStatus("loading");
    setOauthError(null);

    setTimeout(() => {
      setOauthStatus("error");
      setOauthError("Mock Google sign-in is disabled in preview builds.");
    }, 600);
  };

  const description = invitationToken
    ? invitationCopy.invited
    : invitationCopy.default;

  return (
    <section className="bg-muted min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">UI Feedback Tracker</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Capture and triage UI fidelity issues
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 rounded-lg border border-muted bg-background px-6 py-8 shadow-sm">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {feedback && (
              <Alert>
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{feedback}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  autoComplete="email"
                  value={formData.email}
                  disabled={status === "submitting" || Boolean(invitedEmail)}
                  onChange={handleChange("email")}
                  placeholder="Enter your email"
                  type="email"
                  required
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  disabled={status === "submitting"}
                  onChange={handleChange("password")}
                  placeholder="Enter your password"
                  type="password"
                  required
                />
                {formErrors.password && (
                  <p className="text-xs text-destructive">
                    {formErrors.password}
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
              onClick={handleOAuthSignIn}
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

          <div className="flex justify-center gap-1 text-sm text-muted-foreground">
            <p>Don&apos;t have an account?</p>
            <a href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
