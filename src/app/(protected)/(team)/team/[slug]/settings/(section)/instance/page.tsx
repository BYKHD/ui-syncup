import { redirect } from "next/navigation";
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import { InstanceSettingsScreen } from "@/features/instance-settings";
import { getSession } from "@/server/auth/session";
import { getInstanceStatus } from "@/server/setup";

export default async function InstanceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  const { slug } = await params;

  if (!session) redirect("/sign-in");

  // Only the instance admin can access this page
  const instanceStatus = await getInstanceStatus();
  if (instanceStatus.adminEmail && instanceStatus.adminEmail !== session.email) {
    redirect(`/team/${slug}/settings`);
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Team", href: "/team" },
    { label: "Settings", href: `/team/${slug}/settings` },
    { label: "Instance" },
  ];

  return (
    <>
      <AppHeaderConfigurator pageName="Instance Settings" breadcrumbs={breadcrumbs} />
      <InstanceSettingsScreen />
    </>
  );
}
