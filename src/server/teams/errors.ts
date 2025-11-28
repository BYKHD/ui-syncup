/**
 * Team System Error Handling
 * 
 * Standardized error codes and response formatting for team operations.
 * Requirements 12A.4: API errors have standardized shape
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard error codes for team operations
 */
export const ERROR_CODES = {
  // Validation errors (400)
  INVALID_TEAM_NAME: "INVALID_TEAM_NAME",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_ROLE_COMBINATION: "INVALID_ROLE_COMBINATION",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_INPUT: "INVALID_INPUT",

  // Authentication errors (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  MISSING_AUTH_COOKIE: "MISSING_AUTH_COOKIE",

  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  NOT_TEAM_OWNER: "NOT_TEAM_OWNER",
  NOT_TEAM_ADMIN: "NOT_TEAM_ADMIN",
  CANNOT_MODIFY_OWNER: "CANNOT_MODIFY_OWNER",
  FORBIDDEN: "FORBIDDEN",

  // Not found errors (404)
  TEAM_NOT_FOUND: "TEAM_NOT_FOUND",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",
  INVITATION_NOT_FOUND: "INVITATION_NOT_FOUND",
  NOT_FOUND: "NOT_FOUND",

  // Conflict errors (409)
  DUPLICATE_TEAM_SLUG: "DUPLICATE_TEAM_SLUG",
  ALREADY_TEAM_MEMBER: "ALREADY_TEAM_MEMBER",
  MEMBER_OWNS_PROJECTS: "MEMBER_OWNS_PROJECTS",
  INVITATION_ALREADY_USED: "INVITATION_ALREADY_USED",
  CONFLICT: "CONFLICT",

  // Gone errors (410)
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  INVITATION_CANCELLED: "INVITATION_CANCELLED",
  TEAM_DELETED: "TEAM_DELETED",
  GONE: "GONE",

  // Limit errors (422)
  PLAN_LIMIT_MEMBERS: "PLAN_LIMIT_MEMBERS",
  PLAN_LIMIT_PROJECTS: "PLAN_LIMIT_PROJECTS",
  PLAN_LIMIT_ISSUES: "PLAN_LIMIT_ISSUES",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",

  // Rate limit errors (429)
  RATE_LIMIT_INVITATIONS: "RATE_LIMIT_INVITATIONS",
  RATE_LIMIT_EXPORTS: "RATE_LIMIT_EXPORTS",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server errors (500)
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EMAIL_SERVICE_ERROR: "EMAIL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Standard error response shape
 * Requirements 12A.4: Standardized error shape with code, message, and field-specific errors
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: unknown;
  };
}

/**
 * Field-specific validation error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Custom error class for team operations
 */
export class TeamError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public field?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "TeamError";
  }
}

/**
 * Format Zod validation errors into field-specific errors
 * Requirements 13.5: Zod validation returns field-specific errors
 */
export function formatZodError(error: ZodError): FieldError[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Create a standardized error response
 * Requirements 12A.4: API errors have standardized shape
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number,
  field?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(field && { field }),
        ...(details ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

/**
 * Handle Zod validation errors
 * Requirements 13.5: Zod validation returns field-specific errors
 */
export function handleZodError(error: ZodError): NextResponse<ApiErrorResponse> {
  const fieldErrors = formatZodError(error);
  const firstError = fieldErrors[0];

  return createErrorResponse(
    ERROR_CODES.INVALID_INPUT,
    firstError?.message || "Invalid input",
    400,
    firstError?.field,
    fieldErrors.length > 1 ? fieldErrors : undefined
  );
}

/**
 * Handle TeamError instances
 */
export function handleTeamError(error: TeamError): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    error.code,
    error.message,
    error.statusCode,
    error.field,
    error.details
  );
}

/**
 * Handle generic errors
 */
export function handleGenericError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof TeamError) {
    return handleTeamError(error);
  }

  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Log unexpected errors
  console.error("Unexpected error:", error);

  return createErrorResponse(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    "An unexpected error occurred. Please try again later.",
    500
  );
}

/**
 * Validation error helpers
 */
export const ValidationErrors = {
  invalidTeamName: (message: string) =>
    new TeamError(ERROR_CODES.INVALID_TEAM_NAME, message, 400, "name"),

  invalidEmail: (message: string) =>
    new TeamError(ERROR_CODES.INVALID_EMAIL, message, 400, "email"),

  invalidRoleCombination: (message: string) =>
    new TeamError(ERROR_CODES.INVALID_ROLE_COMBINATION, message, 400, "roles"),

  missingRequiredField: (field: string) =>
    new TeamError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`,
      400,
      field
    ),
};

/**
 * Authentication error helpers
 */
export const AuthErrors = {
  unauthorized: () =>
    new TeamError(ERROR_CODES.UNAUTHORIZED, "Not authenticated", 401),

  sessionExpired: () =>
    new TeamError(ERROR_CODES.SESSION_EXPIRED, "Session expired", 401),
};

/**
 * Authorization error helpers
 */
export const AuthorizationErrors = {
  insufficientPermissions: () =>
    new TeamError(
      ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      "Insufficient permissions for this operation",
      403
    ),

  notTeamOwner: () =>
    new TeamError(
      ERROR_CODES.NOT_TEAM_OWNER,
      "Only team owners can perform this operation",
      403
    ),

  notTeamAdmin: () =>
    new TeamError(
      ERROR_CODES.NOT_TEAM_ADMIN,
      "Only team owners or admins can perform this operation",
      403
    ),

  cannotModifyOwner: () =>
    new TeamError(
      ERROR_CODES.CANNOT_MODIFY_OWNER,
      "Cannot modify team owner",
      403
    ),
};

/**
 * Not found error helpers
 */
export const NotFoundErrors = {
  teamNotFound: (teamId?: string) =>
    new TeamError(
      ERROR_CODES.TEAM_NOT_FOUND,
      teamId ? `Team not found: ${teamId}` : "Team not found",
      404
    ),

  memberNotFound: (userId?: string) =>
    new TeamError(
      ERROR_CODES.MEMBER_NOT_FOUND,
      userId ? `Member not found: ${userId}` : "Member not found",
      404
    ),

  invitationNotFound: (invitationId?: string) =>
    new TeamError(
      ERROR_CODES.INVITATION_NOT_FOUND,
      invitationId
        ? `Invitation not found: ${invitationId}`
        : "Invitation not found",
      404
    ),
};

/**
 * Conflict error helpers
 */
export const ConflictErrors = {
  duplicateTeamSlug: (slug: string) =>
    new TeamError(
      ERROR_CODES.DUPLICATE_TEAM_SLUG,
      `A team with slug "${slug}" already exists`,
      409
    ),

  alreadyTeamMember: (email: string) =>
    new TeamError(
      ERROR_CODES.ALREADY_TEAM_MEMBER,
      `User ${email} is already a team member`,
      409
    ),

  memberOwnsProjects: (projects: Array<{ id: string; name: string }>) =>
    new TeamError(
      ERROR_CODES.MEMBER_OWNS_PROJECTS,
      "Cannot remove or demote member who owns projects",
      409,
      undefined,
      { projects }
    ),

  invitationAlreadyUsed: () =>
    new TeamError(
      ERROR_CODES.INVITATION_ALREADY_USED,
      "This invitation has already been used",
      409
    ),
};

/**
 * Gone error helpers
 */
export const GoneErrors = {
  invitationExpired: () =>
    new TeamError(
      ERROR_CODES.INVITATION_EXPIRED,
      "This invitation has expired",
      410
    ),

  invitationCancelled: () =>
    new TeamError(
      ERROR_CODES.INVITATION_CANCELLED,
      "This invitation has been cancelled",
      410
    ),

  teamDeleted: () =>
    new TeamError(ERROR_CODES.TEAM_DELETED, "This team has been deleted", 410),
};

/**
 * Limit error helpers
 */
export const LimitErrors = {
  planLimitMembers: (limit: number) =>
    new TeamError(
      ERROR_CODES.PLAN_LIMIT_MEMBERS,
      `Your plan allows a maximum of ${limit} members. Upgrade to add more.`,
      422,
      undefined,
      { limit, type: "members" }
    ),

  planLimitProjects: (limit: number) =>
    new TeamError(
      ERROR_CODES.PLAN_LIMIT_PROJECTS,
      `Your plan allows a maximum of ${limit} projects. Upgrade to add more.`,
      422,
      undefined,
      { limit, type: "projects" }
    ),

  planLimitIssues: (limit: number) =>
    new TeamError(
      ERROR_CODES.PLAN_LIMIT_ISSUES,
      `Your plan allows a maximum of ${limit} issues. Upgrade to add more.`,
      422,
      undefined,
      { limit, type: "issues" }
    ),
};

/**
 * Rate limit error helpers
 */
export const RateLimitErrors = {
  invitations: () =>
    new TeamError(
      ERROR_CODES.RATE_LIMIT_INVITATIONS,
      "Too many invitations sent. Please try again later.",
      429
    ),

  exports: () =>
    new TeamError(
      ERROR_CODES.RATE_LIMIT_EXPORTS,
      "Too many export requests. Please try again later.",
      429
    ),
};
