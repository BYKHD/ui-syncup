/**
 * POST /api/setup/admin
 * 
 * Creates the first admin user during instance setup.
 * Includes input validation and rate limiting to prevent abuse.
 * 
 * @module api/setup/admin
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin, isSetupComplete } from "@/server/setup";
import { createSession } from "@/server/auth/session";
import { setSessionCookie } from "@/server/auth/cookies";
import { checkLimit, createRateLimitKey, RATE_LIMITS } from "@/server/auth/rate-limiter";
import { logger } from "@/lib/logger";

/**
 * Password validation regex:
 * - At least 8 characters
 * - At least one letter (a-z or A-Z)
 * - At least one number (0-9)
 */
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

/**
 * Request body schema
 */
const CreateAdminSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      passwordRegex,
      "Password must be at least 8 characters with at least one letter and one number"
    ),
  confirmPassword: z.string(),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type CreateAdminInput = z.infer<typeof CreateAdminSchema>;

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * POST /api/setup/admin
 * 
 * Creates the first admin user with TEAM_OWNER role.
 * 
 * Request body:
 * {
 *   "email": "admin@example.com",
 *   "password": "SecurePass123",
 *   "confirmPassword": "SecurePass123",
 *   "displayName": "Admin User"
 * }
 * 
 * Success response (201):
 * {
 *   "success": true,
 *   "userId": "uuid",
 *   "email": "admin@example.com",
 *   "message": "Admin account created successfully"
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input)
 * - 409: Admin already exists (setup already started)
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientIP = getClientIP(request);

  try {
    // Check rate limit (5 requests per minute per IP)
    const rateLimitKey = createRateLimitKey.setupAdminIp(clientIP);
    const isAllowed = await checkLimit(
      rateLimitKey,
      RATE_LIMITS.SETUP_ADMIN.limit,
      RATE_LIMITS.SETUP_ADMIN.windowMs,
      { ipAddress: clientIP, requestId }
    );

    if (!isAllowed) {
      logger.warn("setup.admin.rate_limited", {
        requestId,
        ipAddress: clientIP,
      });

      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many attempts. Please wait a moment before trying again.",
          },
        },
        { status: 429 }
      );
    }

    // Check if setup is already complete
    const setupComplete = await isSetupComplete();
    if (setupComplete) {
      logger.warn("setup.admin.already_complete", {
        requestId,
        ipAddress: clientIP,
      });

      return NextResponse.json(
        {
          error: {
            code: "SETUP_ALREADY_COMPLETE",
            message: "Instance setup has already been completed.",
          },
        },
        { status: 409 }
      );
    }

    // Parse and validate request body
    let body: CreateAdminInput;
    try {
      const rawBody = await request.json();
      body = CreateAdminSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        logger.info("setup.admin.validation_error", {
          requestId,
          errors: fieldErrors,
        });

        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              fields: fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid request body",
          },
        },
        { status: 400 }
      );
    }

    // Create admin user
    const result = await createAdmin({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });

    // Create session for auto-login (returns token string directly)
    const sessionToken = await createSession(result.userId);
    
    // Set session cookie
    const response = NextResponse.json(
      {
        success: true,
        userId: result.userId,
        email: body.email,
        message: "Admin account created successfully",
      },
      { status: 201 }
    );

    // Set the session cookie on the response
    setSessionCookie(response, sessionToken);

    logger.info("setup.admin.success", {
      requestId,
      userId: result.userId,
      email: body.email,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle specific errors
    if (errorMessage.includes("already exists")) {
      logger.warn("setup.admin.already_exists", {
        requestId,
        error: errorMessage,
      });

      return NextResponse.json(
        {
          error: {
            code: "ADMIN_ALREADY_EXISTS",
            message: "Admin user already exists. Setup has already been started.",
          },
        },
        { status: 409 }
      );
    }

    logger.error("setup.admin.error", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating admin account.",
        },
      },
      { status: 500 }
    );
  }
}
