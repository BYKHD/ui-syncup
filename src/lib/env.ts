import { z } from "zod"

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

function optionalString() {
  return z.preprocess(emptyToUndefined, z.string().min(1).optional())
}

function optionalUrl() {
  return z.preprocess(emptyToUndefined, z.string().url().optional())
}

function optionalEmail() {
  return z.preprocess(emptyToUndefined, z.string().email().optional())
}

/**
 * Environment variable schema with comprehensive validation
 * Validates all required configuration for Vercel deployment and external services
 * 
 * In development mode, OAuth and email services are optional to enable:
 * - Quick fresh starts without external service credentials
 * - Email/password only authentication
 * - Console output for emails instead of actual sending
 */
const envSchema = z.object({
  // Node.js Environment
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .describe("Public application URL (e.g., https://ui-syncup.com)"),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .describe("Public API base URL"),

  // Database (Supabase PostgreSQL)
  DATABASE_URL: z
    .string()
    .min(1)
    .describe("PostgreSQL connection string (pooled)"),
  DIRECT_URL: z
    .string()
    .min(1)
    .optional()
    .describe("Direct PostgreSQL connection string (for migrations)"),
  // SUPABASE_URL is optional - local dev uses NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_URL: optionalUrl().describe(
    "Supabase project URL (optional in dev, uses NEXT_PUBLIC_SUPABASE_URL)"
  ),
  // NEXT_PUBLIC_SUPABASE_URL for client-side access
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl().describe(
    "Supabase public URL for client-side"
  ),
  // SUPABASE_ANON_KEY optional - local uses NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_ANON_KEY: optionalString().describe(
    "Supabase anonymous/public key"
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString().describe(
    "Supabase public anon key for client-side"
  ),
  SUPABASE_SERVICE_ROLE_KEY: optionalString().describe(
    "Supabase service role key (server-side only)"
  ),

  // Storage (Cloudflare R2 - Production)
  // These are optional in development when using local MinIO via STORAGE_* variables
  R2_ACCOUNT_ID: optionalString().describe(
    "Cloudflare R2 account ID (production only)"
  ),
  R2_ACCESS_KEY_ID: optionalString().describe(
    "Cloudflare R2 access key ID (production only)"
  ),
  R2_SECRET_ACCESS_KEY: optionalString().describe(
    "Cloudflare R2 secret access key (production only)"
  ),
  R2_BUCKET_NAME: optionalString().describe(
    "Cloudflare R2 bucket name (production only)"
  ),
  R2_PUBLIC_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .refine((val) => !val || val.startsWith("http"), {
      message: "Must be a valid URL if provided",
    })
    .describe("Cloudflare R2 public URL for assets (production only)"),

  // Storage (Unified S3-compatible - MinIO local / R2 production)
  // Shared connection settings
  STORAGE_ENDPOINT: optionalUrl().describe(
    "S3-compatible storage endpoint URL"
  ),
  STORAGE_REGION: optionalString().describe("Storage region"),
  STORAGE_ACCESS_KEY_ID: optionalString().describe("Storage access key ID"),
  STORAGE_SECRET_ACCESS_KEY: optionalString().describe(
    "Storage secret access key"
  ),
  // Attachments bucket (issue attachments - requires auth)
  STORAGE_ATTACHMENTS_BUCKET: optionalString().describe(
    "Attachments bucket name"
  ),
  STORAGE_ATTACHMENTS_PUBLIC_URL: optionalUrl().describe(
    "Public URL for attachments bucket"
  ),
  // Media bucket (avatars, team logos - public read)
  STORAGE_MEDIA_BUCKET: optionalString().describe("Media bucket name"),
  STORAGE_MEDIA_PUBLIC_URL: optionalUrl().describe(
    "Public URL for media bucket"
  ),

  // Authentication (Google OAuth)
  // Optional in development - enables email/password only mode
  GOOGLE_CLIENT_ID: optionalString().describe(
    "Google OAuth client ID (optional in dev)"
  ),
  GOOGLE_CLIENT_SECRET: optionalString().describe(
    "Google OAuth client secret (optional in dev)"
  ),
  GOOGLE_REDIRECT_URI: optionalUrl().describe(
    "Google OAuth redirect URI (optional in dev)"
  ),

  // Authentication (Microsoft OAuth - optional, enables Microsoft sign-in when configured)
  MICROSOFT_CLIENT_ID: optionalString().describe("Microsoft OAuth client ID"),
  MICROSOFT_CLIENT_SECRET: optionalString().describe(
    "Microsoft OAuth client secret"
  ),
  MICROSOFT_TENANT_ID: optionalString().describe(
    "Microsoft tenant ID (defaults to 'common' for multi-tenant)"
  ),

  // Authentication (Atlassian OAuth - optional, enables Atlassian sign-in when configured)
  ATLASSIAN_CLIENT_ID: optionalString().describe("Atlassian OAuth client ID"),
  ATLASSIAN_CLIENT_SECRET: optionalString().describe(
    "Atlassian OAuth client secret"
  ),

  // better-auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .describe("better-auth secret key (min 32 characters)"),
  BETTER_AUTH_URL: z
    .string()
    .url()
    .describe("better-auth base URL")
    .refine(
      (url) => {
        // In production/preview, ensure it's not localhost
        if (process.env.VERCEL_ENV && url.includes("localhost")) {
          return false
        }
        return true
      },
      {
        message:
          "BETTER_AUTH_URL cannot be localhost in Vercel deployments. Configure it in Vercel Dashboard → Settings → Environment Variables",
      }
    ),

  // Email (Resend)
  // Optional in development - falls back to console logging
  RESEND_API_KEY: optionalString().describe(
    "Resend API key (optional in dev - uses console fallback)"
  ),
  RESEND_FROM_EMAIL: optionalEmail().describe(
    "Default sender email address (optional in dev)"
  ),

  // Feature Flags (Optional)
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .optional()
    .describe("Enable analytics (true/false)"),
  NEXT_PUBLIC_ENABLE_DEBUG: z
    .string()
    .optional()
    .describe("Enable debug mode (true/false)"),
  NEXT_PUBLIC_ENABLE_HARD_DELETE: z
    .string()
    .optional()
    .describe("Enable hard delete for teams and projects (true/false)"),

  // Vercel System Variables (Auto-populated by Vercel)
  VERCEL_ENV: z
    .enum(["production", "preview", "development"])
    .optional()
    .describe("Vercel environment type"),
  VERCEL_URL: z
    .string()
    .optional()
    .describe("Vercel deployment URL"),
  VERCEL_GIT_COMMIT_REF: z
    .string()
    .optional()
    .describe("Git branch name"),
  VERCEL_GIT_COMMIT_SHA: z
    .string()
    .optional()
    .describe("Git commit SHA"),
  VERCEL_GIT_COMMIT_MESSAGE: z
    .string()
    .optional()
    .describe("Git commit message"),
}).superRefine((data, ctx) => {
  const isProdLike =
    data.NODE_ENV === "production" ||
    data.VERCEL_ENV === "production" ||
    data.VERCEL_ENV === "preview"

  if (isProdLike) {
    if (!data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "Required in production.",
      })
    }

    if (!data.RESEND_FROM_EMAIL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_FROM_EMAIL"],
        message: "Required in production.",
      })
    }
  }

  const hasGoogle = Boolean(
    data.GOOGLE_CLIENT_ID ||
      data.GOOGLE_CLIENT_SECRET ||
      data.GOOGLE_REDIRECT_URI
  )

  if (hasGoogle) {
    if (!data.GOOGLE_CLIENT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_ID"],
        message: "Required when configuring Google OAuth.",
      })
    }

    if (!data.GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_SECRET"],
        message: "Required when configuring Google OAuth.",
      })
    }

    if (!data.GOOGLE_REDIRECT_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_REDIRECT_URI"],
        message: "Required when configuring Google OAuth.",
      })
    }
  }

  const hasMicrosoft = Boolean(
    data.MICROSOFT_CLIENT_ID || data.MICROSOFT_CLIENT_SECRET
  )

  if (hasMicrosoft) {
    if (!data.MICROSOFT_CLIENT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MICROSOFT_CLIENT_ID"],
        message: "Required when configuring Microsoft OAuth.",
      })
    }

    if (!data.MICROSOFT_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MICROSOFT_CLIENT_SECRET"],
        message: "Required when configuring Microsoft OAuth.",
      })
    }
  }

  const hasAtlassian = Boolean(
    data.ATLASSIAN_CLIENT_ID || data.ATLASSIAN_CLIENT_SECRET
  )

  if (hasAtlassian) {
    if (!data.ATLASSIAN_CLIENT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ATLASSIAN_CLIENT_ID"],
        message: "Required when configuring Atlassian OAuth.",
      })
    }

    if (!data.ATLASSIAN_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ATLASSIAN_CLIENT_SECRET"],
        message: "Required when configuring Atlassian OAuth.",
      })
    }
  }

  const hasResend = Boolean(data.RESEND_API_KEY || data.RESEND_FROM_EMAIL)
  if (hasResend) {
    if (!data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "Required when configuring Resend.",
      })
    }

    if (!data.RESEND_FROM_EMAIL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_FROM_EMAIL"],
        message: "Required when configuring Resend.",
      })
    }
  }
})

export type Env = z.infer<typeof envSchema>

/**
 * Format validation errors into a readable message
 */
function formatValidationErrors(errors: z.ZodError): string {
  const fieldErrors = errors.flatten().fieldErrors
  const missing: string[] = []
  const invalid: string[] = []

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (messages?.some((msg) => msg.includes("Required"))) {
      missing.push(field)
    } else {
      invalid.push(`${field}: ${messages?.join(", ")}`)
    }
  })

  let message = "❌ Environment variable validation failed:\n\n"

  if (missing.length > 0) {
    message += `Missing required variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\n`
  }

  if (invalid.length > 0) {
    message += `Invalid variable values:\n${invalid.map((v) => `  - ${v}`).join("\n")}\n\n`
  }

  message += "Please check your environment configuration:\n"
  message += "  • Local development: Copy .env.example to .env.local and populate values\n"
  message += "  • Vercel deployment: Set variables in Project Settings → Environment Variables\n"
  message += "  • See docs/DEPLOYMENT.md for detailed setup instructions\n"

  return message
}

/**
 * Validate and parse environment variables
 * Throws a detailed error if validation fails
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errorMessage = formatValidationErrors(parsed.error)
    console.error(errorMessage)
    throw new Error("Environment validation failed")
  }

  return parsed.data
}

/**
 * Validated and typed environment variables
 * Safe to use throughout the application
 */
export const env = validateEnv()

/**
 * Helper functions for environment detection
 */
export const isProduction = () => env.NODE_ENV === "production"
export const isDevelopment = () => env.NODE_ENV === "development"
export const isTest = () => env.NODE_ENV === "test"
export const isPreview = () => env.VERCEL_ENV === "preview"

/**
 * Get deployment information from Vercel system variables
 */
export function getDeploymentInfo() {
  return {
    environment: env.VERCEL_ENV || env.NODE_ENV,
    branch: env.VERCEL_GIT_COMMIT_REF || "local",
    commitSha: env.VERCEL_GIT_COMMIT_SHA || "unknown",
    commitMessage: env.VERCEL_GIT_COMMIT_MESSAGE || "",
    deploymentUrl: env.VERCEL_URL || "localhost:3000",
    timestamp: new Date().toISOString(),
  }
}
