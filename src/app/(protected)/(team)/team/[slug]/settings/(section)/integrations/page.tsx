import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import IntegrationsSettingsScreen from "@/features/team-settings/components/team-setting-integrations";

export default async function IntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Team", href: "/team" },
    { label: "Settings", href: `/team/${slug}/settings` },
    { label: "Integrations" },
  ];

  return (
    <>
      <AppHeaderConfigurator pageName="Integrations" breadcrumbs={breadcrumbs} />
      <IntegrationsSettingsScreen />
    </>
  );
}
