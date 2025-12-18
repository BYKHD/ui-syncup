import { z } from "zod";

// User role schema
export const userRoleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string(),
  resourceType: z.enum(["team", "project"]),
  resourceId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type UserRole = z.infer<typeof userRoleSchema>;

// User response schema (basic user info)
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  roles: z.array(userRoleSchema).optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// Full user response schema (with timestamps)
export const fullUserResponseSchema = userResponseSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FullUserResponse = z.infer<typeof fullUserResponseSchema>;

// Session response schema (for login and /me endpoints)
export const sessionResponseSchema = z.object({
  user: userResponseSchema,
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

// OAuth Provider type
export type OAuthProvider = "google" | "microsoft" | "atlassian";

// Linked Account schema (for account management)
export const linkedAccountSchema = z.object({
  id: z.string(),
  providerId: z.enum(["google", "microsoft", "atlassian", "credential"]),
  accountId: z.string(),
  createdAt: z.string().datetime().optional(),
});

export type LinkedAccount = z.infer<typeof linkedAccountSchema>;

// List accounts response
export const listAccountsResponseSchema = z.object({
  accounts: z.array(linkedAccountSchema),
});

export type ListAccountsResponse = z.infer<typeof listAccountsResponseSchema>;

// Unlink account error response
export const unlinkAccountErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type UnlinkAccountError = z.infer<typeof unlinkAccountErrorSchema>;

