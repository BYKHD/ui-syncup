import { TeamSettingsScreen } from "@features/team-settings/screens";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@features/team-settings";
import TeamMembersPage from "@features/team-settings/components/team-setting-member";

export default function MembersSettingsPage() {
  return (
    <TeamSettingsScreen
      initialTeam={MOCK_DEFAULT_TEAM}
      userRole={MOCK_DEFAULT_USER_ROLE}
    >
      <TeamMembersPage />
    </TeamSettingsScreen>
  );
}
