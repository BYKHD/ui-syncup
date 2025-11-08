import { TeamSettingsScreen } from "@/features/team-settings/screens";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@/features/team-settings";

export default function TeamSettingsPage() {
  // In a real implementation, fetch team and user role from server
  // const teamId = cookies().get("team_id")?.value;
  // const team = await getTeam(teamId);
  // const userRole = await getUserRole(teamId);

  return (
    <TeamSettingsScreen
      initialTeam={MOCK_DEFAULT_TEAM}
      userRole={MOCK_DEFAULT_USER_ROLE}
    />
  );
}
