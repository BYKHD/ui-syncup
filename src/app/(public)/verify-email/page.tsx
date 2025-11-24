import VerifyEmailScreen from "@/features/auth/screens/verify-email-screen";

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
  return <VerifyEmailScreen />;
}
