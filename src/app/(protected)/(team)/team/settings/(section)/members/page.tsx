import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import TeamMembersPage from "@/features/team-settings/components/team-setting-member";
import { getSession } from "@/server/auth/session";

const TEAM_SETTINGS_MEMBERS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "Members" },
];

export default async function MembersSettingsPage() {
  const session = await getSession();
  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value;

  if (!session) {
    redirect("/sign-in");
  }

  if (!teamId) {
    redirect("/onboarding"); // Or some other appropriate redirect if no team selected
  }

  return (
    <>
      <AppHeaderConfigurator
        pageName="Members"
        breadcrumbs={TEAM_SETTINGS_MEMBERS_BREADCRUMBS}
      />
      <TeamMembersPage teamId={teamId} currentUserId={session.id} />
    </>
  );
}
