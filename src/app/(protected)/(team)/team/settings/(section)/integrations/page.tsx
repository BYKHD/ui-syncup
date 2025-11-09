import { TeamSettingsScreen } from "@features/team-settings/screens";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@features/team-settings";
import IntegrationsSettingsScreen from "@features/team-settings/components/team-setting-integrations";

export default function IntegrationsSettingsPage() {
  return (
    <TeamSettingsScreen
      initialTeam={MOCK_DEFAULT_TEAM}
      userRole={MOCK_DEFAULT_USER_ROLE}
    >
      <IntegrationsSettingsScreen />
    </TeamSettingsScreen>
  );
}
