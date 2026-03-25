import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { eq, and, isNull } from "drizzle-orm";
import { TeamSettingsScreen } from "@/features/team-settings/screens";
import type { Team, UserRole } from "@/features/team-settings/types";

interface TeamSettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TeamSettingsLayout({
  children,
  params,
}: TeamSettingsLayoutProps) {
  const session = await getSession();
  const { slug } = await params;

  if (!session) {
    redirect("/sign-in");
  }

  // Resolve team by slug — no cookie needed
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.slug, slug), isNull(teams.deletedAt)),
  });

  if (!team) {
    redirect("/onboarding");
  }

  // Validate membership
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, session.id)
    ),
  });

  if (!member) {
    redirect("/team");
  }

  const userRole: UserRole =
    member.managementRole === "WORKSPACE_OWNER" ? "owner" :
    member.managementRole === "WORKSPACE_ADMIN" ? "admin" : "member";

  const initialTeam: Team = {
    id: team.id,
    name: team.name,
    image: team.image,
  };

  return (
    <TeamSettingsScreen initialTeam={initialTeam} userRole={userRole}>
      {children}
    </TeamSettingsScreen>
  );
}
