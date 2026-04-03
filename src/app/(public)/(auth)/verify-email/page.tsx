import { Suspense } from "react";
import VerifyEmailScreen from "@/features/auth/screens/verify-email-screen";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Verify Email Page
 *
 * Public page for users to resend verification emails.
 * Redirected here when user tries to sign in without email verification.
 *
 * URL params:
 * - email: Pre-fill the email input (optional)
 * - callbackUrl: Preserve invitation destination through the resend flow (optional)
 */
async function VerifyEmailPageInner({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return <VerifyEmailScreen defaultEmail={email} callbackUrl={callbackUrl} />;
}

export default function VerifyEmailPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailPageInner searchParams={searchParams} />
    </Suspense>
  );
}
