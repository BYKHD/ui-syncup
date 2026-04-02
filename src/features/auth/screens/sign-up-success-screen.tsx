"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SignUpSuccessScreenProps = {
  email: string;
  signInHref: string;
};

export default function SignUpSuccessScreen({
  email,
  signInHref,
}: SignUpSuccessScreenProps) {
  return (
    <section className="bg-muted min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Almost there
            </p>
            <h1 className="mt-3 text-3xl font-bold">Check your inbox</h1>
          </div>

          <Card className="border-muted bg-background">
            <CardHeader className="pb-0 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Verify your email</CardTitle>
              <CardDescription className="mt-2">
                We sent a verification link to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 text-center">
              <p className="rounded-md bg-muted px-4 py-2 text-sm font-medium">
                {email}
              </p>

              <p className="text-sm text-muted-foreground">
                Click the link in the email to activate your account. The link
                expires in 24 hours.
              </p>

              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive anything? Check your spam folder.
              </p>

              <Button asChild variant="outline" className="w-full">
                <Link href={signInHref}>Back to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
