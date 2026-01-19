import { Resend } from "resend"

import { env } from "./env"

/**
 * Check if email service is configured
 * When not configured, emails fall back to console logging
 */
export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
}

/**
 * Resend client instance
 * Initialized with the API key from environment variables
 * May be undefined if RESEND_API_KEY is not set
 */
export const resend = env.RESEND_API_KEY 
  ? new Resend(env.RESEND_API_KEY)
  : null

/**
 * Default sender email address
 * Falls back to a placeholder in development when not configured
 */
export const DEFAULT_SENDER = env.RESEND_FROM_EMAIL ?? "noreply@localhost"

