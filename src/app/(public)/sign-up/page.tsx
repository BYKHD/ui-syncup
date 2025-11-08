"use client";

import Link from "next/link";

import { SignUpForm, useSignUp } from "@features/auth";

export default function SignUpPage() {
  const { form, status, message, handleSubmit } = useSignUp();

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
            form={form}
            status={status}
            message={message}
            onSubmit={handleSubmit}
          />

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
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
