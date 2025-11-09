import TeamSettingsGeneral from "@features/team-settings/components/team-settings-genaral";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@/mocks";

export default function TeamSettingsPage() {
  // Server component - thin page that delegates to feature component
  // In a real implementation, props would come from layout via server-side fetch
  // Layout handles auth/tenant gating and passes team/userRole down

  return (
    <TeamSettingsGeneral
      initialTeam={MOCK_DEFAULT_TEAM}
      userRole={MOCK_DEFAULT_USER_ROLE}
    />
  );
}
