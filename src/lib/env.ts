import { z } from "zod"

/**
 * Environment variable schema with comprehensive validation
 * Validates all required configuration for Vercel deployment and external services
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
  SUPABASE_URL: z
    .string()
    .url()
    .describe("Supabase project URL"),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .describe("Supabase anonymous/public key"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .describe("Supabase service role key (server-side only)"),

  // Storage (Cloudflare R2 - Production)
  // These are optional in development when using local MinIO via STORAGE_* variables
  R2_ACCOUNT_ID: z
    .string()
    .optional()
    .describe("Cloudflare R2 account ID (production only)"),
  R2_ACCESS_KEY_ID: z
    .string()
    .optional()
    .describe("Cloudflare R2 access key ID (production only)"),
  R2_SECRET_ACCESS_KEY: z
    .string()
    .optional()
    .describe("Cloudflare R2 secret access key (production only)"),
  R2_BUCKET_NAME: z
    .string()
    .optional()
    .describe("Cloudflare R2 bucket name (production only)"),
  R2_PUBLIC_URL: z
    .string()
    .url()
    .optional()
    .describe("Cloudflare R2 public URL for assets (production only)"),

  // Storage (Unified S3-compatible - MinIO local / R2 production)
  // Shared connection settings
  STORAGE_ENDPOINT: z
    .string()
    .optional()
    .describe("S3-compatible storage endpoint URL"),
  STORAGE_REGION: z
    .string()
    .optional()
    .describe("Storage region"),
  STORAGE_ACCESS_KEY_ID: z
    .string()
    .optional()
    .describe("Storage access key ID"),
  STORAGE_SECRET_ACCESS_KEY: z
    .string()
    .optional()
    .describe("Storage secret access key"),
  // Attachments bucket (issue attachments - requires auth)
  STORAGE_ATTACHMENTS_BUCKET: z
    .string()
    .optional()
    .describe("Attachments bucket name"),
  STORAGE_ATTACHMENTS_PUBLIC_URL: z
    .string()
    .optional()
    .describe("Public URL for attachments bucket"),
  // Media bucket (avatars, team logos - public read)
  STORAGE_MEDIA_BUCKET: z
    .string()
    .optional()
    .describe("Media bucket name"),
  STORAGE_MEDIA_PUBLIC_URL: z
    .string()
    .optional()
    .describe("Public URL for media bucket"),

  // Authentication (Google OAuth)
  GOOGLE_CLIENT_ID: z
    .string()
    .min(1)
    .describe("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1)
    .describe("Google OAuth client secret"),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .describe("Google OAuth redirect URI"),

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
  RESEND_API_KEY: z
    .string()
    .min(1)
    .describe("Resend API key"),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .describe("Default sender email address (e.g., noreply@ui-syncup.com)"),

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
