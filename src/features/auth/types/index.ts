// Sign-up types
export type SignUpField = "name" | "email" | "password";

export type SignUpFormData = Record<SignUpField, string>;
export type FormErrors = Partial<Record<SignUpField, string>>;

// Onboarding types
export type OnboardingMode = "create" | "accept";

export type InvitationDetails = {
  teamName: string;
  inviterName: string;
  role: string;
};
