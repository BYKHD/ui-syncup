import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import BillingSettingsScreen from "@/features/team-settings/components/team-setting-billing";

const TEAM_SETTINGS_BILLING_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "Billing" },
];

export default function BillingSettingsPage() {
  // Server component - thin page that renders feature component
  // Layout provides TeamSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Billing"
        breadcrumbs={TEAM_SETTINGS_BILLING_BREADCRUMBS}
      />
      <BillingSettingsScreen />
    </>
  );
}
