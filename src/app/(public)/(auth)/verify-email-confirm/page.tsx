import { Suspense } from "react";
import { redirect } from "next/navigation";

import VerifyEmailConfirmScreen from "@/features/auth/screens/verify-email-confirm-screen";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Email Verification Confirmation Page
 *
 * Thin wrapper that extracts the verification token from URL params
 * and renders the VerifyEmailConfirmScreen component.
 *
 * Route: /verify-email-confirm?token=xxx
 *
 * This page is accessed when users click the verification link in their email.
 */
async function VerifyEmailConfirmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  // If no token is provided, the screen will handle showing an error
  return <VerifyEmailConfirmScreen token={token} />;
}

/**
 * Wrap the page in Suspense to handle async searchParams
 */
export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailConfirmPage searchParams={searchParams} />
    </Suspense>
  );
}
