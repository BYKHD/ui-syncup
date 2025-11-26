import { Suspense } from "react";
import VerifyEmailScreen from "@/features/auth/screens/verify-email-screen";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

/**
 * Verify Email Page
 *
 * Public page for users to resend verification emails.
 * Redirected here when user tries to sign in without email verification.
 *
 * URL params:
 * - email: Pre-fill the email input (optional)
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
