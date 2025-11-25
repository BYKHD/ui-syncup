import { Resend } from "resend"

import { env } from "./env"

/**
 * Resend client instance
 * Initialized with the API key from environment variables
 */
export const resend = new Resend(env.RESEND_API_KEY)

/**
 * Default sender email address
 */
export const DEFAULT_SENDER = env.RESEND_FROM_EMAIL
