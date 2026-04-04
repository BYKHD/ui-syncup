import { redirect } from "next/navigation";
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import TeamSettingsGeneral from "@/features/team-settings/components/team-settings-general";
import { getSession } from "@/server/auth/session";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { getTeam } from "@/server/teams/team-service";
import { eq, and, isNull } from "drizzle-orm";
import type { UserRole } from "@/features/team-settings/types";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  const { slug } = await params;

  if (!session) redirect("/sign-in");

  // Resolve team by slug to get its id
  const teamRow = await db.query.teams.findFirst({
    where: and(eq(teams.slug, slug), isNull(teams.deletedAt)),
    columns: { id: true },
  });

  if (!teamRow) redirect("/onboarding");

  // Fetch full team with member info (required by TeamSettingsGeneral)
  const team = await getTeam(teamRow.id, session.id);

  if (!team) redirect("/team");

  const hasSettingsAccess =
    team.myManagementRole === "TEAM_OWNER" ||
    team.myManagementRole === "TEAM_ADMIN";

  if (!hasSettingsAccess) redirect("/team");

  const userRole: UserRole =
    team.myManagementRole === "TEAM_OWNER" ? "owner" : "admin";

  const serializedTeam = {
    ...team,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    deletedAt: team.deletedAt?.toISOString() ?? null,
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Team", href: "/team" },
    { label: "Settings", href: `/team/${slug}/settings` },
    { label: "General" },
  ];

  return (
    <>
      <AppHeaderConfigurator pageName="General Settings" breadcrumbs={breadcrumbs} />
      <TeamSettingsGeneral
        teamId={team.id}
        userRole={userRole}
        initialData={{ team: serializedTeam }}
      />
    </>
  );
}
