// src/server/setup/health-check-service.ts

/**
 * Health Check Service
 * 
 * Provides functions to check the health/connectivity of various services:
 * - Database (PostgreSQL)
 * - Email (Resend)
 * - Storage (R2/S3)
 * - Redis
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { ServiceHealth, ServiceHealthStatus } from "./types";

/**
 * Check database connectivity.
 * 
 * @returns Service health status for database
 */
export async function checkDatabaseHealth(): Promise<ServiceHealthStatus> {
  try {
    // Execute a simple query to verify connection
    await db.execute(sql`SELECT 1`);
    
    return {
      status: "connected",
      message: "Database connected successfully",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown database error";
    logger.error("Database health check failed", { error: errorMessage });
    
    return {
      status: "error",
      message: `Database connection failed: ${errorMessage}`,
      degradedBehavior: "Application cannot function without database",
    };
  }
}

/**
 * Check email service (Resend) configuration.
 * 
 * @returns Service health status for email
 */
export async function checkEmailHealth(): Promise<ServiceHealthStatus> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    return {
      status: "not_configured",
      message: "Email service not configured (RESEND_API_KEY missing)",
      degradedBehavior: "Invitations will show copy-able links instead of sending emails",
    };
  }

  try {
    // Validate API key format (basic check)
    if (!resendApiKey.startsWith("re_")) {
      return {
        status: "error",
        message: "Invalid Resend API key format",
        degradedBehavior: "Invitations will show copy-able links instead of sending emails",
      };
    }

    // Note: We don't make an actual API call here to avoid rate limiting
    // The actual validation happens when emails are sent
    return {
      status: "connected",
      message: "Email service configured (Resend)",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email error";
    logger.error("Email health check failed", { error: errorMessage });
    
    return {
      status: "error",
      message: `Email service error: ${errorMessage}`,
      degradedBehavior: "Invitations will show copy-able links instead of sending emails",
    };
  }
}

/**
 * Check storage service (R2/S3) configuration.
 * 
 * @returns Service health status for storage
 */
export async function checkStorageHealth(): Promise<ServiceHealthStatus> {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET || process.env.R2_BUCKET;
  const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    return {
      status: "not_configured",
      message: "Cloud storage not configured (S3/R2 credentials missing)",
      degradedBehavior: "File uploads will use local filesystem storage with 10MB per-file limit",
    };
  }

  try {
    // Basic validation - actual connectivity is checked on upload
    return {
      status: "connected",
      message: `Cloud storage configured${endpoint ? ` (${new URL(endpoint).hostname})` : ""}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    logger.error("Storage health check failed", { error: errorMessage });
    
    return {
      status: "error",
      message: `Storage service error: ${errorMessage}`,
      degradedBehavior: "File uploads will use local filesystem storage with 10MB per-file limit",
    };
  }
}

/**
 * Check Redis service configuration.
 * 
 * @returns Service health status for Redis
 */
export async function checkRedisHealth(): Promise<ServiceHealthStatus> {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    return {
      status: "not_configured",
      message: "Redis not configured (REDIS_URL missing)",
      degradedBehavior: "Rate limiting will use in-memory storage (resets on restart)",
    };
  }

  try {
    // Basic URL validation
    new URL(redisUrl);
    
    // Note: We don't establish a connection here to avoid side effects
    // Actual connectivity is validated when Redis is used
    return {
      status: "connected",
      message: "Redis configured",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid Redis URL";
    logger.error("Redis health check failed", { error: errorMessage });
    
    return {
      status: "error",
      message: `Redis configuration error: ${errorMessage}`,
      degradedBehavior: "Rate limiting will use in-memory storage (resets on restart)",
    };
  }
}

/**
 * Check all service health statuses.
 * 
 * @returns Complete service health status
 */
export async function checkAllServicesHealth(): Promise<ServiceHealth> {
  const [database, email, storage, redis] = await Promise.all([
    checkDatabaseHealth(),
    checkEmailHealth(),
    checkStorageHealth(),
    checkRedisHealth(),
  ]);

  return {
    database,
    email,
    storage,
    redis,
  };
}

/**
 * Log service status on startup.
 * 
 * @param health - Service health status
 */
export function logServiceStatus(health: ServiceHealth): void {
  logger.info("Service health check complete", {
    database: health.database.status,
    email: health.email.status,
    storage: health.storage.status,
    redis: health.redis.status,
  });

  // Log warnings for degraded services
  if (health.email.status === "not_configured") {
    logger.warn(`Email: ${health.email.message}. ${health.email.degradedBehavior}`);
  }
  if (health.storage.status === "not_configured") {
    logger.warn(`Storage: ${health.storage.message}. ${health.storage.degradedBehavior}`);
  }
  if (health.redis.status === "not_configured") {
    logger.warn(`Redis: ${health.redis.message}. ${health.redis.degradedBehavior}`);
  }

  // Log errors for failed services
  if (health.database.status === "error") {
    logger.error(`Database: ${health.database.message}`);
  }
}
