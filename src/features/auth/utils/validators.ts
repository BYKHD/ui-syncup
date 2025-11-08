import { z } from "zod";

// Sign-up validation schema with password confirmation
export const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpSchema = z.infer<typeof signUpSchema>;

// Onboarding validation schema
export const onboardingSchema = z.object({
  teamName: z.string().min(1, "Team name is required"),
});

export type OnboardingSchema = z.infer<typeof onboardingSchema>;
