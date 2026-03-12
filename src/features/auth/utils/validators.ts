import { z } from "zod";

// Password validation regex patterns
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

// Enhanced password schema with complexity requirements
// Requirements: minimum 8 characters, contains uppercase, lowercase, number, and special character
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((password) => PASSWORD_REGEX.uppercase.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => PASSWORD_REGEX.lowercase.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => PASSWORD_REGEX.number.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => PASSWORD_REGEX.special.test(password), {
    message: "Password must contain at least one special character",
  });

// Sign-in validation schema
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInSchema = z.infer<typeof signInSchema>;

// Sign-up validation schema with password confirmation
export const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(120, "Name must be less than 120 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .max(320, "Email must be less than 320 characters"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpSchema = z.infer<typeof signUpSchema>;

// Server-side sign-up validation schema (no confirmPassword needed on backend)
export const signUpServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name must be less than 120 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(320, "Email must be less than 320 characters"),
  password: passwordSchema,
});

export type SignUpServerSchema = z.infer<typeof signUpServerSchema>;

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(320, "Email must be less than 320 characters"),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

// Reset password validation schema
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

// Verify email validation schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>;

// Onboarding validation schema
export const onboardingSchema = z.object({
  teamName: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name must be at most 50 characters")
    .refine(
      (name) => {
        // Count alphanumeric characters across all languages (Unicode support)
        // \p{L} matches any Unicode letter, \p{N} matches any Unicode number
        const alphanumericCount = (name.match(/[\p{L}\p{N}]/gu) || []).length;
        return alphanumericCount >= 2;
      },
      {
        message: "Team name must contain at least 2 alphanumeric characters",
      }
    ),
});

export type OnboardingSchema = z.infer<typeof onboardingSchema>;
