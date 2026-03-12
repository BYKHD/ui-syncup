// src/server/setup/index.ts

/**
 * Setup Module Barrel Export
 * 
 * This module provides the server-side setup functionality for
 * the self-hosted onboarding flow.
 */

// Types
export * from "./types";

// Services
export {
  getInstanceStatus,
  createAdmin,
  saveInstanceConfig,
  completeSetup,
  isSetupComplete,
} from "./setup-service";

export {
  checkDatabaseHealth,
  checkEmailHealth,
  checkStorageHealth,
  checkRedisHealth,
  checkAllServicesHealth,
  logServiceStatus,
} from "./health-check-service";

export {
  createSampleProject,
  hasSampleData,
  deleteSampleData,
} from "./sample-data-service";
