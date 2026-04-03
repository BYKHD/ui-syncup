"use client";

import { useState } from "react";
import Link from "next/link";

import { SignUpForm } from "../components/sign-up-form";
import SignUpSuccessScreen from "./sign-up-success-screen";

type SignUpScreenProps = {
  callbackUrl?: string;
};

export default function SignUpScreen({ callbackUrl }: SignUpScreenProps) {
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const signInHref = callbackUrl
    ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/sign-in";

  if (successEmail) {
    return <SignUpSuccessScreen email={successEmail} signInHref={signInHref} />;
  }

  return (
    <section className="bg-muted min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Get started
            </p>
            <h1 className="mt-3 text-3xl font-bold">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mocked UI for planning flows—no real accounts are provisioned.
            </p>
          </div>

          <SignUpForm
            callbackUrl={callbackUrl}
            onSuccess={(data) => {
              const email = (data.data as { email?: string } | undefined)?.email;
              if (email) setSuccessEmail(email);
            }}
          />

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={signInHref}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
