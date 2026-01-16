import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { projects } from "@/server/db/schema/projects";
import { eq, and, isNull, sql } from "drizzle-orm";
import { QUOTAS } from "@/config/quotas";
import { logger } from "@/lib/logger";

/**
 * Error codes for resource quota violations
 */
export const QUOTA_ERROR_CODES = {
  MEMBERS: "QUOTA_EXCEEDED_MEMBERS",
  PROJECTS: "QUOTA_EXCEEDED_PROJECTS",
  ISSUES: "QUOTA_EXCEEDED_ISSUES",
} as const;

export type QuotaErrorCode = typeof QUOTA_ERROR_CODES[keyof typeof QUOTA_ERROR_CODES];

/**
 * Resource quota error with specific error code
 */
export class QuotaError extends Error {
  constructor(
    public code: QuotaErrorCode,
    public limit: number | "unlimited",
    public current: number,
    message?: string
  ) {
    super(message || `Resource quota reached: ${code}`);
    this.name = "QuotaError";
  }
}

/**
 * Check if adding a member would exceed the team's quota
 * 
 * @param teamId - Team ID to check
 * @returns true if member can be added, throws QuotaError if limit exceeded
 */
export async function checkMemberLimit(teamId: string): Promise<boolean> {
  // If unlimited, always allow
  if (QUOTAS.members === "unlimited") {
    return true;
  }

  // Count current members
  const memberCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const currentCount = parseInt(String(memberCountResult[0]?.count ?? '0'), 10);

  // Check if adding one more would exceed limit
  if (currentCount >= QUOTAS.members) {
    logger.warn(`Team ${teamId} reached member quota: ${currentCount}/${QUOTAS.members}`);
    
    throw new QuotaError(
      QUOTA_ERROR_CODES.MEMBERS,
      QUOTAS.members,
      currentCount,
      `Cannot add member: team has reached the instance quota of ${QUOTAS.members} members`
    );
  }

  return true;
}

/**
 * Check if creating a project would exceed the team's quota
 * 
 * @param teamId - Team ID to check
 * @returns true if project can be created, throws QuotaError if limit exceeded
 */
export async function checkProjectLimit(teamId: string): Promise<boolean> {
  // If unlimited, always allow
  if (QUOTAS.projects === "unlimited") {
    return true;
  }

  // Count current projects for this team
  const projectCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.teamId, teamId));

  const currentCount = parseInt(String(projectCountResult[0]?.count ?? '0'), 10);

  // Check if adding one more would exceed limit
  if (currentCount >= QUOTAS.projects) {
    logger.warn(`Team ${teamId} reached project quota: ${currentCount}/${QUOTAS.projects}`);
    
    throw new QuotaError(
      QUOTA_ERROR_CODES.PROJECTS,
      QUOTAS.projects,
      currentCount,
      `Cannot create project: team has reached the instance quota of ${QUOTAS.projects} projects`
    );
  }

  return true;
}

/**
 * Check if creating an issue would exceed the team's quota
 * 
 * @param teamId - Team ID to check
 * @returns true if issue can be created, throws QuotaError if limit exceeded
 */
export async function checkIssueLimit(teamId: string): Promise<boolean> {
  // If unlimited, always allow
  if (QUOTAS.issues === "unlimited") {
    return true;
  }
  
  // Placeholder implementation for issue counting
  const currentCount = 0; // TODO: Implement actual issue counting when table exists
  
  if (currentCount >= QUOTAS.issues) {
    logger.warn(`Team ${teamId} reached issue quota: ${currentCount}/${QUOTAS.issues}`);
    
    throw new QuotaError(
      QUOTA_ERROR_CODES.ISSUES,
      QUOTAS.issues,
      currentCount,
      `Cannot create issue: team has reached the instance quota of ${QUOTAS.issues} issues`
    );
  }

  return true;
}

/**
 * Get current usage for a team
 * Useful for displaying usage statistics in UI
 * 
 * @param teamId - Team ID to check
 * @returns Current usage counts
 */
export async function getTeamUsage(teamId: string): Promise<{
  members: number;
  projects: number;
  issues: number;
}> {
  // Get member count
  const memberCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const memberCount = parseInt(String(memberCountResult[0]?.count ?? '0'), 10);

  // Get project count
  const projectCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.teamId, teamId));

  const projectCount = parseInt(String(projectCountResult[0]?.count ?? '0'), 10);

  // Get issue count (placeholder)
  const issueCount = 0; // TODO: Update when issues table exists

  return {
    members: memberCount,
    projects: projectCount,
    issues: issueCount,
  };
}

/**
 * Check if a team can perform an operation based on resource quotas
 * Returns detailed information about the limit check
 * 
 * @param teamId - Team ID to check (kept for API compatibility, though limits are global)
 * @param resource - Resource type to check
 * @returns Limit check result with details
 */
export async function checkResourceLimit(
  teamId: string,
  resource: "members" | "projects" | "issues"
): Promise<{
  allowed: boolean;
  limit: number | "unlimited";
  current: number;
  remaining: number | "unlimited";
}> {
  const limit = QUOTAS[resource];
  const usage = await getTeamUsage(teamId);
  const current = usage[resource];

  if (limit === "unlimited") {
    return {
      allowed: true,
      limit: "unlimited",
      current,
      remaining: "unlimited",
    };
  }

  const allowed = current < limit;
  const remaining = Math.max(0, limit - current);

  return {
    allowed,
    limit,
    current,
    remaining,
  };
}
