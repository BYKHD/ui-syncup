import { TeamSettingsScreen } from "@features/team-settings/screens";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@features/team-settings";
import BillingSettingsScreen from "@features/team-settings/components/team-setting-billing";

export default function BillingSettingsPage() {
  return (
    <TeamSettingsScreen
      initialTeam={MOCK_DEFAULT_TEAM}
      userRole={MOCK_DEFAULT_USER_ROLE}
    >
      <BillingSettingsScreen />
    </TeamSettingsScreen>
  );
}
