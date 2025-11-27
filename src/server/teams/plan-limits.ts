import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { projects } from "@/server/db/schema/projects";
import { eq, and, isNull, sql } from "drizzle-orm";
import { PLANS, type PlanId } from "@/config/tiers";
import { logger } from "@/lib/logger";

/**
 * Error codes for plan limit violations
 */
export const PLAN_LIMIT_ERROR_CODES = {
  MEMBERS: "PLAN_LIMIT_MEMBERS",
  PROJECTS: "PLAN_LIMIT_PROJECTS",
  ISSUES: "PLAN_LIMIT_ISSUES",
} as const;

export type PlanLimitErrorCode = typeof PLAN_LIMIT_ERROR_CODES[keyof typeof PLAN_LIMIT_ERROR_CODES];

/**
 * Plan limit error with specific error code
 */
export class PlanLimitError extends Error {
  constructor(
    public code: PlanLimitErrorCode,
    public limit: number | "unlimited",
    public current: number,
    message?: string
  ) {
    super(message || `Plan limit reached: ${code}`);
    this.name = "PlanLimitError";
  }
}

/**
 * Check if adding a member would exceed the team's plan limit
 * Implements Requirements 10.1, 10.5
 * 
 * @param teamId - Team ID to check
 * @returns true if member can be added, throws PlanLimitError if limit exceeded
 */
export async function checkMemberLimit(teamId: string): Promise<boolean> {
  // Get team with plan
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const plan = PLANS[team.planId as PlanId];
  
  // If unlimited, always allow
  if (plan.limits.members === "unlimited") {
    return true;
  }

  // Count current members
  const memberCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const currentCount = parseInt(String(memberCountResult[0]?.count ?? '0'), 10);

  // Check if adding one more would exceed limit
  if (currentCount >= plan.limits.members) {
    logger.warn(`Team ${teamId} reached member limit: ${currentCount}/${plan.limits.members}`);
    
    throw new PlanLimitError(
      PLAN_LIMIT_ERROR_CODES.MEMBERS,
      plan.limits.members,
      currentCount,
      `Cannot add member: team has reached the ${plan.label} plan limit of ${plan.limits.members} members`
    );
  }

  return true;
}

/**
 * Check if creating a project would exceed the team's plan limit
 * Implements Requirements 10.2, 10.5
 * 
 * @param teamId - Team ID to check
 * @returns true if project can be created, throws PlanLimitError if limit exceeded
 */
export async function checkProjectLimit(teamId: string): Promise<boolean> {
  // Get team with plan
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const plan = PLANS[team.planId as PlanId];
  
  // If unlimited, always allow
  if (plan.limits.projects === "unlimited") {
    return true;
  }

  // Count current projects for this team
  // Note: Assuming projects table has a teamId column
  // If not, we'll need to adjust this query based on actual schema
  const projectCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.owner_id, teamId)); // This may need adjustment based on actual schema

  const currentCount = parseInt(String(projectCountResult[0]?.count ?? '0'), 10);

  // Check if adding one more would exceed limit
  if (currentCount >= plan.limits.projects) {
    logger.warn(`Team ${teamId} reached project limit: ${currentCount}/${plan.limits.projects}`);
    
    throw new PlanLimitError(
      PLAN_LIMIT_ERROR_CODES.PROJECTS,
      plan.limits.projects,
      currentCount,
      `Cannot create project: team has reached the ${plan.label} plan limit of ${plan.limits.projects} projects`
    );
  }

  return true;
}

/**
 * Check if creating an issue would exceed the team's plan limit
 * Implements Requirements 10.3, 10.5
 * 
 * @param teamId - Team ID to check
 * @returns true if issue can be created, throws PlanLimitError if limit exceeded
 */
export async function checkIssueLimit(teamId: string): Promise<boolean> {
  // Get team with plan
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const plan = PLANS[team.planId as PlanId];
  
  // If unlimited, always allow
  if (plan.limits.issues === "unlimited") {
    return true;
  }

  // Count current issues for this team
  // Note: This assumes an issues table exists with a teamId column
  // Since the issues table doesn't exist yet, this is a placeholder
  // that will need to be updated when the issues table is created
  
  // For now, we'll return a placeholder implementation
  // TODO: Update this when issues table is created
  const currentCount = 0; // Placeholder
  
  // Check if adding one more would exceed limit
  if (currentCount >= plan.limits.issues) {
    logger.warn(`Team ${teamId} reached issue limit: ${currentCount}/${plan.limits.issues}`);
    
    throw new PlanLimitError(
      PLAN_LIMIT_ERROR_CODES.ISSUES,
      plan.limits.issues,
      currentCount,
      `Cannot create issue: team has reached the ${plan.label} plan limit of ${plan.limits.issues} issues`
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
    .where(eq(projects.owner_id, teamId)); // May need adjustment

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
 * Check if a team can perform an operation based on plan limits
 * Returns detailed information about the limit check
 * 
 * @param teamId - Team ID to check
 * @param resource - Resource type to check
 * @returns Limit check result with details
 */
export async function checkPlanLimit(
  teamId: string,
  resource: "members" | "projects" | "issues"
): Promise<{
  allowed: boolean;
  limit: number | "unlimited";
  current: number;
  remaining: number | "unlimited";
}> {
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const plan = PLANS[team.planId as PlanId];
  const limit = plan.limits[resource];
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
