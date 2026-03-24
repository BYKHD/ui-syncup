// src/server/setup/setup-service.ts

/**
 * Setup Service
 * 
 * Core operations for instance setup including:
 * - Checking instance status
 * - Creating admin user
 * - Saving instance configuration
 * - Marking setup as complete
 */

import { db } from "@/lib/db";
import { instanceSettings, users, teams, teamMembers, account } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { isMultiWorkspaceMode } from "@/config/workspace";
import { isEmailVerificationSkipped } from "@/config/auth";
import { logger } from "@/lib/logger";
import type {
  InstanceStatus,
  CreateAdminInput,
  InstanceConfigInput,
  CompleteSetupInput,
} from "./types";

/**
 * Get the current instance status.
 * 
 * @returns Instance status including setup completion state
 */
export async function getInstanceStatus(): Promise<InstanceStatus> {
  try {
    // Query instance settings (singleton table)
    const settings = await db.query.instanceSettings.findFirst();

    if (!settings) {
      // No settings means setup is not complete
      return {
        isSetupComplete: false,
        instanceName: null,
        adminEmail: null,
        defaultWorkspaceId: null,
        defaultMemberRole: "WORKSPACE_MEMBER",
        isMultiWorkspaceMode: isMultiWorkspaceMode(),
        skipEmailVerification: isEmailVerificationSkipped(),
      };
    }

    // Get admin email if admin user exists
    let adminEmail: string | null = null;
    if (settings.adminUserId) {
      const adminUser = await db.query.users.findFirst({
        where: eq(users.id, settings.adminUserId),
        columns: { email: true },
      });
      adminEmail = adminUser?.email ?? null;
    }

    return {
      isSetupComplete: settings.setupCompletedAt !== null,
      instanceName: settings.instanceName,
      adminEmail,
      defaultWorkspaceId: settings.defaultWorkspaceId,
      defaultMemberRole: settings.defaultMemberRole as "WORKSPACE_VIEWER" | "WORKSPACE_MEMBER" | "WORKSPACE_EDITOR",
      isMultiWorkspaceMode: isMultiWorkspaceMode(),
      skipEmailVerification: isEmailVerificationSkipped(),
    };
  } catch (error) {
    // PostgreSQL error code 42P01 = "undefined_table" (relation does not exist).
    // This happens on a fresh install before migrations have been applied.
    // Treat it as "setup not complete" so the app redirects to /setup.
    if (isUndefinedTableError(error)) {
      logger.warn("instance_settings table does not exist — treating as fresh install");
      return {
        isSetupComplete: false,
        instanceName: null,
        adminEmail: null,
        defaultWorkspaceId: null,
        defaultMemberRole: "WORKSPACE_MEMBER",
        isMultiWorkspaceMode: isMultiWorkspaceMode(),
        skipEmailVerification: isEmailVerificationSkipped(),
      };
    }
    logger.error("Failed to get instance status", { error });
    throw error;
  }
}

function isUndefinedTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const err = error as Record<string, unknown>;
  // postgres.js PostgresError: code is directly on the error
  if (err.code === "42P01") return true;
  // Walk the cause chain in case drizzle wraps the error
  if (err.cause != null) return isUndefinedTableError(err.cause);
  // Fallback: serialize the entire error to catch deeply nested or non-standard wrapping
  if (typeof err.message === "string" && /relation .+ does not exist/i.test(err.message)) return true;
  try {
    const serialized = JSON.stringify(error);
    if (/"code"\s*:\s*"42P01"/.test(serialized)) return true;
    if (/relation .+ does not exist/i.test(serialized)) return true;
  } catch {
    // JSON.stringify can fail on circular references — ignore and fall through
  }
  return false;
}

/**
 * Create the first admin user.
 * 
 * @param input - Admin user details
 * @returns Created user ID
 * @throws Error if admin already exists
 */
export async function createAdmin(input: CreateAdminInput): Promise<{ userId: string }> {
  const { email, password, displayName } = input;

  // Check if any users already exist
  const existingUsers = await db.query.users.findFirst();
  if (existingUsers) {
    throw new Error("Admin user already exists. Setup has already been started.");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with admin privileges
  // Admin is always email-verified: they control the instance directly
  const [newUser] = await db.insert(users).values({
    email: email.toLowerCase(),
    name: displayName,
    passwordHash: hashedPassword,
    emailVerified: true,
  }).returning({ id: users.id });

  if (!newUser) {
    throw new Error("Failed to create admin user");
  }

  // Create the Better Auth credential account record so email/password sign-in works.
  // Better Auth looks up the `account` table (providerId = "credential") on every sign-in;
  // without this row the login returns "Credential account not found".
  await db.insert(account).values({
    accountId: newUser.id,
    providerId: "credential",
    userId: newUser.id,
    password: hashedPassword,
  });

  // Create or update instance settings with admin user
  const existing = await db.query.instanceSettings.findFirst();
  if (existing) {
    await db.update(instanceSettings)
      .set({ 
        adminUserId: newUser.id,
        updatedAt: new Date(),
      })
      .where(eq(instanceSettings.id, existing.id));
  } else {
    await db.insert(instanceSettings).values({
      adminUserId: newUser.id,
    });
  }

  logger.info("Admin user created", { userId: newUser.id, email });

  return { userId: newUser.id };
}

/**
 * Save instance configuration.
 * 
 * @param input - Instance configuration
 */
export async function saveInstanceConfig(input: InstanceConfigInput): Promise<void> {
  const { instanceName, defaultMemberRole } = input;

  const existing = await db.query.instanceSettings.findFirst();
  if (!existing) {
    // Create new settings
    await db.insert(instanceSettings).values({
      instanceName,
      defaultMemberRole: defaultMemberRole || "WORKSPACE_MEMBER",
    });
  } else {
    // Update existing settings
    await db.update(instanceSettings)
      .set({
        instanceName,
        defaultMemberRole: defaultMemberRole || existing.defaultMemberRole,
        updatedAt: new Date(),
      })
      .where(eq(instanceSettings.id, existing.id));
  }

  logger.info("Instance configuration saved", { instanceName });
}

/**
 * Create the first workspace and mark setup as complete.
 * 
 * @param adminUserId - Admin user ID
 * @param input - Setup completion input
 * @returns Created workspace ID
 */
export async function completeSetup(
  adminUserId: string,
  input: CompleteSetupInput
): Promise<{ workspaceId: string }> {
  const { workspaceName, workspaceSlug } = input;

  // Generate slug if not provided
  const slug = workspaceSlug || generateSlug(workspaceName);

  // Create the first workspace
  const [workspace] = await db.insert(teams).values({
    name: workspaceName,
    slug,
  }).returning({ id: teams.id });

  if (!workspace) {
    throw new Error("Failed to create workspace");
  }

  // Add admin as WORKSPACE_OWNER with WORKSPACE_EDITOR operational role
  await db.insert(teamMembers).values({
    teamId: workspace.id,
    userId: adminUserId,
    managementRole: "WORKSPACE_OWNER",
    operationalRole: "WORKSPACE_EDITOR",
  });

  // Update instance settings to mark setup complete
  const settings = await db.query.instanceSettings.findFirst();
  if (settings) {
    await db.update(instanceSettings)
      .set({
        setupCompletedAt: new Date(),
        defaultWorkspaceId: workspace.id,
        updatedAt: new Date(),
      })
      .where(eq(instanceSettings.id, settings.id));
  }

  logger.info("Setup completed", { workspaceId: workspace.id, workspaceName });

  return { workspaceId: workspace.id };
}

/**
 * Check if setup is complete.
 * 
 * @returns true if setup is complete
 */
export async function isSetupComplete(): Promise<boolean> {
  const status = await getInstanceStatus();
  return status.isSetupComplete;
}

/**
 * Generate a URL-safe slug from a name.
 * 
 * @param name - The name to convert to a slug
 * @returns URL-safe slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
