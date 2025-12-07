import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import TeamSettingsGeneral from "@/features/team-settings/components/team-settings-general";
import { getSession } from "@/server/auth/session";
import { getTeam } from "@/server/teams/team-service";
import type { UserRole } from "@/features/team-settings/types";

const TEAM_SETTINGS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "General" },
];

export default async function TeamSettingsPage() {
  const session = await getSession();
  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value;

  if (!session) {
    redirect("/sign-in");
  }

  if (!teamId) {
    redirect("/onboarding");
  }

  // Fetch team data and member info (Requirement 8.4)
  const team = await getTeam(teamId, session.id);

  if (!team) {
    // Team not found or user is not a member
    redirect("/team");
  }

  // Check if user has permission to access settings (TEAM_OWNER or TEAM_ADMIN)
  const hasSettingsAccess = 
    team.myManagementRole === "TEAM_OWNER" || 
    team.myManagementRole === "TEAM_ADMIN";

  if (!hasSettingsAccess) {
    // Requirement 8.4: Redirect users without proper permissions
    redirect("/team");
  }

  // Map management role to UserRole type
  const userRole: UserRole = 
    team.myManagementRole === "TEAM_OWNER" ? "owner" : "admin";

  // Serialize team data for client component (convert Dates to strings)
  const serializedTeam = {
    ...team,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    deletedAt: team.deletedAt?.toISOString() ?? null,
  };

  return (
    <>
      <AppHeaderConfigurator
        pageName="General Settings"
        breadcrumbs={TEAM_SETTINGS_BREADCRUMBS}
      />
      <TeamSettingsGeneral 
        teamId={teamId}
        userRole={userRole}
        initialData={{ team: serializedTeam }}
      />
    </>
  );
}
