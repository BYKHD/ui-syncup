import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import TeamMembersPage from "@/features/team-settings/components/team-setting-member";

const TEAM_SETTINGS_MEMBERS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "Members" },
];

export default function MembersSettingsPage() {
  // Server component - thin page that renders feature component
  // Layout provides TeamSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Members"
        breadcrumbs={TEAM_SETTINGS_MEMBERS_BREADCRUMBS}
      />
      <TeamMembersPage />
    </>
  );
}
