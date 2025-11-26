import { db } from "@/lib/db";
import { teamMembers } from "@/server/db/schema/team-members";
import { teams } from "@/server/db/schema/teams";
import { eq, and, sql } from "drizzle-orm";

/**
 * Calculates billable seats for a team
 * Billable seats = count of unique users with TEAM_EDITOR operational role
 */
export async function calculateBillableSeats(teamId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(distinct ${teamMembers.userId})` })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.operationalRole, "TEAM_EDITOR")
      )
    );

  // Parse the count as it may be returned as a string from the database
  const count = result[0]?.count ?? 0;
  return typeof count === "string" ? parseInt(count, 10) : count;
}

/**
 * Updates the billable seats count for a team
 * Should be called after any role changes
 */
export async function updateBillableSeats(teamId: string): Promise<number> {
  const count = await calculateBillableSeats(teamId);

  await db
    .update(teams)
    .set({ billableSeats: count })
    .where(eq(teams.id, teamId));

  return count;
}
