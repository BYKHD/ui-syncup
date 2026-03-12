import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import { InstanceSettingsScreen } from "@/features/instance-settings";
import { getSession } from "@/server/auth/session";
import { getInstanceStatus } from "@/server/setup";

const INSTANCE_SETTINGS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/team/settings" },
  { label: "Instance" },
];

/**
 * Instance Settings Page
 * 
 * Admin-only page for managing instance configuration post-setup.
 * Accessible to the instance admin (first user created during setup).
 * 
 * @requirements 10.1, 10.2, 10.3, 10.4, 10.5, 12.8
 */
export default async function InstanceSettingsPage() {
  const session = await getSession();
  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value;

  if (!session) {
    redirect("/sign-in");
  }

  if (!teamId) {
    redirect("/onboarding");
  }

  // Check if user is the instance admin
  const instanceStatus = await getInstanceStatus();
  
  // Only the instance admin (first user) can access this page
  if (instanceStatus.adminEmail && instanceStatus.adminEmail !== session.email) {
    redirect("/team/settings");
  }

  return (
    <>
      <AppHeaderConfigurator
        pageName="Instance Settings"
        breadcrumbs={INSTANCE_SETTINGS_BREADCRUMBS}
      />
      <InstanceSettingsScreen />
    </>
  );
}
