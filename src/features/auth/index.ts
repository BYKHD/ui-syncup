// ============================================================================
// AUTH FEATURE BARREL EXPORTS
// Public API surface for the auth feature
// ============================================================================

// Components
export { AuthCard } from "./components/auth-card";
export { SignInForm } from "./components/sign-in-form";
export { SignUpForm } from "./components/sign-up-form";
export { ForgotPasswordForm } from "./components/forgot-password-form";
export { ResetPasswordForm } from "./components/reset-password-form";
export { OnboardingForm } from "./components/onboarding-form";
export { PasswordStrengthIndicator } from "./components/password-strength-indicator";
export { RoleGate } from "./components/role-gate";
export { SocialLoginButtons } from "./components/social-login-buttons";
export { SelfRegistrationChoice } from "./components/self-registration-choice";
export type { SelfRegistrationPath } from "./components/self-registration-choice";
export { InviteCodeInput } from "./components/invite-code-input";
export { InvitedUserForm } from "./components/invited-user-form";
export type { InvitationDetails } from "./components/invited-user-form";

// Screens
export { default as SignInScreen } from "./screens/sign-in-screen";
export { default as SignUpScreen } from "./screens/sign-up-screen";
export { default as OnboardingScreen } from "./screens/onboarding-screen";
export { default as ForgotPasswordScreen } from "./screens/forgot-password-screen";
export { default as ResetPasswordScreen } from "./screens/reset-password-screen";
export { default as VerifyEmailScreen } from "./screens/verify-email-screen";
export { default as VerifyEmailConfirmScreen } from "./screens/verify-email-confirm-screen";

// Hooks
export { useSignIn } from "./hooks/use-sign-in";
export { useSignUp } from "./hooks/use-sign-up";
export { useSignOut } from "./hooks/use-sign-out";
export { useOnboarding } from "./hooks/use-onboarding";
export { useSession, useInvalidateSession } from "./hooks/use-session";
export { useForgotPassword } from "./hooks/use-forgot-password";
export { useResetPassword } from "./hooks/use-reset-password";
export { useResendVerification } from "./hooks/use-resend-verification";
export { useVerifyEmailToken } from "./hooks/use-verify-email-token";
export {
  useLinkedAccounts,
  canUnlinkAccount,
  isProviderLinked,
  linkedAccountsQueryKey,
} from "./hooks/use-linked-accounts";
export { useLinkAccount } from "./hooks/use-link-account";
export { useUnlinkAccount, LastAuthMethodError } from "./hooks/use-unlink-account";
export { useSelfRegistration } from "./hooks/use-self-registration";
export type { SelfRegistrationStep } from "./hooks/use-self-registration";
export { useAcceptInvitation } from "./hooks/use-accept-invitation";

// Types
export type { OnboardingMode, SignUpField, SignUpFormData, FormErrors } from "./types";

// Validators (schemas)
export {
  passwordSchema,
  signInSchema,
  signUpSchema,
  signUpServerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  onboardingSchema,
} from "./utils/validators";
export type {
  SignInSchema,
  SignUpSchema,
  SignUpServerSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  OnboardingSchema,
} from "./utils/validators";
