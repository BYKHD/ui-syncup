import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import IntegrationsSettingsScreen from "@/features/team-settings/components/team-setting-integrations";

const TEAM_SETTINGS_INTEGRATIONS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "Integrations" },
];

export default function IntegrationsSettingsPage() {
  // Server component - thin page that renders feature component
  // Layout provides TeamSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Integrations"
        breadcrumbs={TEAM_SETTINGS_INTEGRATIONS_BREADCRUMBS}
      />
      <IntegrationsSettingsScreen />
    </>
  );
}
