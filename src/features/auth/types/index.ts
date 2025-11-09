// Sign-up types
export type SignUpField = "name" | "email" | "password";
export type PlanTier = "free" | "pro";

export type SignUpForm = Record<SignUpField, string>;
export type FormErrors = Partial<Record<SignUpField, string>>;

export type PlanOption = {
  id: PlanTier;
  label: string;
  price: string;
  description: string;
  features: string[];
};

// Onboarding types
export type OnboardingMode = "create" | "accept";

export type InvitationDetails = {
  teamName: string;
  inviterName: string;
  role: string;
};
