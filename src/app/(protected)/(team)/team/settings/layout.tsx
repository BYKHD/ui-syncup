import { TeamSettingsScreen } from "@/features/team-settings/screens";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { eq, and } from "drizzle-orm";
import type { Team, UserRole } from "@/features/team-settings/types";

interface TeamSettingsLayoutProps {
  children: React.ReactNode;
}

export default async function TeamSettingsLayout({
  children,
}: TeamSettingsLayoutProps) {
  // Server-side auth & tenant gating
  const session = await getSession();
  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value;

  if (!session) {
    redirect("/sign-in");
  }

  if (!teamId) {
    redirect("/onboarding");
  }

  // Fetch team data
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    redirect("/onboarding");
  }

  // Fetch user's role in this team
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, session.id)
    ),
  });

  if (!member) {
    redirect("/team");
  }

  // Map to UserRole type
  const userRole: UserRole = 
    member.managementRole === "TEAM_OWNER" ? "owner" : 
    member.managementRole === "TEAM_ADMIN" ? "admin" : "member";

  // Map team to expected type (simplified for settings screen)
  const initialTeam: Team = {
    id: team.id,
    name: team.name,
    image: team.image,
  };

  return (
    <TeamSettingsScreen
      initialTeam={initialTeam}
      userRole={userRole}
    >
      {children}
    </TeamSettingsScreen>
  );
}
