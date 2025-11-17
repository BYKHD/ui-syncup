/**
 * Environment-specific configuration utilities
 * 
 * This module provides helper functions for environment detection and feature flags.
 * 
 * @example
 * ```typescript
 * import { isProduction, isFeatureEnabled, config } from '@/lib/config'
 * 
 * // Environment detection
 * if (isProduction()) {
 *   // Production-only code
 * }
 * 
 * // Feature flags
 * if (isFeatureEnabled('analytics')) {
 *   // Initialize analytics
 * }
 * 
 * // Environment-specific values
 * const apiTimeout = getEnvValue({
 *   production: 5000,
 *   development: 30000,
 *   default: 10000,
 * })
 * 
 * // Access config object
 * console.log(config.env.name) // 'production' | 'preview' | 'development' | 'test'
 * console.log(config.features.analytics) // boolean
 * console.log(config.deployment.branch) // 'main' | 'develop' | etc.
 * ```
 */

import { env } from "./env"

/**
 * Environment detection utilities
 * Provides consistent environment checks across the application
 */

/**
 * Check if running in production environment
 * @returns true if NODE_ENV is 'production'
 */
export function isProduction(): boolean {
  return env.NODE_ENV === "production"
}

/**
 * Check if running in development environment
 * @returns true if NODE_ENV is 'development'
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === "development"
}

/**
 * Check if running in test environment
 * @returns true if NODE_ENV is 'test'
 */
export function isTest(): boolean {
  return env.NODE_ENV === "test"
}

/**
 * Check if running in Vercel preview environment
 * @returns true if VERCEL_ENV is 'preview'
 */
export function isPreview(): boolean {
  return env.VERCEL_ENV === "preview"
}

/**
 * Check if running in Vercel production environment
 * @returns true if VERCEL_ENV is 'production'
 */
export function isVercelProduction(): boolean {
  return env.VERCEL_ENV === "production"
}

/**
 * Check if running on Vercel platform
 * @returns true if VERCEL_ENV is defined
 */
export function isVercel(): boolean {
  return env.VERCEL_ENV !== undefined
}

/**
 * Get the current environment name
 * @returns 'production' | 'preview' | 'development' | 'test'
 */
export function getEnvironment(): "production" | "preview" | "development" | "test" {
  if (env.VERCEL_ENV === "preview") return "preview"
  if (env.VERCEL_ENV === "production") return "production"
  return env.NODE_ENV
}

/**
 * Feature flag utilities
 * Provides consistent feature flag checks across the application
 */

/**
 * Parse a boolean feature flag from environment variable
 * Accepts: 'true', '1', 'yes', 'on' (case-insensitive) as true
 * @param value - Environment variable value
 * @returns boolean value of the flag
 */
function parseFeatureFlag(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.toLowerCase().trim()
  return ["true", "1", "yes", "on"].includes(normalized)
}

/**
 * Check if analytics is enabled
 * @returns true if NEXT_PUBLIC_ENABLE_ANALYTICS is set to a truthy value
 */
export function isAnalyticsEnabled(): boolean {
  return parseFeatureFlag(env.NEXT_PUBLIC_ENABLE_ANALYTICS)
}

/**
 * Check if debug mode is enabled
 * @returns true if NEXT_PUBLIC_ENABLE_DEBUG is set to a truthy value
 */
export function isDebugEnabled(): boolean {
  return parseFeatureFlag(env.NEXT_PUBLIC_ENABLE_DEBUG)
}

/**
 * Get a feature flag value by name
 * @param flagName - Name of the feature flag environment variable
 * @param defaultValue - Default value if flag is not set
 * @returns boolean value of the flag
 */
export function getFeatureFlag(
  flagName: string,
  defaultValue: boolean = false
): boolean {
  const value = process.env[flagName]
  if (value === undefined) return defaultValue
  return parseFeatureFlag(value)
}

/**
 * Configuration object with all environment-specific settings
 */
export const config = {
  // Environment detection
  env: {
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    isTest: isTest(),
    isPreview: isPreview(),
    isVercelProduction: isVercelProduction(),
    isVercel: isVercel(),
    name: getEnvironment(),
  },

  // Feature flags
  features: {
    analytics: isAnalyticsEnabled(),
    debug: isDebugEnabled(),
  },

  // Application URLs
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    apiUrl: env.NEXT_PUBLIC_API_URL,
  },

  // Deployment info (Vercel-specific)
  deployment: {
    branch: env.VERCEL_GIT_COMMIT_REF || "local",
    commitSha: env.VERCEL_GIT_COMMIT_SHA || "unknown",
    commitMessage: env.VERCEL_GIT_COMMIT_MESSAGE || "",
    url: env.VERCEL_URL || "localhost:3000",
  },
} as const

/**
 * Type-safe feature flag names
 */
export type FeatureFlag = "analytics" | "debug"

/**
 * Check if a specific feature is enabled
 * @param feature - Feature flag name
 * @returns true if the feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return config.features[feature]
}

/**
 * Get environment-specific configuration value
 * Useful for conditional configuration based on environment
 * @param values - Object with environment-specific values
 * @returns Value for the current environment
 */
export function getEnvValue<T>(values: {
  production?: T
  preview?: T
  development?: T
  test?: T
  default: T
}): T {
  const environment = getEnvironment()
  return values[environment] ?? values.default
}

/**
 * Check if running in a browser environment
 * @returns true if running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined"
}

/**
 * Check if running in a server environment
 * @returns true if running on server
 */
export function isServer(): boolean {
  return typeof window === "undefined"
}
