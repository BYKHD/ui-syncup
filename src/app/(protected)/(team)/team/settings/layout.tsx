import { TeamSettingsScreen } from "@features/team-settings/screens";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@/mocks";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface TeamSettingsLayoutProps {
  children: React.ReactNode;
}

export default async function TeamSettingsLayout({
  children,
}: TeamSettingsLayoutProps) {
  // Server-side auth & tenant gating
  // In a real implementation, fetch team and user role from server
  // const teamId = cookies().get("team_id")?.value;
  // if (!teamId) redirect("/select-team");
  // const team = await getTeam(teamId);
  // const userRole = await getUserRole(teamId);

  return (
    <TeamSettingsScreen
      initialTeam={MOCK_DEFAULT_TEAM}
      userRole={MOCK_DEFAULT_USER_ROLE}
    >
      {children}
    </TeamSettingsScreen>
  );
}
