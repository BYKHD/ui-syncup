import { z } from "zod";

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
 * Team description validation schema
 */
export const teamDescriptionSchema = z
  .string()
  .max(500, "Team description must be at most 500 characters")
  .optional();

/**
 * Team creation input validation schema
 */
export const createTeamSchema = z.object({
  name: teamNameSchema,
  description: teamDescriptionSchema,
  image: z.string().url().optional(),
  creatorId: z.string().uuid(),
});

/**
 * Team update input validation schema
 */
export const updateTeamSchema = z.object({
  name: teamNameSchema.optional(),
  description: teamDescriptionSchema,
  image: z.string().url().optional(),
});

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
