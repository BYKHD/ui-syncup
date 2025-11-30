/**
 * Team Context Utilities
 * 
 * This module provides utilities for managing the active team context,
 * including getting, setting, and validating team access.
 * 
 * Key features:
 * - Database-first approach with cookie fallback
 * - Automatic cookie synchronization when database and cookie disagree
 * - Team access validation
 * 
 * @module server/teams/team-context
 */

import { db } from "@/lib/db";
import { users } from "@/server/db/schema/users";
import { teamMembers } from "@/server/db/schema/team-members";
import { teams } from "@/server/db/schema/teams";
import { eq, and, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { logTeamEvent } from "./team-service";
import type { TeamWithMemberInfo } from "./types";

/**
 * Cookie configuration for team context
 */
const TEAM_COOKIE_NAME = "team_id";
const TEAM_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Result of getActiveTeam operation
 */
export interface ActiveTeamResult {
  team: TeamWithMemberInfo | null;
  source: "database" | "cookie" | "none";
  cookieSynced: boolean;
}

/**
 * Gets the active team for a user
 * 
 * Implements Requirements 9.3, 9.4, 9A.3:
 * - Loads last active team from database first
 * - Falls back to cookie if database value is unavailable
 * - Prioritizes database value when cookie and database disagree
 * - Updates cookie to match database when they differ
 * 
 * @param userId - The user ID to get active team for
 * @returns Promise resolving to ActiveTeamResult with team info and source
 * 
 * @example
 * ```typescript
 * const { team, source, cookieSynced } = await getActiveTeam(userId);
 * if (!team) {
 *   redirect('/onboarding');
 * }
 * ```
 */
export async function getActiveTeam(userId: string): Promise<ActiveTeamResult> {
  if (!userId || userId.length === 0) {
    return { team: null, source: "none", cookieSynced: false };
  }

  // Get user's lastActiveTeamId from database
  const [user] = await db
    .select({ lastActiveTeamId: users.lastActiveTeamId })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { team: null, source: "none", cookieSynced: false };
  }

  const dbTeamId = user.lastActiveTeamId;
  
  // Get cookie value
  const cookieStore = await cookies();
  const cookieTeamId = cookieStore.get(TEAM_COOKIE_NAME)?.value ?? null;

  let teamId: string | null = null;
  let source: "database" | "cookie" | "none" = "none";
  let cookieSynced = false;

  // Requirement 9.4: Load from database first, fallback to cookie
  // Requirement 9A.3: Database wins when cookie and database disagree
  if (dbTeamId) {
    teamId = dbTeamId;
    source = "database";
    
    // Sync cookie if it differs from database
    if (cookieTeamId !== dbTeamId) {
      await syncTeamCookie(dbTeamId);
      cookieSynced = true;
    }
  } else if (cookieTeamId) {
    // Fallback to cookie if database has no value
    teamId = cookieTeamId;
    source = "cookie";
  }

  if (!teamId) {
    return { team: null, source: "none", cookieSynced };
  }

  // Validate user has access to this team and get team info
  const team = await getTeamWithMemberInfo(teamId, userId);

  if (!team) {
    // Team doesn't exist or user lost access
    // Log invalid context event
    logTeamEvent("team.context.invalid", {
      outcome: "failure",
      userId,
      teamId,
      errorCode: "TEAM_ACCESS_LOST",
      errorMessage: "User no longer has access to their active team",
    });
    
    return { team: null, source: "none", cookieSynced };
  }

  return { team, source, cookieSynced };
}

/**
 * Sets the active team for a user
 * 
 * Implements Requirements 9.2, 9.3:
 * - Updates user.lastActiveTeamId in database
 * - Sets team_id cookie for redundancy
 * 
 * @param userId - The user ID to set active team for
 * @param teamId - The team ID to set as active
 * @returns Promise resolving when both database and cookie are updated
 * @throws {Error} If user doesn't have access to the team
 * 
 * @example
 * ```typescript
 * await setActiveTeam(userId, teamId);
 * // Both database and cookie are now updated
 * ```
 */
export async function setActiveTeam(
  userId: string,
  teamId: string
): Promise<void> {
  if (!userId || userId.length === 0) {
    throw new Error("User ID is required");
  }

  if (!teamId || teamId.length === 0) {
    throw new Error("Team ID is required");
  }

  // Validate user has access to the team
  const hasAccess = await validateTeamAccess(userId, teamId);
  
  if (!hasAccess) {
    throw new Error("User does not have access to this team");
  }

  // Update database
  await db
    .update(users)
    .set({ lastActiveTeamId: teamId })
    .where(eq(users.id, userId));

  // Update cookie
  await syncTeamCookie(teamId);
}

/**
 * Validates that a user has access to a team
 * 
 * Checks that:
 * - The team exists and is not soft-deleted
 * - The user is a member of the team
 * 
 * @param userId - The user ID to check access for
 * @param teamId - The team ID to check access to
 * @returns Promise resolving to true if user has access, false otherwise
 * 
 * @example
 * ```typescript
 * const hasAccess = await validateTeamAccess(userId, teamId);
 * if (!hasAccess) {
 *   return NextResponse.json({ error: 'No access' }, { status: 403 });
 * }
 * ```
 */
export async function validateTeamAccess(
  userId: string,
  teamId: string
): Promise<boolean> {
  if (!userId || !teamId) {
    return false;
  }

  // Check if team exists and is not soft-deleted
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    return false;
  }

  // Check if user is a member of the team
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ),
  });

  return !!membership;
}

/**
 * Gets team with member info for a specific user
 * 
 * Internal helper that fetches team data along with the user's roles.
 * Returns null if team doesn't exist, is deleted, or user is not a member.
 * 
 * @param teamId - The team ID to fetch
 * @param userId - The user ID to get role info for
 * @returns Promise resolving to TeamWithMemberInfo or null
 */
async function getTeamWithMemberInfo(
  teamId: string,
  userId: string
): Promise<TeamWithMemberInfo | null> {
  // Get team (exclude soft-deleted)
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    return null;
  }

  // Get user's membership
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ),
  });

  if (!membership) {
    return null;
  }

  // Get member count
  const memberCountResult = await db
    .select({ count: db.$count(teamMembers, eq(teamMembers.teamId, teamId)) })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId))
    .limit(1);

  const memberCount = memberCountResult[0]?.count ?? 0;

  return {
    ...team,
    memberCount,
    myManagementRole: membership.managementRole,
    myOperationalRole: membership.operationalRole,
  };
}

/**
 * Syncs the team cookie with the given team ID
 * 
 * Internal helper that sets the team_id cookie.
 * 
 * @param teamId - The team ID to set in the cookie
 */
async function syncTeamCookie(teamId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TEAM_COOKIE_NAME, teamId, {
    httpOnly: false, // Allow client-side access for team context
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TEAM_COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Clears the team context for a user
 * 
 * Removes the team_id cookie and optionally clears the database value.
 * Used when a user loses access to all teams or during cleanup.
 * 
 * @param userId - The user ID to clear context for (optional, for database cleanup)
 * 
 * @example
 * ```typescript
 * // Clear cookie only
 * await clearTeamContext();
 * 
 * // Clear both cookie and database
 * await clearTeamContext(userId);
 * ```
 */
export async function clearTeamContext(userId?: string): Promise<void> {
  // Clear cookie
  const cookieStore = await cookies();
  cookieStore.set(TEAM_COOKIE_NAME, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  // Clear database if userId provided
  if (userId) {
    await db
      .update(users)
      .set({ lastActiveTeamId: null })
      .where(eq(users.id, userId));
  }
}

/**
 * Gets the team cookie name
 * Useful for testing and debugging
 * 
 * @returns The name of the team cookie
 */
export function getTeamCookieName(): string {
  return TEAM_COOKIE_NAME;
}

/**
 * Gets the first available team for a user
 * 
 * Used as a fallback when the user's active team is no longer valid.
 * Returns the most recently joined team.
 * 
 * @param userId - The user ID to get first team for
 * @returns Promise resolving to TeamWithMemberInfo or null if user has no teams
 * 
 * @example
 * ```typescript
 * const { team } = await getActiveTeam(userId);
 * if (!team) {
 *   const fallbackTeam = await getFirstAvailableTeam(userId);
 *   if (fallbackTeam) {
 *     await setActiveTeam(userId, fallbackTeam.id);
 *   } else {
 *     redirect('/onboarding');
 *   }
 * }
 * ```
 */
export async function getFirstAvailableTeam(
  userId: string
): Promise<TeamWithMemberInfo | null> {
  if (!userId || userId.length === 0) {
    return null;
  }

  // Get user's first team membership (most recent join)
  const membership = await db
    .select({
      teamId: teamMembers.teamId,
      managementRole: teamMembers.managementRole,
      operationalRole: teamMembers.operationalRole,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, userId),
        isNull(teams.deletedAt)
      )
    )
    .orderBy(teamMembers.joinedAt)
    .limit(1);

  if (membership.length === 0) {
    return null;
  }

  const { teamId, managementRole, operationalRole } = membership[0];

  // Get full team info
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    return null;
  }

  // Get member count
  const memberCountResult = await db
    .select({ count: db.$count(teamMembers, eq(teamMembers.teamId, teamId)) })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId))
    .limit(1);

  const memberCount = memberCountResult[0]?.count ?? 0;

  return {
    ...team,
    memberCount,
    myManagementRole: managementRole,
    myOperationalRole: operationalRole,
  };
}

/**
 * Result of handling team context edge cases
 */
export interface HandleEdgeCaseResult {
  success: boolean;
  action: "switched" | "cleared" | "none";
  newTeam: TeamWithMemberInfo | null;
  reason?: string;
}

/**
 * Handles team context edge cases
 * 
 * Implements Requirements 9A.1, 9A.2, 9A.3, 9A.4:
 * - Auto-switches to first available team when active team is deleted
 * - Auto-switches when user loses access to active team
 * - Resolves database-cookie conflicts (database wins)
 * - Clears context when no teams are available
 * 
 * This function should be called when:
 * - getActiveTeam returns null but user has other teams
 * - User attempts to access a team they don't have access to
 * - System detects invalid team context
 * 
 * @param userId - The user ID to handle edge cases for
 * @returns Promise resolving to HandleEdgeCaseResult with action taken
 * 
 * @example
 * ```typescript
 * const { team } = await getActiveTeam(userId);
 * if (!team) {
 *   const result = await handleTeamContextEdgeCases(userId);
 *   if (result.action === 'switched' && result.newTeam) {
 *     // Redirect to new team context
 *     redirect(`/team/${result.newTeam.slug}`);
 *   } else if (result.action === 'cleared') {
 *     // No teams available, redirect to onboarding
 *     redirect('/onboarding');
 *   }
 * }
 * ```
 */
export async function handleTeamContextEdgeCases(
  userId: string
): Promise<HandleEdgeCaseResult> {
  if (!userId || userId.length === 0) {
    return {
      success: false,
      action: "none",
      newTeam: null,
      reason: "Invalid user ID",
    };
  }

  // Get user's current lastActiveTeamId from database
  const [user] = await db
    .select({ lastActiveTeamId: users.lastActiveTeamId })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return {
      success: false,
      action: "none",
      newTeam: null,
      reason: "User not found",
    };
  }

  const currentTeamId = user.lastActiveTeamId;

  // Check if user has any available teams
  const firstAvailableTeam = await getFirstAvailableTeam(userId);

  if (!firstAvailableTeam) {
    // Requirement 9A.1: No teams available, clear context
    await clearTeamContext(userId);
    
    logTeamEvent("team.context.cleared", {
      outcome: "success",
      userId,
      teamId: currentTeamId ?? "none",
      metadata: {
        reason: "no_teams_available",
      },
    });

    return {
      success: true,
      action: "cleared",
      newTeam: null,
      reason: "No teams available",
    };
  }

  // If current team is valid and user has access, no action needed
  if (currentTeamId) {
    const hasAccess = await validateTeamAccess(userId, currentTeamId);
    if (hasAccess) {
      // Check if team is soft-deleted
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, currentTeamId),
      });

      if (team && !team.deletedAt) {
        // Current team is valid, no edge case to handle
        return {
          success: true,
          action: "none",
          newTeam: null,
          reason: "Current team is valid",
        };
      }
    }
  }

  // Requirement 9A.1, 9A.2: Auto-switch to first available team
  // This handles both deleted teams and lost access
  await setActiveTeam(userId, firstAvailableTeam.id);

  const reason = currentTeamId
    ? "Active team deleted or access lost"
    : "No active team set";

  logTeamEvent("team.context.auto_switch", {
    outcome: "success",
    userId,
    teamId: firstAvailableTeam.id,
    metadata: {
      previousTeamId: currentTeamId,
      reason,
    },
  });

  return {
    success: true,
    action: "switched",
    newTeam: firstAvailableTeam,
    reason,
  };
}

/**
 * Validates team access and handles edge cases
 * 
 * This is a higher-level function that combines validation with edge case handling.
 * Use this in API routes and middleware to ensure valid team context.
 * 
 * Implements Requirements 9A.1, 9A.2, 9A.4:
 * - Validates user has access to the requested team
 * - Auto-switches if access is lost
 * - Returns clear error information for invalid access
 * 
 * @param userId - The user ID to validate access for
 * @param teamId - The team ID to validate access to
 * @returns Promise resolving to validation result with team info or error
 * 
 * @example
 * ```typescript
 * const result = await validateTeamAccessWithEdgeCases(userId, teamId);
 * if (!result.valid) {
 *   if (result.autoSwitched && result.newTeam) {
 *     // User was auto-switched to another team
 *     return NextResponse.json({ 
 *       error: 'Team access lost, switched to another team',
 *       newTeamId: result.newTeam.id 
 *     }, { status: 403 });
 *   } else {
 *     // No teams available
 *     return NextResponse.json({ 
 *       error: 'No team access',
 *       redirectTo: '/onboarding'
 *     }, { status: 403 });
 *   }
 * }
 * ```
 */
export async function validateTeamAccessWithEdgeCases(
  userId: string,
  teamId: string
): Promise<{
  valid: boolean;
  team: TeamWithMemberInfo | null;
  autoSwitched: boolean;
  newTeam: TeamWithMemberInfo | null;
  error?: string;
}> {
  if (!userId || !teamId) {
    return {
      valid: false,
      team: null,
      autoSwitched: false,
      newTeam: null,
      error: "Invalid user ID or team ID",
    };
  }

  // Check if user has access to the requested team
  const hasAccess = await validateTeamAccess(userId, teamId);

  if (hasAccess) {
    // Get team info
    const team = await getTeamWithMemberInfo(teamId, userId);
    
    if (team) {
      return {
        valid: true,
        team,
        autoSwitched: false,
        newTeam: null,
      };
    }
  }

  // Requirement 9A.4: User doesn't have access, log the attempt
  logTeamEvent("team.access.denied", {
    outcome: "failure",
    userId,
    teamId,
    errorCode: "TEAM_ACCESS_DENIED",
    errorMessage: "User attempted to access team without permission",
  });

  // Requirement 9A.2: Handle edge case - try to auto-switch
  const edgeCaseResult = await handleTeamContextEdgeCases(userId);

  return {
    valid: false,
    team: null,
    autoSwitched: edgeCaseResult.action === "switched",
    newTeam: edgeCaseResult.newTeam,
    error: edgeCaseResult.reason ?? "Access denied",
  };
}
