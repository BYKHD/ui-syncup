/**
 * Team Data Export Service
 * 
 * Provides data export functionality for teams with:
 * - Complete JSON export of all team data
 * - Rate limiting (1 export per team per day)
 * - Async job processing with email notification
 * 
 * Implements Requirements 5A.1, 5A.2, 5A.3, 5A.5
 * 
 * @module server/teams/export-service
 */

import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { teamInvitations } from "@/server/db/schema/team-invitations";
import { projects } from "@/server/db/schema/projects";
import { users } from "@/server/db/schema/users";
import { eq, and, isNull, gte } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { enqueueEmail } from "@/server/email";
import { logTeamEvent } from "./team-service";

/**
 * Rate limit for data exports: 1 per team per day
 */
const EXPORT_RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * In-memory tracking of recent exports for rate limiting
 * In production, this should be stored in Redis or the database
 */
const recentExports = new Map<string, number>();

/**
 * Complete team data export structure
 */
export interface TeamExportData {
  team: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;

    createdAt: string;
    updatedAt: string;
  };
  members: Array<{
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string;
    managementRole: string | null;
    operationalRole: string;
    joinedAt: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    managementRole: string | null;
    operationalRole: string;
    invitedBy: string;
    invitedByName: string | null;
    expiresAt: string;
    status: "pending" | "used" | "cancelled" | "expired";
    createdAt: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    ownerName: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  exportMetadata: {
    exportedAt: string;
    exportedBy: string;
    version: string;
  };
}

/**
 * Check if team has exceeded export rate limit
 * Implements Requirement 5A.5
 */
function checkExportRateLimit(teamId: string): boolean {
  const lastExport = recentExports.get(teamId);
  if (!lastExport) {
    return true; // No recent export
  }

  const timeSinceLastExport = Date.now() - lastExport;
  return timeSinceLastExport >= EXPORT_RATE_LIMIT_MS;
}

/**
 * Record export timestamp for rate limiting
 */
function recordExport(teamId: string): void {
  recentExports.set(teamId, Date.now());
}

/**
 * Export complete team data as JSON
 * Implements Requirements 5A.1, 5A.2, 5A.3
 * 
 * @param teamId - Team ID to export
 * @param userId - User requesting the export (must be team owner)
 * @returns Promise<TeamExportData> - Complete team data
 */
export async function exportTeamData(
  teamId: string,
  userId: string
): Promise<TeamExportData> {
  try {
    // Check rate limit (Requirement 5A.5)
    if (!checkExportRateLimit(teamId)) {
      logTeamEvent("team.export.failure", {
        outcome: "failure",
        userId,
        teamId,
        errorCode: "RATE_LIMIT_EXPORTS",
        errorMessage: "Export rate limit exceeded (1 per day)",
      });
      throw new Error("Export rate limit exceeded. Please try again in 24 hours.");
    }

    // 1. Get team data
    const [team] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
      .limit(1);

    if (!team) {
      logTeamEvent("team.export.failure", {
        outcome: "failure",
        userId,
        teamId,
        errorCode: "TEAM_NOT_FOUND",
        errorMessage: "Team not found",
      });
      throw new Error("Team not found");
    }

    // 2. Get team members with user info
    const membersData = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        userName: users.name,
        userEmail: users.email,
        managementRole: teamMembers.managementRole,
        operationalRole: teamMembers.operationalRole,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    // 3. Get pending invitations with inviter info
    const invitationsData = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        managementRole: teamInvitations.managementRole,
        operationalRole: teamInvitations.operationalRole,
        invitedBy: teamInvitations.invitedBy,
        invitedByName: users.name,
        expiresAt: teamInvitations.expiresAt,
        usedAt: teamInvitations.usedAt,
        cancelledAt: teamInvitations.cancelledAt,
        createdAt: teamInvitations.createdAt,
      })
      .from(teamInvitations)
      .innerJoin(users, eq(teamInvitations.invitedBy, users.id))
      .where(eq(teamInvitations.teamId, teamId));

    // 4. Get projects with owner info
    // Note: In the current schema, projects don't have a teamId field
    // This is a simplified version - in production, you'd need to join through project members
    const projectsData = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        // ownerId: projects.ownerId, // Owner concept might be different now, removing for now or need to join project_members
        // ownerName: users.name,
        isActive: eq(projects.status, 'active'),
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      // .innerJoin(users, eq(projects.ownerId, users.id)) // Removing owner join as ownerId doesn't exist on projects
      .where(eq(projects.teamId, teamId));

    // 5. Build export data structure (Requirement 5A.2)
    const exportData: TeamExportData = {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        image: team.image,

        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      },
      members: membersData.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
        managementRole: m.managementRole,
        operationalRole: m.operationalRole,
        joinedAt: m.joinedAt.toISOString(),
      })),
      invitations: invitationsData.map((inv) => {
        let status: "pending" | "used" | "cancelled" | "expired" = "pending";
        if (inv.usedAt) status = "used";
        else if (inv.cancelledAt) status = "cancelled";
        else if (inv.expiresAt < new Date()) status = "expired";

        return {
          id: inv.id,
          email: inv.email,
          managementRole: inv.managementRole,
          operationalRole: inv.operationalRole,
          invitedBy: inv.invitedBy,
          invitedByName: inv.invitedByName,
          expiresAt: inv.expiresAt.toISOString(),
          status,
          createdAt: inv.createdAt.toISOString(),
        };
      }),
      projects: projectsData.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        ownerId: "", // Placeholder or remove from interface
        ownerName: null, // Placeholder
        isActive: Boolean(p.isActive),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        version: "1.0",
      },
    };

    // Record export for rate limiting
    recordExport(teamId);

    // Log export request (Requirement 14.1)
    logTeamEvent("team.export.requested", {
      outcome: "success",
      userId,
      teamId,
      teamName: team.name,
      metadata: {
        memberCount: exportData.members.length,
        projectCount: exportData.projects.length,
        invitationCount: exportData.invitations.length,
      },
    });

    return exportData;
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("not found") && !error.message.includes("rate limit")) {
      logTeamEvent("team.export.failure", {
        outcome: "error",
        userId,
        teamId,
        errorCode: "EXPORT_ERROR",
        errorMessage: error.message,
      });
    }
    throw error;
  }
}

/**
 * Queue team data export job and send email with download link
 * Implements Requirements 5A.1, 5A.3
 * 
 * This is a simplified version that generates the export immediately.
 * In production, this would queue a background job and send an email
 * with a download link when the export is complete.
 * 
 * @param teamId - Team ID to export
 * @param userId - User requesting the export
 * @returns Promise<string> - Job ID for tracking
 */
export async function queueTeamExport(
  teamId: string,
  userId: string
): Promise<string> {
  try {
    // Generate export data
    const exportData = await exportTeamData(teamId, userId);

    // In production, this would:
    // 1. Store the export data in object storage (S3/R2)
    // 2. Generate a signed download URL
    // 3. Send email with download link
    
    // For now, we'll simulate this by sending an email with the export data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate a mock job ID
    const jobId = `export_${teamId}_${Date.now()}`;

    // Send email with export data (Requirement 5A.3)
    // In production, this would include a download link instead of inline data
    await enqueueEmail({
      userId,
      type: "security_alert", // Using security_alert as a placeholder
      to: user.email,
      template: {
        type: "security_alert",
        data: {
          name: user.name ?? "User",
          alertType: "team_data_export",
          timestamp: new Date().toISOString(),
          customMessage: `Your team data export for "${exportData.team.name}" is ready. Export includes ${exportData.members.length} members, ${exportData.projects.length} projects, and ${exportData.invitations.length} invitations.`,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/team/${exportData.team.slug}/settings`,
        },
      },
    });

    // Log completion
    logTeamEvent("team.export.completed", {
      outcome: "success",
      userId,
      teamId,
      teamName: exportData.team.name,
      metadata: {
        jobId,
        memberCount: exportData.members.length,
        projectCount: exportData.projects.length,
        invitationCount: exportData.invitations.length,
      },
    });

    logger.info("team.export.queued", {
      jobId,
      teamId,
      userId,
    });

    return jobId;
  } catch (error) {
    logTeamEvent("team.export.failure", {
      outcome: "error",
      userId,
      teamId,
      errorCode: "EXPORT_QUEUE_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Clear export rate limit for a team (for testing purposes)
 */
export function clearExportRateLimit(teamId: string): void {
  recentExports.delete(teamId);
}
