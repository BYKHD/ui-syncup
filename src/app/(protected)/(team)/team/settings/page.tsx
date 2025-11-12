import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import TeamSettingsGeneral from "@/features/team-settings/components/team-settings-genaral";
import { MOCK_DEFAULT_TEAM, MOCK_DEFAULT_USER_ROLE } from "@/mocks";

const TEAM_SETTINGS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "General" },
];

export default function TeamSettingsPage() {
  // Server component - thin page that delegates to feature component
  // In a real implementation, props would come from layout via server-side fetch
  // Layout handles auth/tenant gating and passes team/userRole down

  return (
    <>
      <AppHeaderConfigurator
        pageName="General"
        breadcrumbs={TEAM_SETTINGS_BREADCRUMBS}
      />
      <TeamSettingsGeneral
        initialTeam={MOCK_DEFAULT_TEAM}
        userRole={MOCK_DEFAULT_USER_ROLE}
      />
    </>
  );
}
