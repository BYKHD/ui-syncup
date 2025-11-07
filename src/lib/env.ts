import { z } from "zod"
import { logger } from "./logger"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .describe("External API base URL"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

if (!parsed.success) {
  logger.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  )
  throw new Error("Environment validation failed. Check .env.* files.")
}

export const env = parsed.data
