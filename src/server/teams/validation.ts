import { z } from "zod";
import {
  TEAM_MANAGEMENT_ROLES,
  TEAM_OPERATIONAL_ROLES,
} from "@/config/roles";

/**
 * Team name validation schema
 * Requirements 13.1: Team name must be 2-50 characters with at least 2 alphanumeric characters
 */
export const teamNameSchema = z
  .string()
  .min(2, "Team name must be at least 2 characters")
  .max(50, "Team name must be at most 50 characters")
  .refine(
    (name) => {
      // Count alphanumeric characters
      const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
      return alphanumericCount >= 2;
    },
    {
      message: "Team name must contain at least 2 alphanumeric characters",
    }
  );

/**
 * Team slug validation schema
 * Requirements 13.2: Slug must contain only lowercase letters, numbers, and hyphens
 */
export const teamSlugSchema = z
  .string()
  .min(2, "Team slug must be at least 2 characters")
  .max(60, "Team slug must be at most 60 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Team slug must contain only lowercase letters, numbers, and hyphens"
  );

/**
 * Team description validation schema
 */
export const teamDescriptionSchema = z
  .string()
  .max(500, "Team description must be at most 500 characters")
  .optional();

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(320, "Email address must be at most 320 characters");

/**
 * Management role validation schema
 * Requirements 13.3: Management roles must be TEAM_OWNER or TEAM_ADMIN
 */
export const managementRoleSchema = z
  .enum([TEAM_MANAGEMENT_ROLES.TEAM_OWNER, TEAM_MANAGEMENT_ROLES.TEAM_ADMIN])
  .nullable()
  .optional();

/**
 * Operational role validation schema
 * Requirements 13.3: Operational roles must be TEAM_EDITOR, TEAM_MEMBER, or TEAM_VIEWER
 */
export const operationalRoleSchema = z.enum([
  TEAM_OPERATIONAL_ROLES.TEAM_EDITOR,
  TEAM_OPERATIONAL_ROLES.TEAM_MEMBER,
  TEAM_OPERATIONAL_ROLES.TEAM_VIEWER,
]);

/**
 * Role assignment validation schema
 * Requirements 13.3: Management roles require operational roles
 */
export const roleAssignmentSchema = z
  .object({
    managementRole: managementRoleSchema,
    operationalRole: operationalRoleSchema,
  })
  .refine(
    (data) => {
      // If management role is provided, operational role must also be provided
      if (data.managementRole && !data.operationalRole) {
        return false;
      }
      return true;
    },
    {
      message:
        "Management roles (TEAM_OWNER, TEAM_ADMIN) require an operational role (TEAM_EDITOR, TEAM_MEMBER, or TEAM_VIEWER)",
      path: ["operationalRole"],
    }
  );

/**
 * Team creation input validation schema
 * Requirements 13.1, 13.2
 */
export const createTeamSchema = z.object({
  name: teamNameSchema,
  description: teamDescriptionSchema,
  image: z.string().url().optional(),
  creatorId: z.string().uuid(),
});

/**
 * Team update input validation schema
 * Requirements 13.1
 */
export const updateTeamSchema = z.object({
  name: teamNameSchema.optional(),
  description: teamDescriptionSchema,
  image: z.string().url().optional(),
});

/**
 * Invitation creation input validation schema
 * Requirements 13.3: Validates email and role assignments
 */
export const createInvitationSchema = z
  .object({
    email: emailSchema,
    managementRole: managementRoleSchema,
    operationalRole: operationalRoleSchema,
  })
  .refine(
    (data) => {
      // If management role is provided, operational role must also be provided
      if (data.managementRole && !data.operationalRole) {
        return false;
      }
      return true;
    },
    {
      message:
        "Management roles require an operational role to be assigned simultaneously",
      path: ["operationalRole"],
    }
  );

/**
 * Member role update validation schema
 * Requirements 13.3: Validates role changes
 */
export const updateMemberRolesSchema = z
  .object({
    managementRole: managementRoleSchema,
    operationalRole: operationalRoleSchema.optional(),
  })
  .refine(
    (data) => {
      // If management role is provided, operational role must also be provided
      if (data.managementRole && !data.operationalRole) {
        return false;
      }
      return true;
    },
    {
      message:
        "Management roles require an operational role to be assigned simultaneously",
      path: ["operationalRole"],
    }
  );

/**
 * Validates team name and returns validation result
 */
export function validateTeamName(name: string): {
  valid: boolean;
  error?: string;
} {
  const result = teamNameSchema.safeParse(name);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    error: result.error.errors[0]?.message || "Invalid team name",
  };
}

/**
 * Validates role assignment and returns validation result
 * Requirements 13.3: Ensures management roles are paired with operational roles
 */
export function validateRoleAssignment(
  managementRole: string | null | undefined,
  operationalRole: string | undefined
): {
  valid: boolean;
  error?: string;
} {
  const result = roleAssignmentSchema.safeParse({
    managementRole,
    operationalRole,
  });
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    error: result.error.errors[0]?.message || "Invalid role assignment",
  };
}
