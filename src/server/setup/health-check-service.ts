// src/server/setup/health-check-service.ts

/**
 * Health Check Service
 *
 * Provides functions to check the health/connectivity of various services:
 * - Database (PostgreSQL)
 * - Email (Resend / SMTP / console)
 * - Storage (S3-compatible: MinIO, Supabase Storage, R2, etc.)
 * - Redis
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { checkStorage } from "@/server/health/checks/storage";
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
 * Check email service configuration.
 * Detects Resend, SMTP, or console/Mailpit fallback.
 *
 * @returns Service health status for email
 */
export async function checkEmailHealth(): Promise<ServiceHealthStatus> {
  const degradedBehavior = "Invitations will show copy-able links instead of sending emails";

  // Check Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    if (!resendApiKey.startsWith("re_")) {
      return {
        status: "error",
        message: "Invalid Resend API key format",
        degradedBehavior,
      };
    }
    return {
      status: "connected",
      message: "Email configured via Resend",
    };
  }

  // Check SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (smtpHost || smtpPort || smtpFromEmail) {
    if (!smtpHost || !smtpPort || !smtpFromEmail) {
      const missing = [
        !smtpHost && "SMTP_HOST",
        !smtpPort && "SMTP_PORT",
        !smtpFromEmail && "SMTP_FROM_EMAIL",
      ].filter(Boolean).join(", ");
      return {
        status: "error",
        message: `SMTP partially configured — missing: ${missing}`,
        degradedBehavior,
      };
    }

    // Validate co-dependent auth fields
    if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
      return {
        status: "error",
        message: "SMTP authentication requires both SMTP_USER and SMTP_PASSWORD",
        degradedBehavior,
      };
    }

    return {
      status: "connected",
      message: `Email configured via SMTP (${smtpHost}:${smtpPort})`,
    };
  }

  // No provider configured — console/Mailpit fallback
  return {
    status: "not_configured",
    message: "No email provider configured (using Mailpit / console fallback)",
    degradedBehavior,
  };
}

/**
 * Check S3-compatible object storage configuration and bucket readiness.
 * Delegates to the shared checkStorage() probe which uses per-bucket clients
 * from lib/storage.ts and object-level operations (PutObject/HeadObject/DeleteObject).
 * This avoids HeadBucketCommand which can return UnknownError on public-read buckets
 * with certain S3-compatible providers (MinIO, etc.).
 *
 * @returns Service health status for storage
 */
export async function checkStorageHealth(): Promise<ServiceHealthStatus> {
  const degradedBehavior = "File uploads will use local filesystem storage with 10MB per-file limit";

  const result = await checkStorage();

  if (result.status === "ok") {
    return {
      status: "connected",
      message: result.message,
    };
  }

  logger.error("Storage bucket health check failed", { message: result.message });

  return {
    status: "error",
    message: result.message,
    degradedBehavior,
  };
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
