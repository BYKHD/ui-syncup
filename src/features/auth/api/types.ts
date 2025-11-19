import { z } from "zod";

// User response schema
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// Session response schema
export const sessionResponseSchema = z.object({
  user: userResponseSchema,
  expiresAt: z.string().datetime(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

// Error response schema
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Success response schema
export const successResponseSchema = z.object({
  message: z.string(),
  data: z.unknown().optional(),
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

// Auth API response types
export type SignUpResponse = SuccessResponse;
export type SignInResponse = SessionResponse;
export type SignOutResponse = SuccessResponse;
export type ForgotPasswordResponse = SuccessResponse;
export type ResetPasswordResponse = SuccessResponse;
export type VerifyEmailResponse = SuccessResponse;
export type MeResponse = SessionResponse;
