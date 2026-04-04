/**
 * Setup API DTO Schemas
 * @description Zod schemas for API request/response validation
 */

import { z } from 'zod';

// Service Health Schemas
export const ServiceStatusSchema = z.enum(['connected', 'not_configured', 'error']);

export const ServiceHealthItemSchema = z.object({
  status: ServiceStatusSchema,
  message: z.string(),
  degradedBehavior: z.string().optional(),
});

export const ServiceHealthSchema = z.object({
  database: ServiceHealthItemSchema,
  email: ServiceHealthItemSchema,
  storage: ServiceHealthItemSchema,
  redis: ServiceHealthItemSchema,
});

// Instance Status Schema
export const DefaultMemberRoleSchema = z.enum([
  'TEAM_VIEWER',
  'TEAM_MEMBER',
  'TEAM_EDITOR',
]);

export const InstanceStatusSchema = z.object({
  isSetupComplete: z.boolean(),
  instanceName: z.string().nullable(),
  adminEmail: z.string().nullable(),
  defaultWorkspaceId: z.string().nullable(),
  defaultMemberRole: DefaultMemberRoleSchema,
  isMultiTeamMode: z.boolean(),
  skipEmailVerification: z.boolean(),
});

// Admin Account Schemas
export const AdminAccountRequestSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        'Password must contain at least one letter and one number'
      ),
    confirmPassword: z.string(),
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be at most 100 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const AdminAccountResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  message: z.string().optional(),
});

// Instance Config Schemas
export const InstanceConfigRequestSchema = z.object({
  instanceName: z
    .string()
    .min(2, 'Instance name must be at least 2 characters')
    .max(100, 'Instance name must be at most 100 characters'),
});

export const InstanceConfigResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

// First Team Schemas
export const FirstTeamRequestSchema = z.object({
  teamName: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be at most 50 characters'),
});

export const FirstTeamResponseSchema = z.object({
  success: z.boolean(),
  teamId: z.string().optional(),
  teamSlug: z.string().optional(),
  error: z.string().optional(),
});

// Setup Complete Schemas
export const SetupCompleteRequestSchema = z.object({
  teamId: z.string(),
  createSampleData: z.boolean().default(false),
});

export const SetupCompleteResponseSchema = z.object({
  success: z.boolean(),
  redirectUrl: z.string().optional(),
  error: z.string().optional(),
});

// Type exports from schemas
export type ServiceStatusDTO = z.infer<typeof ServiceStatusSchema>;
export type ServiceHealthItemDTO = z.infer<typeof ServiceHealthItemSchema>;
export type ServiceHealthDTO = z.infer<typeof ServiceHealthSchema>;
export type InstanceStatusDTO = z.infer<typeof InstanceStatusSchema>;
export type AdminAccountRequestDTO = z.infer<typeof AdminAccountRequestSchema>;
export type AdminAccountResponseDTO = z.infer<typeof AdminAccountResponseSchema>;
export type InstanceConfigRequestDTO = z.infer<typeof InstanceConfigRequestSchema>;
export type InstanceConfigResponseDTO = z.infer<typeof InstanceConfigResponseSchema>;
export type FirstTeamRequestDTO = z.infer<typeof FirstTeamRequestSchema>;
export type FirstTeamResponseDTO = z.infer<typeof FirstTeamResponseSchema>;
export type SetupCompleteRequestDTO = z.infer<typeof SetupCompleteRequestSchema>;
export type SetupCompleteResponseDTO = z.infer<typeof SetupCompleteResponseSchema>;
